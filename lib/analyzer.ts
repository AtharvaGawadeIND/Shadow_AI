import type { Alert, DetectionResult, Employee, SaaSApp, UploadRecord } from "@/types";
import { deterministicExplanation, normalizeDomain, scoreRecord } from "./risk";
import { sanitizeText } from "./utils";

export function validateRecords(records: UploadRecord[]) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Upload contained no records.");
  }

  const required = ["employee_email", "tool_name", "domain", "oauth_permissions", "department", "signup_date"] as const;
  records.forEach((record, index) => {
    for (const key of required) {
      if (!record[key]) {
        throw new Error(`Row ${index + 1} is missing ${key}.`);
      }
    }
    if (!String(record.employee_email).includes("@")) {
      throw new Error(`Row ${index + 1} has an invalid employee email.`);
    }
    if (Number.isNaN(Date.parse(record.signup_date))) {
      throw new Error(`Row ${index + 1} has an invalid signup_date.`);
    }
  });
}

export async function analyzeRecords(records: UploadRecord[]): Promise<DetectionResult> {
  validateRecords(records);

  const appMap = new Map<string, SaaSApp>();
  const employeeMap = new Map<string, Employee>();
  const alerts: Alert[] = [];

  for (const raw of records) {
    const record: UploadRecord = {
      employee_email: sanitizeText(raw.employee_email).toLowerCase(),
      tool_name: sanitizeText(raw.tool_name),
      domain: normalizeDomain(sanitizeText(raw.domain)),
      oauth_permissions: sanitizeText(raw.oauth_permissions),
      department: sanitizeText(raw.department),
      signup_date: sanitizeText(raw.signup_date)
    };
    const scored = scoreRecord(record);
    const key = `${record.tool_name.toLowerCase()}::${record.domain}`;
    const existing = appMap.get(key);
    const explanation =
      existing?.explanation ??
      deterministicExplanation({
        toolName: record.tool_name,
        domain: record.domain,
        category: scored.category,
        permissions: scored.permissions,
        riskLevel: scored.riskLevel
      });

    if (existing) {
      existing.riskScore = Math.max(existing.riskScore, scored.riskScore);
      existing.riskLevel = existing.riskScore >= 70 ? "HIGH" : existing.riskScore >= 40 ? "MEDIUM" : "LOW";
      existing.permissions = Array.from(new Set([...existing.permissions, ...scored.permissions]));
      existing.employeesAffected = Array.from(new Set([...existing.employeesAffected, record.employee_email]));
      existing.firstDetected =
        new Date(record.signup_date) < new Date(existing.firstDetected) ? record.signup_date : existing.firstDetected;
    } else {
      appMap.set(key, {
        toolName: record.tool_name,
        domain: record.domain,
        category: scored.category,
        riskScore: scored.riskScore,
        riskLevel: scored.riskLevel,
        permissions: scored.permissions,
        employeesAffected: [record.employee_email],
        approved: scored.riskLevel === "LOW",
        explanation,
        firstDetected: record.signup_date
      });
    }

    const employee = employeeMap.get(record.employee_email) ?? {
      email: record.employee_email,
      department: record.department,
      tools: []
    };
    employee.tools = Array.from(new Set([...employee.tools, record.tool_name]));
    employeeMap.set(record.employee_email, employee);

    if (scored.riskLevel === "HIGH") {
      const message = `${record.tool_name} triggered a HIGH risk shadow SaaS alert for ${record.employee_email}.`;
      for (const channel of ["in-app", "email", "slack"] as const) {
        alerts.push({
          message,
          severity: "HIGH",
          tool: record.tool_name,
          employee: record.employee_email,
          timestamp: new Date(record.signup_date).toISOString(),
          channel
        });
      }
    }
  }

  return {
    apps: Array.from(appMap.values()).sort((a, b) => b.riskScore - a.riskScore),
    employees: Array.from(employeeMap.values()).sort((a, b) => a.email.localeCompare(b.email)),
    alerts: alerts.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
  };
}
