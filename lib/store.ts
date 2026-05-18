import { AccessRequestModel } from "@/models/AccessRequest";
import { AccessPolicyModel } from "@/models/AccessPolicy";
import { AlertModel } from "@/models/Alert";
import { DetectionEventModel } from "@/models/DetectionEvent";
import { EmployeeModel } from "@/models/Employee";
import { SaaSAppModel } from "@/models/SaaSApp";
import type { AccessEvent, AccessPolicy, AccessRequest, Alert, DetectionEvent, Employee, PolicyAction, PolicyScope, RiskLevel, SaaSApp } from "@/types";
import { randomUUID } from "crypto";
import { connectMongo, usingMongo } from "./db";
import { classifyRisk, deterministicExplanation, domainLabel, evaluateDomainAccess, normalizeDomain } from "./risk";
import { emitRealtime } from "./realtime";

type StoreState = {
  apps: SaaSApp[];
  employees: Employee[];
  alerts: Alert[];
  events: AccessEvent[];
  detections: DetectionEvent[];
  accessRequests: AccessRequest[];
  policies: AccessPolicy[];
};

type ReplaceDataInput = Omit<StoreState, "events" | "detections" | "accessRequests" | "policies"> & {
  events?: AccessEvent[];
  detections?: DetectionEvent[];
  accessRequests?: AccessRequest[];
  policies?: AccessPolicy[];
};

const memory: StoreState = {
  apps: [],
  employees: [],
  alerts: [],
  events: [],
  detections: [],
  accessRequests: [],
  policies: []
};

const plain = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));

function employeeMetrics(employee: Employee, apps: SaaSApp[]) {
  const riskOrder: RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];
  const byTool = new Map(apps.map((app) => [app.toolName, app.riskLevel]));
  const highestRisk = employee.tools.reduce<RiskLevel>((max, tool) => {
    const next = byTool.get(tool) ?? "LOW";
    return riskOrder.indexOf(next) > riskOrder.indexOf(max) ? next : max;
  }, "LOW");
  return { ...employee, highestRisk, totalAppsUsed: employee.tools.length };
}

export async function replaceData(data: ReplaceDataInput) {
  const mongo = usingMongo();
  const apps = data.apps.map((app) => ({
    ...app,
    ...(!mongo ? { _id: app._id ?? randomUUID() } : {}),
    blocked: app.blocked ?? (!app.approved && app.riskLevel === "HIGH"),
    lastDetected: app.lastDetected ?? app.firstDetected,
    usageCount: app.usageCount ?? Math.max(1, app.employeesAffected.length),
    source: app.source ?? "upload"
  }));
  const employees = data.employees.map((employee) => employeeMetrics({ ...employee, ...(!mongo ? { _id: employee._id ?? randomUUID() } : {}) }, apps));
  const alerts = data.alerts.map((alert) => ({ ...alert, ...(!mongo ? { _id: alert._id ?? randomUUID() } : {}) }));
  const policies = (data.policies ?? []).map((policy) => ({ ...policy, ...(!mongo ? { _id: policy._id ?? randomUUID() } : {}) }));

  if (mongo) {
    await connectMongo();
    await Promise.all([
      SaaSAppModel.deleteMany({}),
      EmployeeModel.deleteMany({}),
      AlertModel.deleteMany({}),
      DetectionEventModel.deleteMany({}),
      AccessRequestModel.deleteMany({}),
      AccessPolicyModel.deleteMany({})
    ]);
    await Promise.all([
      apps.length ? SaaSAppModel.insertMany(apps) : Promise.resolve(),
      employees.length ? EmployeeModel.insertMany(employees) : Promise.resolve(),
      alerts.length ? AlertModel.insertMany(alerts) : Promise.resolve(),
      data.detections?.length ? DetectionEventModel.insertMany(data.detections) : Promise.resolve(),
      data.accessRequests?.length ? AccessRequestModel.insertMany(data.accessRequests) : Promise.resolve(),
      policies.length ? AccessPolicyModel.insertMany(policies) : Promise.resolve()
    ]);
  } else {
    memory.apps = apps;
    memory.employees = employees;
    memory.alerts = alerts;
    memory.events = data.events ?? [];
    memory.detections = data.detections ?? [];
    memory.accessRequests = data.accessRequests ?? [];
    memory.policies = policies;
  }
  emitRealtime("STATS_UPDATED", await getStats());
}

export async function loadDemoData(data: ReplaceDataInput) {
  const current = await getApps();
  if (current.length > 0) return { apps: await getApps(), employees: await getEmployees(), alerts: await getAlerts(), events: await getEvents() };
  await replaceData(data);
  return { apps: await getApps(), employees: await getEmployees(), alerts: await getAlerts(), events: await getEvents() };
}

