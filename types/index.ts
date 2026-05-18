export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AppStatus = "approved" | "unapproved";
export type AlertChannel = "in-app" | "email" | "slack";
export type AccessDecision = "ALLOW" | "WARN" | "BLOCK";

export interface UploadRecord {
  employee_email: string;
  tool_name: string;
  domain: string;
  oauth_permissions: string;
  department: string;
  signup_date: string;
}

export interface SaaSApp {
  _id?: string;
  toolName: string;
  domain: string;
  category: string;
  riskScore: number;
  riskLevel: RiskLevel;
  permissions: string[];
  employeesAffected: string[];
  approved: boolean;
  explanation: string;
  firstDetected: string;
  updatedAt?: string;
}

export interface Employee {
  _id?: string;
  email: string;
  department: string;
  tools: string[];
}

export interface Alert {
  _id?: string;
  message: string;
  severity: RiskLevel;
  tool: string;
  employee: string;
  timestamp: string;
  channel: AlertChannel;
}

export interface AccessEvent {
  _id?: string;
  employeeEmail: string;
  domain: string;
  url: string;
  decision: AccessDecision;
  riskLevel: RiskLevel;
  riskScore: number;
  category: string;
  timestamp: string;
  blocked: boolean;
  reason: string;
}

export interface DetectionResult {
  apps: SaaSApp[];
  employees: Employee[];
  alerts: Alert[];
}

export interface Admin {
  email: string;
  password: string;
  role: "admin";
}
