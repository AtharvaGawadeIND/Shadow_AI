export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AppStatus = "approved" | "unapproved";
export type AlertChannel = "in-app" | "email" | "slack";
export type AccessDecision = "ALLOW" | "WARN" | "BLOCK";
export type PolicyScope = "global" | "user";
export type PolicyAction = "block" | "allow";

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
  blocked?: boolean;
  explanation: string;
  firstDetected: string;
  lastDetected?: string;
  usageCount?: number;
  source?: string;
  updatedAt?: string;
}

export interface Employee {
  _id?: string;
  email: string;
  name?: string;
  department: string;
  requestedApps?: string[];
  approvedApps?: string[];
  blockedApps?: string[];
  tools: string[];
  highestRisk?: RiskLevel;
  totalAppsUsed?: number;
  lastSeen?: string;
}

export interface Alert {
  _id?: string;
  message: string;
  severity: RiskLevel;
  tool: string;
  employee: string;
  timestamp: string;
  channel: AlertChannel;
  resolved?: boolean;
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

export interface DetectionEvent {
  _id?: string;
  tool: string;
  domain: string;
  permissions: string[];
  employee: string;
  rawPayload: unknown;
  timestamp: string;
  source: string;
}

export interface AccessRequest {
  _id?: string;
  employee: string;
  tool: string;
  domain: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface AccessPolicy {
  _id?: string;
  domain: string;
  toolName: string;
  scope: PolicyScope;
  employeeEmail?: string;
  action: PolicyAction;
  reason: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  active: boolean;
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
