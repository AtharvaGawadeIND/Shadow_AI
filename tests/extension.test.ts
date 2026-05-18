import { createRequire } from "module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { extractNavigation } = require("../extension/shared.js") as {
  extractNavigation: (url: string) => { domain: string; url: string; timestamp: string } | null;
};

describe("extension navigation detection", () => {
  it("extracts normalized web navigation details", () => {
    const result = extractNavigation("https://www.unknownpdf.ai/path?q=1");
    expect(result?.domain).toBe("unknownpdf.ai");
    expect(result?.url).toBe("https://www.unknownpdf.ai/path?q=1");
    expect(result?.timestamp).toMatch(/T/);
  });

  it("ignores browser, local, file, and extension URLs", () => {
    expect(extractNavigation("chrome://extensions")).toBeNull();
    expect(extractNavigation("about:blank")).toBeNull();
    expect(extractNavigation("file:///tmp/report.html")).toBeNull();
    expect(extractNavigation("chrome-extension://abc/blocked.html")).toBeNull();
    expect(extractNavigation("http://localhost:3000")).toBeNull();
  });

  it("extracts every required fixture navigation for API submission", () => {
    const domains = [
      "unknownpdf.ai",
      "mysteryocr.io",
      "darkgpt.ai",
      "hack-ai.xyz",
      "claude.ai",
      "perplexity.ai",
      "github.com",
      "openai.com",
      "slack.com"
    ];

    for (const domain of domains) {
      expect(extractNavigation(`https://${domain}/app`)?.domain).toBe(domain);
    }
  });
});
