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
  const response = await fetch(`${config.apiBaseUrl}/api/check-domain`, {
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

chrome.webNavigation.onCommitted.addListener((details) => {
  checkDomain(details).catch((error) => console.warn("ShadowShield check failed", error));
});
