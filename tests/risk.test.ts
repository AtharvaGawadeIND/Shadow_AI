import { describe, expect, it } from "vitest";
import { categorizeTool, classifyRisk, evaluateDomainAccess, scoreRecord } from "@/lib/risk";

describe("risk engine", () => {
  it("classifies trusted low-scope tools as low risk", () => {
    const result = scoreRecord({
      employee_email: "dev@company.com",
      tool_name: "GitHub",
      domain: "github.com",
      oauth_permissions: "profile",
      department: "Engineering",
      signup_date: "2026-05-10"
    });

    expect(result.riskScore).toBe(30);
    expect(result.riskLevel).toBe("LOW");
  });

  it("adds permission and category modifiers for unknown AI tools", () => {
    const result = scoreRecord({
      employee_email: "finance@company.com",
      tool_name: "UnknownPDFAI",
      domain: "unknownpdf.ai",
      oauth_permissions: "drive.read",
      department: "Finance",
      signup_date: "2026-05-12"
    });

    expect(result.category).toBe("AI");
    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe("HIGH");
  });

  it("categorizes unknown names and score bands deterministically", () => {
    expect(categorizeTool("RandomTool")).toBe("Unknown");
    expect(classifyRisk(39)).toBe("LOW");
    expect(classifyRisk(40)).toBe("MEDIUM");
    expect(classifyRisk(70)).toBe("HIGH");
  });

  it("decides allow, warn, and block for real-time domain checks", () => {
    expect(evaluateDomainAccess({ domain: "github.com" }).decision).toBe("ALLOW");
    expect(evaluateDomainAccess({ domain: "claude.ai" }).decision).toBe("WARN");
    expect(evaluateDomainAccess({ domain: "unknownpdf.ai" }).decision).toBe("BLOCK");
  });

  it("allows approved domains even when they are not trusted vendors", () => {
    const result = evaluateDomainAccess({ domain: "mysteryocr.io", approvedDomains: ["mysteryocr.io"] });
    expect(result.decision).toBe("ALLOW");
    expect(result.riskLevel).toBe("LOW");
  });
});