export async function getApps(): Promise<SaaSApp[]> {
  if (usingMongo()) {
    await connectMongo();
    return plain(await SaaSAppModel.find({}).sort({ riskScore: -1 }));
  }
  return memory.apps;
}

export async function getEmployees(): Promise<Employee[]> {
  if (usingMongo()) {
    await connectMongo();
    return plain(await EmployeeModel.find({}).sort({ email: 1 }));
  }
  return memory.employees;
}

export async function getAlerts(): Promise<Alert[]> {
  if (usingMongo()) {
    await connectMongo();
    return plain(await AlertModel.find({}).sort({ timestamp: -1 }));
  }
  return memory.alerts.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}

export async function getEvents(): Promise<AccessEvent[]> {
  if (usingMongo()) return getDetectionEventsAsAccessEvents();
  return memory.events.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 500);
}

export async function getDetectionEvents(): Promise<DetectionEvent[]> {
  if (usingMongo()) {
    await connectMongo();
    return plain(await DetectionEventModel.find({}).sort({ timestamp: -1 }).limit(500));
  }
  return memory.detections.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 500);
}

async function getDetectionEventsAsAccessEvents(): Promise<AccessEvent[]> {
  const detections = await getDetectionEvents();
  return detections.map((event) => ({
    employeeEmail: event.employee,
    domain: event.domain,
    url: `https://${event.domain}`,
    decision: "ALLOW",
    riskLevel: "LOW",
    riskScore: 0,
    category: "Unknown",
    timestamp: event.timestamp,
    blocked: false,
    reason: "Detection event persisted."
  }));
}

export async function addEvent(event: AccessEvent) {
  if (!usingMongo()) {
    memory.events.unshift(event);
  }
  return event;
}

export async function addDetectionEvent(event: DetectionEvent) {
  if (usingMongo()) {
    await connectMongo();
    const created = plain<DetectionEvent>(await DetectionEventModel.create(event));
    emitRealtime("NEW_DETECTION", created);
    return created;
  }
  memory.detections.unshift(event);
  emitRealtime("NEW_DETECTION", event);
  return event;
}

export async function recordAccessExposure(event: AccessEvent) {
  const toolName = domainLabel(event.domain);
  const now = event.timestamp;
  const app: SaaSApp = {
    toolName,
    domain: event.domain,
    category: event.category,
    riskScore: event.riskScore,
    riskLevel: event.riskLevel,
    permissions: ["browser.navigation"],
    employeesAffected: [event.employeeEmail],
    approved: event.decision === "ALLOW",
    blocked: event.decision === "BLOCK",
    explanation: deterministicExplanation({
      toolName,
      domain: event.domain,
      category: event.category,
      permissions: ["browser.navigation"],
      riskLevel: event.riskLevel
    }),
    firstDetected: now,
    lastDetected: now,
    usageCount: 1,
    source: "extension"
  };

  await addDetectionEvent({
    tool: toolName,
    domain: event.domain,
    permissions: ["browser.navigation"],
    employee: event.employeeEmail,
    rawPayload: event,
    timestamp: now,
    source: "extension"
  });

  if (usingMongo()) {
    await connectMongo();
    const existing = await SaaSAppModel.findOne({ domain: event.domain });
    const nextRiskScore = Math.max(existing?.riskScore ?? 0, app.riskScore);
    await Promise.all([
      SaaSAppModel.updateOne(
        { domain: event.domain },
        {
          $setOnInsert: {
            toolName: app.toolName,
            domain: app.domain,
            explanation: app.explanation,
            firstDetected: app.firstDetected,
            source: app.source
          },
          $set: {
            riskScore: nextRiskScore,
            riskLevel: classifyRisk(nextRiskScore),
            category: app.category,
            approved: existing?.approved || app.approved,
            blocked: event.decision === "BLOCK" && !existing?.approved,
            lastDetected: now
          },
          $inc: { usageCount: 1 },
          $addToSet: { permissions: "browser.navigation", employeesAffected: event.employeeEmail }
        },
        { upsert: true }
      ),
      EmployeeModel.updateOne(
        { email: event.employeeEmail },
        {
          $setOnInsert: { email: event.employeeEmail, department: "Browser Agent" },
          $set: { lastSeen: now },
          $addToSet: {
            tools: toolName,
            ...(event.blocked ? { blockedApps: toolName } : {}),
            ...(event.decision === "ALLOW" ? { approvedApps: toolName } : {})
          }
        },
        { upsert: true }
      )
    ]);
  } else {
    const existingApp = memory.apps.find((item) => normalizeDomain(item.domain) === event.domain);
    if (existingApp) {
      existingApp.riskScore = Math.max(existingApp.riskScore, event.riskScore);
      existingApp.riskLevel = classifyRisk(existingApp.riskScore);
      existingApp.category = event.category;
      existingApp.permissions = Array.from(new Set([...existingApp.permissions, "browser.navigation"]));
      existingApp.employeesAffected = Array.from(new Set([...existingApp.employeesAffected, event.employeeEmail]));
      existingApp.blocked = event.decision === "BLOCK" && !existingApp.approved;
      existingApp.lastDetected = now;
      existingApp.usageCount = (existingApp.usageCount ?? 0) + 1;
    } else {
      memory.apps.push(app);
    }

    const employee = memory.employees.find((item) => item.email === event.employeeEmail);
    if (employee) {
      employee.tools = Array.from(new Set([...employee.tools, toolName]));
      employee.lastSeen = now;
      if (event.blocked) employee.blockedApps = Array.from(new Set([...(employee.blockedApps ?? []), toolName]));
    } else {
      memory.employees.push({ email: event.employeeEmail, department: "Browser Agent", tools: [toolName], blockedApps: event.blocked ? [toolName] : [], lastSeen: now });
    }
  }

  emitRealtime(event.blocked ? "APP_BLOCKED" : "STATS_UPDATED", { domain: event.domain, employee: event.employeeEmail });
}

