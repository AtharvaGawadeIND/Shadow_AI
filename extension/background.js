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
  const response = await fetch(`${config.apiBaseUrl}/api/extension/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain: navigation.domain,
      url: navigation.url,
      employeeEmail: config.employeeEmail
    })
  });

  if (!response.ok) return;
  const decision = await response.json();
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

chrome.runtime.onInstalled.addListener(async () => {
  const config = await chrome.storage.local.get(["employeeEmail", "apiBaseUrl"]);
  await chrome.storage.local.set({
    employeeEmail: config.employeeEmail || "rahul@company.com",
    apiBaseUrl: config.apiBaseUrl || DEFAULT_API_BASE
  });
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
      .then((config) =>
        fetch(`${config.apiBaseUrl}/api/extension/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: message.payload.domain,
            url: message.payload.url || `https://${message.payload.domain}`,
            employeeEmail: config.employeeEmail
          })
        })
      )
      .then(async (response) => sendResponse({ ok: response.ok, body: await response.json().catch(() => ({})) }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  checkDomain(details).catch((error) => console.warn("ShadowShield check failed", error));
});
