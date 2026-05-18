import { AlertModel } from "@/models/Alert";
import { AccessEventModel } from "@/models/AccessEvent";
import { EmployeeModel } from "@/models/Employee";
import { SaaSAppModel } from "@/models/SaaSApp";
import type { AccessEvent, Alert, Employee, SaaSApp } from "@/types";
import { connectMongo, usingMongo } from "./db";
import { classifyRisk, deterministicExplanation, domainLabel, normalizeDomain } from "./risk";

type StoreState = {
  apps: SaaSApp[];
  employees: Employee[];
  alerts: Alert[];
  events: AccessEvent[];
};

type ReplaceDataInput = Omit<StoreState, "events"> & { events?: AccessEvent[] };

const memory: StoreState = {
  apps: [],
  employees: [],
  alerts: [],
  events: []
};

const plain = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));

export async function replaceData(data: ReplaceDataInput) {
  if (usingMongo()) {
    await connectMongo();
    await Promise.all([SaaSAppModel.deleteMany({}), EmployeeModel.deleteMany({}), AlertModel.deleteMany({}), AccessEventModel.deleteMany({})]);
    await Promise.all([
      SaaSAppModel.insertMany(data.apps),
      EmployeeModel.insertMany(data.employees),
      AlertModel.insertMany(data.alerts)
    ]);
    return;
  }
  memory.apps = data.apps;
  memory.employees = data.employees;
  memory.alerts = data.alerts;
  memory.events = data.events ?? [];
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
  if (usingMongo()) {
    await connectMongo();
    return plain(await AccessEventModel.find({}).sort({ timestamp: -1 }).limit(500));
  }
  return memory.events.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 500);
}

export async function addEvent(event: AccessEvent) {
  if (usingMongo()) {
    await connectMongo();
    return plain<AccessEvent>(await AccessEventModel.create(event));
  }
  memory.events.unshift(event);
  return event;
}

export async function recordAccessExposure(event: AccessEvent) {
  const toolName = domainLabel(event.domain);
  const app: SaaSApp = {
    toolName,
    domain: event.domain,
    category: event.category,
    riskScore: event.riskScore,
    riskLevel: event.riskLevel,
    permissions: ["browser.navigation"],
    employeesAffected: [event.employeeEmail],
    approved: event.decision === "ALLOW",
    explanation: deterministicExplanation({
      toolName,
      domain: event.domain,
      category: event.category,
      permissions: ["browser.navigation"],
      riskLevel: event.riskLevel
    }),
    firstDetected: event.timestamp
  };

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
            approved: app.approved,
            explanation: app.explanation,
            firstDetected: app.firstDetected
          },
          $set: { riskScore: nextRiskScore, riskLevel: classifyRisk(nextRiskScore), category: app.category },
          $addToSet: { permissions: "browser.navigation", employeesAffected: event.employeeEmail }
        },
        { upsert: true }
      ),
      EmployeeModel.updateOne(
        { email: event.employeeEmail },
        {
          $setOnInsert: { email: event.employeeEmail, department: "Browser Agent" },
          $addToSet: { tools: toolName }
        },
        { upsert: true }
      )
    ]);
    return;
  }

  const existingApp = memory.apps.find((item) => normalizeDomain(item.domain) === event.domain);
  if (existingApp) {
    existingApp.riskScore = Math.max(existingApp.riskScore, event.riskScore);
    existingApp.riskLevel = classifyRisk(existingApp.riskScore);
    existingApp.category = event.category;
    existingApp.permissions = Array.from(new Set([...existingApp.permissions, "browser.navigation"]));
    existingApp.employeesAffected = Array.from(new Set([...existingApp.employeesAffected, event.employeeEmail]));
    existingApp.firstDetected = new Date(event.timestamp) < new Date(existingApp.firstDetected) ? event.timestamp : existingApp.firstDetected;
  } else {
    memory.apps.push(app);
  }

  const employee = memory.employees.find((item) => item.email === event.employeeEmail);
  if (employee) {
    employee.tools = Array.from(new Set([...employee.tools, toolName]));
  } else {
    memory.employees.push({ email: event.employeeEmail, department: "Browser Agent", tools: [toolName] });
  }
}

export async function addAlerts(alerts: Alert[]) {
  if (usingMongo()) {
    await connectMongo();
    await AlertModel.insertMany(alerts);
    return;
  }
  memory.alerts.unshift(...alerts);
}

export async function getApprovedDomains() {
  const apps = await getApps();
  return apps.filter((app) => app.approved).map((app) => app.domain);
}

export async function setAppApproval(domain: string, approved: boolean) {
  const normalized = normalizeDomain(domain);
  if (usingMongo()) {
    await connectMongo();
    await SaaSAppModel.updateMany({ domain: normalized }, { $set: { approved } });
    return;
  }
  memory.apps = memory.apps.map((app) => (normalizeDomain(app.domain) === normalized ? { ...app, approved } : app));
}