export async function addAlerts(alerts: Alert[]) {
  if (usingMongo()) {
    await connectMongo();
    await AlertModel.insertMany(alerts);
  } else {
    memory.alerts.unshift(...alerts);
  }
  alerts.forEach((alert) => emitRealtime("NEW_ALERT", alert));
}

export async function getApprovedDomains() {
  const apps = await getApps();
  return apps.filter((app) => app.approved && !app.blocked).map((app) => app.domain);
}

function normalizePolicy(policy: AccessPolicy): AccessPolicy {
  return {
    ...policy,
    domain: normalizeDomain(policy.domain).replace(/[^a-z0-9.-]/g, ""),
    toolName: policy.toolName.trim(),
    employeeEmail: policy.scope === "user" ? (policy.employeeEmail ?? "").trim().toLowerCase() : "",
    reason: policy.reason?.trim() ?? "",
    active: policy.active ?? true
  };
}

function matchesPolicy(policy: AccessPolicy, domain: string, employeeEmail: string) {
  const normalizedDomain = normalizeDomain(domain);
  const policyDomain = normalizeDomain(policy.domain);
  const sameDomain = normalizedDomain === policyDomain || normalizedDomain.endsWith(`.${policyDomain}`);
  const sameEmployee = (policy.employeeEmail ?? "").toLowerCase() === employeeEmail.toLowerCase();
  return policy.active && sameDomain && (policy.scope === "global" || sameEmployee);
}

function policyUpdatedPayload(policy?: AccessPolicy | null) {
  return {
    policyId: policy?._id,
    domain: policy?.domain,
    employeeEmail: policy?.employeeEmail,
    scope: policy?.scope,
    action: policy?.action,
    timestamp: new Date().toISOString()
  };
}

