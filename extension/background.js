importScripts("shared.js");

const DEFAULT_API_BASE = "http://localhost:3000";

async function getConfig() {
  const config = await chrome.storage.local.get(["employeeEmail", "apiBaseUrl"]);
  return {
    employeeEmail: config.employeeEmail || "rahul@company.com",
    apiBaseUrl: (config.apiBaseUrl || DEFAULT_API_BASE).replace(/\/$/, "")
  };
}

function blockedUrl(payload) {
  const params = new URLSearchParams({
    domain: payload.domain,
    url: payload.url,
    tool: payload.tool || payload.domain,
    risk: String(payload.riskScore),
    reason: payload.reason,
    employee: payload.employeeEmail,
    timestamp: new Date().toISOString()
  });
  return chrome.runtime.getURL(`blocked.html?${params.toString()}`);
}

function policyCheckUrl(config, payload) {
  const params = new URLSearchParams({
    domain: payload.domain,
    employee: config.employeeEmail,
    url: payload.url || `https://${payload.domain}`
  });
  return `${config.apiBaseUrl}/api/policy/check?${params.toString()}`;
}

async function fetchPolicyDecision(config, payload) {
  const response = await fetch(policyCheckUrl(config, payload));
  if (!response.ok) return null;
  return response.json();
}

async function warnTab(tabId, payload) {
  await chrome.tabs.sendMessage(tabId, { type: "SHADOWSHIELD_WARN", payload }).catch(async () => {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tabId, { type: "SHADOWSHIELD_WARN", payload });
  });
}

async function checkDomain(details) {
  if (details.frameId !== 0) return;
  const navigation = self.ShadowShieldShared.extractNavigation(details.url);
  if (!navigation) return;

  const config = await getConfig();
  const decision = await fetchPolicyDecision(config, navigation);
  if (!decision) return;
  const payload = {
    ...decision,
    domain: navigation.domain,
    url: navigation.url,
    employeeEmail: config.employeeEmail,
    tabId: details.tabId,
    timestamp: navigation.timestamp
  };

  if (decision.decision === "BLOCK") {
    await chrome.tabs.update(details.tabId, { url: blockedUrl(payload) });
    return;
  }

  if (decision.decision === "WARN") {
    await warnTab(details.tabId, payload);
  }
}

function blockedPageNavigation(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "chrome-extension:" || !parsed.pathname.endsWith("/blocked.html")) return null;
  const domain = parsed.searchParams.get("domain");
  const originalUrl = parsed.searchParams.get("url") || (domain ? `https://${domain}` : "");
  if (!domain) return null;
  return { domain, url: originalUrl, timestamp: new Date().toISOString(), blockedPage: true };
}

async function recheckTab(tab) {
  if (!tab.id || !tab.url) return;
  const navigation = self.ShadowShieldShared.extractNavigation(tab.url) || blockedPageNavigation(tab.url);
  if (!navigation) return;

  const config = await getConfig();
  const decision = await fetchPolicyDecision(config, navigation);
  if (!decision) return;

  const payload = {
    ...decision,
    domain: navigation.domain,
    url: navigation.url,
    employeeEmail: config.employeeEmail,
    tabId: tab.id,
    timestamp: navigation.timestamp
  };

  if (decision.decision === "BLOCK" && !navigation.blockedPage) {
    await chrome.tabs.update(tab.id, { url: blockedUrl(payload) });
    return;
  }

  if (decision.decision === "ALLOW" && navigation.blockedPage) {
    await chrome.tabs.update(tab.id, { url: navigation.url });
  }
}

async function recheckAllTabs() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => recheckTab(tab).catch((error) => console.warn("ShadowShield policy recheck failed", error))));
}

let policySocket;
let reconnectTimer;

function socketUrl(apiBaseUrl) {
  const parsed = new URL(apiBaseUrl);
  parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  parsed.pathname = "/socket.io/";
  parsed.search = "EIO=4&transport=websocket";
  return parsed.toString();
}

async function connectPolicySocket() {
  const config = await getConfig();
  if (policySocket) policySocket.close();
  clearTimeout(reconnectTimer);

  policySocket = new WebSocket(socketUrl(config.apiBaseUrl));
  policySocket.addEventListener("open", () => policySocket.send("40"));
  policySocket.addEventListener("message", (event) => {
    const data = String(event.data);
    if (data === "2") {
      policySocket.send("3");
      return;
    }
    if (data.startsWith("42")) {
      let payload;
      try {
        payload = JSON.parse(data.slice(2));
      } catch {
        return;
      }
      if (payload?.[0] === "POLICY_UPDATED") {
        recheckAllTabs().catch((error) => console.warn("ShadowShield policy update failed", error));
      }
    }
  });
  policySocket.addEventListener("close", () => {
    reconnectTimer = setTimeout(() => connectPolicySocket().catch(() => undefined), 5000);
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const config = await chrome.storage.local.get(["employeeEmail", "apiBaseUrl"]);
  await chrome.storage.local.set({
    employeeEmail: config.employeeEmail || "rahul@company.com",
    apiBaseUrl: config.apiBaseUrl || DEFAULT_API_BASE
  });
  connectPolicySocket().catch(() => undefined);
});

chrome.runtime.onStartup.addListener(() => {
  connectPolicySocket().catch(() => undefined);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.apiBaseUrl || changes.employeeEmail)) {
    connectPolicySocket().catch(() => undefined);
    recheckAllTabs().catch(() => undefined);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "SHADOWSHIELD_REQUEST_ACCESS") {
    getConfig()
      .then((config) =>
        fetch(`${config.apiBaseUrl}/api/access/request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee: config.employeeEmail,
            tool: message.payload.tool,
            domain: message.payload.domain,
            reason: message.payload.reason
          })
        })
      )
      .then(async (response) => sendResponse({ ok: response.ok, body: await response.json().catch(() => ({})) }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "SHADOWSHIELD_CHECK_UNBLOCK") {
    getConfig()
      .then((config) => fetch(policyCheckUrl(config, message.payload)))
      .then(async (response) => sendResponse({ ok: response.ok, body: await response.json().catch(() => ({})) }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  checkDomain(details).catch((error) => console.warn("ShadowShield check failed", error));
});

connectPolicySocket().catch(() => undefined);
