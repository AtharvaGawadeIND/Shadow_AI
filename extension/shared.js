(function (root) {
  const ignoredProtocols = ["chrome:", "about:", "file:", "chrome-extension:", "edge:", "brave:"];

  function extractNavigation(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }

    if (ignoredProtocols.includes(parsed.protocol)) return null;
    const domain = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!domain || domain === "localhost" || domain.endsWith(".localhost") || domain === "127.0.0.1" || domain === "::1") {
      return null;
    }

    return {
      domain,
      url: parsed.href,
      timestamp: new Date().toISOString()
    };
  }

  root.ShadowShieldShared = { extractNavigation };
  if (typeof module !== "undefined") {
    module.exports = { extractNavigation };
  }
})(typeof self !== "undefined" ? self : globalThis);