export async function getPolicies(): Promise<AccessPolicy[]> {
  if (usingMongo()) {
    await connectMongo();
    return plain(await AccessPolicyModel.find({}).sort({ createdAt: -1 }));
  }
  return memory.policies.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function createPolicy(input: Omit<AccessPolicy, "_id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const policy = normalizePolicy({ ...input, createdAt: now, updatedAt: now });
  if (policy.scope === "user" && !policy.employeeEmail) throw new Error("Employee email is required for user policies");

  if (usingMongo()) {
    await connectMongo();
    const created = plain<AccessPolicy>(await AccessPolicyModel.create(policy));
    emitRealtime("POLICY_UPDATED", policyUpdatedPayload(created));
    return created;
  }

  const created = { _id: randomUUID(), ...policy };
  memory.policies.unshift(created);
  emitRealtime("POLICY_UPDATED", policyUpdatedPayload(created));
  return created;
}

export async function updatePolicy(id: string, input: Partial<Pick<AccessPolicy, "domain" | "toolName" | "scope" | "employeeEmail" | "action" | "reason" | "active">>) {
  const now = new Date().toISOString();
  if (usingMongo()) {
    await connectMongo();
    const current = plain<AccessPolicy | null>(await AccessPolicyModel.findById(id));
    if (!current) return null;
    const next = normalizePolicy({ ...current, ...input, updatedAt: now });
    if (next.scope === "user" && !next.employeeEmail) throw new Error("Employee email is required for user policies");
    const updated = plain<AccessPolicy | null>(await AccessPolicyModel.findByIdAndUpdate(id, { $set: next }, { new: true }));
    emitRealtime("POLICY_UPDATED", policyUpdatedPayload(updated));
    return updated;
  }

  const index = memory.policies.findIndex((policy) => policy._id === id);
  if (index === -1) return null;
  const next = normalizePolicy({ ...memory.policies[index], ...input, updatedAt: now });
  if (next.scope === "user" && !next.employeeEmail) throw new Error("Employee email is required for user policies");
  memory.policies[index] = next;
  emitRealtime("POLICY_UPDATED", policyUpdatedPayload(next));
  return next;
}

export async function deletePolicy(id: string) {
  let deleted: AccessPolicy | null = null;
  if (usingMongo()) {
    await connectMongo();
    deleted = plain<AccessPolicy | null>(await AccessPolicyModel.findByIdAndDelete(id));
  } else {
    deleted = memory.policies.find((policy) => policy._id === id) ?? null;
    memory.policies = memory.policies.filter((policy) => policy._id !== id);
  }
  if (deleted) emitRealtime("POLICY_UPDATED", policyUpdatedPayload(deleted));
  return deleted;
}

export async function togglePolicy(id: string) {
  const policies = await getPolicies();
  const policy = policies.find((item) => item._id === id);
  if (!policy) return null;
  return updatePolicy(id, { active: !policy.active });
}

export async function evaluatePolicyAccess(input: { domain: string; employeeEmail: string }) {
  const domain = normalizeDomain(input.domain).replace(/[^a-z0-9.-]/g, "");
  const employeeEmail = input.employeeEmail.trim().toLowerCase();
  const policies = (await getPolicies()).filter((policy) => matchesPolicy(policy, domain, employeeEmail));
  const by = (scope: PolicyScope, action: PolicyAction) => policies.find((policy) => policy.scope === scope && policy.action === action);
  const userBlock = by("user", "block");
  const userAllow = by("user", "allow");
  const globalBlock = by("global", "block");
  const matched = userBlock ?? userAllow ?? globalBlock;

  if (matched) {
    const blocked = matched.action === "block";
    return {
      decision: blocked ? "BLOCK" as const : "ALLOW" as const,
      riskLevel: blocked ? "HIGH" as const : "LOW" as const,
      riskScore: blocked ? 100 : 5,
      category: "Policy",
      reason: matched.reason || (blocked ? "Access blocked by admin policy." : "Access allowed by admin policy."),
      message: blocked ? "Access blocked by admin policy" : "Access allowed by admin policy",
      policy: matched,
      source: "policy" as const
    };
  }

  return { ...evaluateDomainAccess({ domain, approvedDomains: await getApprovedDomains() }), source: "risk" as const };
}

export async function setAppApproval(domain: string, approved: boolean) {
  const normalized = normalizeDomain(domain);
  if (usingMongo()) {
    await connectMongo();
    await SaaSAppModel.updateMany({ domain: normalized }, { $set: { approved, blocked: !approved } });
  } else {
    memory.apps = memory.apps.map((app) => (normalizeDomain(app.domain) === normalized ? { ...app, approved, blocked: !approved } : app));
  }
  emitRealtime(approved ? "APP_APPROVED" : "APP_BLOCKED", { domain: normalized });
  emitRealtime("STATS_UPDATED", await getStats());
}

export async function getAccessRequests(): Promise<AccessRequest[]> {
  if (usingMongo()) {
    await connectMongo();
    return plain(await AccessRequestModel.find({}).sort({ requestedAt: -1 }));
  }
  return memory.accessRequests.sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt));
}

export async function createAccessRequest(input: Omit<AccessRequest, "requestedAt" | "status">) {
  if (usingMongo()) {
    const request: AccessRequest = { ...input, status: "PENDING", requestedAt: new Date().toISOString() };
    await connectMongo();
    const existing = await AccessRequestModel.findOne({ employee: request.employee, domain: request.domain, status: "PENDING" });
    if (existing) return plain<AccessRequest>(existing);
    const created = plain<AccessRequest>(await AccessRequestModel.create(request));
    await EmployeeModel.updateOne({ email: request.employee }, { $setOnInsert: { email: request.employee, department: "Browser Agent" }, $addToSet: { requestedApps: request.tool } }, { upsert: true });
    emitRealtime("ACCESS_REQUEST", created);
    return created;
  }
  const request: AccessRequest = { _id: randomUUID(), ...input, status: "PENDING", requestedAt: new Date().toISOString() };
  const existing = memory.accessRequests.find((item) => item.employee === request.employee && item.domain === request.domain && item.status === "PENDING");
  if (existing) return existing;
  memory.accessRequests.unshift(request);
  emitRealtime("ACCESS_REQUEST", request);
  return request;
}

