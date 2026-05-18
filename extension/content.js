function removeExistingBanner() {
  document.getElementById("shadowshield-warning-banner")?.remove();
  document.getElementById("shadowshield-warning-style")?.remove();
}

function showWarning(payload) {
  removeExistingBanner();

  const banner = document.createElement("div");
  banner.id = "shadowshield-warning-banner";
  const mark = document.createElement("div");
  mark.className = "shadowshield-warning__mark";
  mark.textContent = "SS";
  const body = document.createElement("div");
  body.className = "shadowshield-warning__body";
  const title = document.createElement("strong");
  title.textContent = "ShadowShield Warning: This SaaS app is not approved.";
  const details = document.createElement("span");
  details.textContent = `Risk ${payload.riskScore} - ${payload.category} - ${payload.reason}`;
  const button = document.createElement("button");
  button.type = "button";
  button.id = "shadowshield-warning-continue";
  button.textContent = "Continue";
  body.append(title, details);
  banner.append(mark, body, button);

  const style = document.createElement("style");
  style.id = "shadowshield-warning-style";
  style.textContent = `
    #shadowshield-warning-banner {
      position: fixed;
      z-index: 2147483647;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      width: min(760px, calc(100vw - 32px));
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      border: 1px solid rgba(251, 191, 36, .45);
      border-radius: 8px;
      background: #0f172a;
      color: #f8fafc;
      box-shadow: 0 24px 70px rgba(0, 0, 0, .38);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .shadowshield-warning__mark {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 6px;
      background: #fbbf24;
      color: #0f172a;
      font-weight: 900;
      flex: 0 0 auto;
    }
    .shadowshield-warning__body {
      display: grid;
      gap: 3px;
      min-width: 0;
      flex: 1;
      font-size: 14px;
      line-height: 1.35;
    }
    .shadowshield-warning__body span {
      color: #cbd5e1;
      overflow-wrap: anywhere;
    }
    #shadowshield-warning-continue {
      height: 36px;
      border: 0;
      border-radius: 6px;
      padding: 0 14px;
      background: #22d3ee;
      color: #0f172a;
      font-weight: 800;
      cursor: pointer;
    }
  `;

  document.documentElement.appendChild(style);
  document.documentElement.appendChild(banner);
  button.addEventListener("click", removeExistingBanner);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "SHADOWSHIELD_WARN") {
    showWarning(message.payload);
  }
});
