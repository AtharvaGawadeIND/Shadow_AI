import type { AccessDecision, RiskLevel, UploadRecord } from "@/types";

const trustedDomains = new Set([
  "google.com",
  "microsoft.com",
  "github.com",
  "slack.com",
  "zoom.us",
  "openai.com",
  "canva.com",
  "figma.com",
  "notion.so"
]);

const knownSaaS = new Set([
  "chatgpt",
  "claude",
  "canva",
  "dropbox",
  "slack",
  "github",
  "figma",
  "notion",
  "perplexity",
  "zapier",
  "airtable",
  "google workspace",
  "microsoft 365",
  "zoom"
]);

const permissionModifiers: Record<string, number> = {
  profile: 5,
  basic: 10,
  "drive.read": 35,
  "drive.write": 50,
  "mail.read": 45,
  "contacts.read": 30,
  "calendar.read": 20
};

const categoryModifiers: Record<string, number> = {
  AI: 20,
  "File Sharing": 15,
  Communication: 5,
  "Developer Tools": 5,
  Unknown: 25
};

const categoryMap: Record<string, string> = {
  chatgpt: "AI",
  claude: "AI",
  perplexity: "AI",
  unknownpdfai: "AI",
  mysteryocr: "AI",
  canva: "Design",
  dropbox: "File Sharing",
  slack: "Communication",
  github: "Developer Tools",
  figma: "Design",
  notion: "Productivity",
  zapier: "Automation",
  airtable: "Productivity",
  zoom: "Communication"
};

const warnedDomains = new Set(["perplexity.ai", "claude.ai", "zapier.com"]);
const blockedDomains = new Set(["unknownpdf.ai", "mysteryocr.io", "darkgpt.ai", "hack-ai.xyz"]);
const aiSignals = ["ai", "gpt", "ocr", "pdf", "llm", "chatbot"];

export function normalizeDomain(domain: string) {
  return domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

export function isTrustedDomain(domain: string) {
  const normalized = normalizeDomain(domain);
  return Array.from(trustedDomains).some((trusted) => normalized === trusted || normalized.endsWith(`.${trusted}`));
}

export function isSameOrSubdomain(domain: string, parent: string) {
  const normalized = normalizeDomain(domain);
  const normalizedParent = normalizeDomain(parent);
  return normalized === normalizedParent || normalized.endsWith(`.${normalizedParent}`);
}

export function domainLabel(domain: string) {
  const normalized = normalizeDomain(domain);
  const [name] = normalized.split(".");
  return name.replace(/[^a-z0-9]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || normalized;
}

export function evaluateDomainAccess(input: { domain: string; approvedDomains?: string[] }) {
  const domain = normalizeDomain(input.domain);
  const approvedDomains = input.approvedDomains ?? [];
  const approved = approvedDomains.some((approvedDomain) => isSameOrSubdomain(domain, approvedDomain));
  const trusted = isTrustedDomain(domain);
  const warned = Array.from(warnedDomains).some((warnDomain) => isSameOrSubdomain(domain, warnDomain));
  const explicitlyBlocked = Array.from(blockedDomains).some((blockDomain) => isSameOrSubdomain(domain, blockDomain));
  const suspiciousAi = aiSignals.some((signal) => domain.includes(signal)) && !trusted && !approved;

  let decision: AccessDecision = "ALLOW";
  let riskScore = 25;
  let category = "Known SaaS";
  let reason = "Domain is approved or trusted by ShadowShield policy.";

  if (approved || trusted) {
    decision = "ALLOW";
    riskScore = 18;
    category = categorizeTool(domainLabel(domain));
  } else if (warned) {
    decision = "WARN";
    riskScore = domain.includes("zapier") ? 58 : 64;
    category = categorizeTool(domainLabel(domain));
    reason = "This SaaS app is not approved and should be reviewed before sharing company data.";
  } else if (explicitlyBlocked || suspiciousAi) {
    decision = "BLOCK";
    riskScore = explicitlyBlocked ? 92 : 86;
    category = "AI";
    reason = "Unknown AI SaaS requesting dangerous permissions or operating outside approved policy.";
  } else {
    decision = "BLOCK";
    riskScore = 82;
    category = "Unknown";
    reason = "Unapproved SaaS domain detected outside the trusted vendor list.";
  }

  const riskLevel = classifyRisk(riskScore);
  return {
    decision,
    riskLevel,
    riskScore,
    category,
    reason,
    message: decision === "BLOCK" ? "Access blocked by ShadowShield" : decision === "WARN" ? "ShadowShield warning issued" : "Access allowed by ShadowShield"
  };
}

export function categorizeTool(toolName: string) {
  return categoryMap[toolName.toLowerCase().replace(/\s+/g, "")] ?? "Unknown";
}

export function parsePermissions(raw: string | string[]) {
  if (Array.isArray(raw)) return raw.map((item) => item.trim()).filter(Boolean);
  return raw
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function classifyRisk(score: number): RiskLevel {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export function scoreRecord(record: UploadRecord) {
  const domain = normalizeDomain(record.domain);
  const category = categorizeTool(record.tool_name);
  const permissions = parsePermissions(record.oauth_permissions);
  const known = knownSaaS.has(record.tool_name.toLowerCase());
  let score = isTrustedDomain(domain) ? 20 : known ? 40 : 70;

  for (const permission of permissions) {
    score += permissionModifiers[permission] ?? 0;
  }

  score += categoryModifiers[category] ?? 0;
  score = Math.min(score, 100);

  return {
    category,
    permissions,
    riskScore: score,
    riskLevel: classifyRisk(score)
  };
}

export function deterministicExplanation(input: {
  toolName: string;
  domain: string;
  category: string;
  permissions: string[];
  riskLevel: RiskLevel;
}) {
  const sensitive = input.permissions.filter((permission) =>
    ["drive.read", "drive.write", "mail.read", "contacts.read", "calendar.read"].includes(permission)
  );
  const exposure =
    sensitive.length > 0
      ? `It requests ${sensitive.join(", ")} access, which may expose documents, mail, contacts, or calendar data.`
      : "It requests limited OAuth access, but still creates an unmanaged vendor relationship.";
  const verification =
    input.category === "Unknown" || !isTrustedDomain(input.domain)
      ? "The domain is not on the trusted vendor list and should be validated before wider use."
      : "The vendor is recognizable, but approval and permission scope should still be reviewed.";

  return `${input.toolName} is classified as ${input.riskLevel} because it is a ${input.category} tool connected from ${normalizeDomain(
    input.domain
  )}. ${exposure} ${verification} Recommendation: review business need, restrict OAuth scopes, and either approve the app or revoke access.`;
}