export async function approveAccessRequest(id: string, approvedBy: string) {
  const approvedAt = new Date().toISOString();
  let request: AccessRequest | null = null;
  if (usingMongo()) {
    await connectMongo();
    request = plain<AccessRequest | null>(await AccessRequestModel.findByIdAndUpdate(id, { $set: { status: "APPROVED", approvedAt, approvedBy } }, { new: true }));
    if (request) {
      await Promise.all([
        SaaSAppModel.updateOne({ domain: request.domain }, { $set: { approved: true, blocked: false }, $addToSet: { employeesAffected: request.employee } }, { upsert: false }),
        EmployeeModel.updateOne({ email: request.employee }, { $addToSet: { approvedApps: request.tool, tools: request.tool }, $pull: { blockedApps: request.tool } }, { upsert: true })
      ]);
    }
  } else {
    request = memory.accessRequests.find((item) => item._id === id) ?? null;
    if (request) {
      request.status = "APPROVED";
      request.approvedAt = approvedAt;
      request.approvedBy = approvedBy;
      memory.apps = memory.apps.map((app) => (app.domain === request?.domain ? { ...app, approved: true, blocked: false } : app));
    }
  }
  if (request) {
    emitRealtime("ACCESS_APPROVED", { domain: request.domain, employee: request.employee, tool: request.tool });
    emitRealtime("APP_APPROVED", { domain: request.domain, employee: request.employee, tool: request.tool });
  }
  return request;
}

export async function rejectAccessRequest(id: string, approvedBy: string) {
  const approvedAt = new Date().toISOString();
  if (usingMongo()) {
    await connectMongo();
    return plain<AccessRequest | null>(await AccessRequestModel.findByIdAndUpdate(id, { $set: { status: "REJECTED", approvedAt, approvedBy } }, { new: true }));
  }
  const request = memory.accessRequests.find((item) => item._id === id) ?? null;
  if (request) {
    request.status = "REJECTED";
    request.approvedAt = approvedAt;
    request.approvedBy = approvedBy;
  }
  return request;
}

export async function resolveAlert(id: string) {
  if (usingMongo()) {
    await connectMongo();
    return plain<Alert | null>(await AlertModel.findByIdAndUpdate(id, { $set: { resolved: true } }, { new: true }));
  }
  const alert = memory.alerts.find((item) => item._id === id) ?? null;
  if (alert) alert.resolved = true;
  return alert;
}

export async function deleteEntity(collection: "apps" | "employees" | "alerts" | "events" | "access", id: string) {
  if (usingMongo()) {
    await connectMongo();
    const model = collection === "apps" ? SaaSAppModel : collection === "employees" ? EmployeeModel : collection === "alerts" ? AlertModel : collection === "access" ? AccessRequestModel : DetectionEventModel;
    await model.findByIdAndDelete(id);
  } else {
    if (collection === "apps") memory.apps = memory.apps.filter((item) => item._id !== id);
    if (collection === "employees") memory.employees = memory.employees.filter((item) => item._id !== id);
    if (collection === "alerts") memory.alerts = memory.alerts.filter((item) => item._id !== id);
    if (collection === "events") memory.detections = memory.detections.filter((item) => item._id !== id);
    if (collection === "access") memory.accessRequests = memory.accessRequests.filter((item) => item._id !== id);
  }
  emitRealtime("STATS_UPDATED", await getStats());
}

export async function clearAllData() {
  await replaceData({ apps: [], employees: [], alerts: [], events: [], detections: [], accessRequests: [] });
}

export async function getStats() {
  const [apps, employees, alerts, events, accessRequests] = await Promise.all([getApps(), getEmployees(), getAlerts(), getDetectionEvents(), getAccessRequests()]);
  return {
    apps: apps.length,
    employees: employees.length,
    alerts: alerts.length,
    events: events.length,
    accessRequests: accessRequests.length,
    high: apps.filter((app) => app.riskLevel === "HIGH").length,
    medium: apps.filter((app) => app.riskLevel === "MEDIUM").length,
    low: apps.filter((app) => app.riskLevel === "LOW").length,
    blocked: apps.filter((app) => app.blocked).length,
    approved: apps.filter((app) => app.approved).length
  };
}
