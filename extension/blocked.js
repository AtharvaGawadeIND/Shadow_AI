const params = new URLSearchParams(location.search);
const setText = (id, value) => {
  document.getElementById(id).textContent = value || "-";
};

const domain = params.get("domain") || "";
const originalUrl = params.get("url") || `https://${domain}`;
const tool = params.get("tool") || domain;
const employee = params.get("employee") || "";

setText("domain", domain);
setText("risk", params.get("risk"));
setText("employee", employee);
setText("reason", params.get("reason"));
const timestamp = params.get("timestamp");
setText("timestamp", timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString());

const status = document.getElementById("status");
const requestReason = document.getElementById("requestReason");
const requestButton = document.getElementById("request");

document.getElementById("back").addEventListener("click", () => history.back());

requestButton.addEventListener("click", () => {
  const reason = requestReason.value.trim();
  if (!reason) {
    status.textContent = "Enter a business reason before requesting access.";
    return;
  }
  requestButton.disabled = true;
  status.textContent = "Sending access request...";
  chrome.runtime.sendMessage(
    {
      type: "SHADOWSHIELD_REQUEST_ACCESS",
      payload: { domain, tool, reason }
    },
    (response) => {
      requestButton.disabled = false;
      status.textContent = response?.ok ? "Request sent. This page will reload when approved." : "Request failed. Check extension settings and backend status.";
    }
  );
});

setInterval(() => {
  chrome.runtime.sendMessage(
    {
      type: "SHADOWSHIELD_CHECK_UNBLOCK",
      payload: { domain, url: originalUrl }
    },
    (response) => {
      if (response?.body?.decision === "ALLOW") {
        location.href = originalUrl;
      }
    }
  );
}, 2000);
