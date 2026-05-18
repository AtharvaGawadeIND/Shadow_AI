import { describe, expect, it } from "vitest";
import { analyzeRecords } from "@/lib/analyzer";
import { demoRecords } from "@/data/demo";
import { POST as checkDomain } from "@/app/api/check-domain/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as analyze } from "@/app/api/analyze/route";
import { POST as upload } from "@/app/api/upload/route";
import { POST as loadDemo } from "@/app/api/demo/load/route";
import { GET as getAppsRoute } from "@/app/api/apps/route";
import { PATCH as patchAppRoute } from "@/app/api/apps/[id]/route";
import { POST as requestAccess } from "@/app/api/access/request/route";
import { PATCH as approveAccess } from "@/app/api/access/[id]/approve/route";
import { GET as getEmployeesRoute } from "@/app/api/employees/route";
import { GET as getAlertsRoute } from "@/app/api/alerts/route";
import { GET as getEventsRoute } from "@/app/api/events/route";
import { getAlerts, getApps, getEmployees, getEvents } from "@/lib/store";
import { NextRequest } from "next/server";

function nextRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

async function loginCookie(ip = "203.0.113.10") {
  const response = await login(nextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ email: "admin@shadowshield.ai", password: "admin123" })
  }));
  const cookie = response.headers.get("set-cookie") ?? "";
  expect(response.status).toBe(200);
  return cookie.split(";")[0];
}

function authedRequest(path: string, cookie: string, init?: RequestInit) {
  return nextRequest(`http://localhost:3000${path}`, {
    ...init,
    headers: {
      cookie,
      ...(init?.headers ?? {})
    }
  });
}

describe("analysis API core behavior", () => {
  it("aggregates apps, employees, and alerts from demo data", async () => {
    const result = await analyzeRecords(demoRecords);
    expect(result.apps.length).toBeGreaterThanOrEqual(13);
    expect(result.employees.length).toBe(10);
    expect(result.alerts.length).toBeGreaterThan(0);
    expect(result.alerts.every((alert) => alert.severity === "HIGH")).toBe(true);
  });

  it("rejects malformed records with friendly errors", async () => {
    await expect(
      analyzeRecords([
        {
          employee_email: "bad",
          tool_name: "Tool",
          domain: "tool.ai",
          oauth_permissions: "profile",
          department: "IT",
          signup_date: "2026-05-10"
        }
      ])
    ).rejects.toThrow("invalid employee email");
  });
});

describe("check-domain API", () => {
  it("blocks suspicious AI SaaS and records an access event plus simulated alerts", async () => {
    const request = nextRequest("http://localhost:3000/api/check-domain", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.1" },
      body: JSON.stringify({
        domain: "unknownpdf.ai",
        url: "https://unknownpdf.ai",
        employeeEmail: "rahul@company.com"
      })
    });

    const response = await checkDomain(request);
    const body = await response.json();
    const events = await getEvents();
    const alerts = await getAlerts();

    expect(response.status).toBe(200);
    expect(body.decision).toBe("BLOCK");
    expect(body.riskLevel).toBe("HIGH");
    expect(events[0].domain).toBe("unknownpdf.ai");
    expect(events[0].blocked).toBe(true);
    expect(alerts.filter((alert) => alert.tool === "unknownpdf.ai")).toHaveLength(3);
  });

  it("rejects invalid check-domain payloads", async () => {
    const request = nextRequest("http://localhost:3000/api/check-domain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain: "bad", url: "not-a-url", employeeEmail: "bad" })
    });

    const response = await checkDomain(request);
    expect(response.status).toBe(400);
  });

  it("matches expected extension decisions for fixture domains", async () => {
    const expected = new Map([
      ["unknownpdf.ai", "BLOCK"],
      ["mysteryocr.io", "BLOCK"],
      ["darkgpt.ai", "BLOCK"],
      ["hack-ai.xyz", "BLOCK"],
      ["claude.ai", "WARN"],
      ["perplexity.ai", "WARN"],
      ["github.com", "ALLOW"],
      ["openai.com", "ALLOW"],
      ["slack.com", "ALLOW"]
    ]);

    for (const [domain, decision] of expected) {
      const response = await checkDomain(nextRequest("http://localhost:3000/api/check-domain", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `fixture-${domain}` },
        body: JSON.stringify({
          domain,
          url: `https://${domain}`,
          employeeEmail: `qa-${domain.replace(/[^a-z]/g, "")}@company.com`
        })
      }));
      const body = await response.json();
      expect(body.decision).toBe(decision);
    }
  });

  it("rejects spoofed or unsafe extension payloads", async () => {
    const unsafe = [
      { domain: "javascript:alert(1)", url: "javascript:alert(1)", employeeEmail: "rahul@company.com" },
      { domain: "chrome://settings", url: "chrome://settings", employeeEmail: "rahul@company.com" },
      { domain: "file:///etc/passwd", url: "file:///etc/passwd", employeeEmail: "rahul@company.com" },
      { domain: "github.com", url: "https://evil.example", employeeEmail: "rahul@company.com" },
      { domain: "<script>alert(1)</script>.ai", url: "https://script.ai", employeeEmail: "bad" }
    ];

    for (const payload of unsafe) {
      const response = await checkDomain(nextRequest("http://localhost:3000/api/check-domain", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `unsafe-${payload.domain}` },
        body: JSON.stringify(payload)
      }));
      expect(response.status).toBe(400);
    }
  });

  it("updates inventory and employee exposure from browser events", async () => {
    await checkDomain(nextRequest("http://localhost:3000/api/check-domain", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.22" },
      body: JSON.stringify({ domain: "claude.ai", url: "https://claude.ai", employeeEmail: "rahul@company.com" })
    }));

    const employees = await getEmployees();
    const apps = await getApps();
    const rahul = employees.find((employee) => employee.email === "rahul@company.com");
    expect(rahul?.tools).toContain("Claude");
    expect(apps.some((app) => app.domain === "claude.ai" && app.employeesAffected.includes("rahul@company.com"))).toBe(true);
  });

  it("allows a previously blocked domain after admin approval and blocks again after revoke", async () => {
    const cookie = await loginCookie("203.0.113.77");
    const email = "approval@company.com";

    let response = await checkDomain(nextRequest("http://localhost:3000/api/check-domain", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.77" },
      body: JSON.stringify({ domain: "hack-ai.xyz", url: "https://hack-ai.xyz", employeeEmail: email })
    }));
    expect((await response.json()).decision).toBe("BLOCK");

    response = await patchAppRoute(authedRequest("/api/apps/hack-ai.xyz", cookie, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approved: true })
    }), { params: Promise.resolve({ domain: "hack-ai.xyz" }) });
    expect(response.status).toBe(200);

    response = await checkDomain(nextRequest("http://localhost:3000/api/check-domain", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.78" },
      body: JSON.stringify({ domain: "hack-ai.xyz", url: "https://hack-ai.xyz", employeeEmail: email })
    }));
    expect((await response.json()).decision).toBe("ALLOW");

    await patchAppRoute(authedRequest("/api/apps/hack-ai.xyz", cookie, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approved: false })
    }), { params: Promise.resolve({ domain: "hack-ai.xyz" }) });

    response = await checkDomain(nextRequest("http://localhost:3000/api/check-domain", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.79" },
      body: JSON.stringify({ domain: "hack-ai.xyz", url: "https://hack-ai.xyz", employeeEmail: email })
    }));
    expect((await response.json()).decision).toBe("BLOCK");
  });

  it("stores employee access requests and approval instantly unblocks the domain", async () => {
    const cookie = await loginCookie("203.0.113.88");
    const email = "requester@company.com";

    const blocked = await checkDomain(nextRequest("http://localhost:3000/api/extension/report", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.88" },
      body: JSON.stringify({ domain: "unknownpdf.ai", url: "https://unknownpdf.ai", employeeEmail: email })
    }));
    expect((await blocked.json()).decision).toBe("BLOCK");

    const requestResponse = await requestAccess(nextRequest("http://localhost:3000/api/access/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ employee: email, tool: "UnknownPDFAI", domain: "unknownpdf.ai", reason: "Finance needs to inspect a client PDF." })
    }));
    const requestBody = await requestResponse.json();
    expect(requestResponse.status).toBe(200);
    expect(requestBody.accessRequest.status).toBe("PENDING");

    const approveResponse = await approveAccess(authedRequest(`/api/access/${requestBody.accessRequest._id}/approve`, cookie, { method: "PATCH" }), {
      params: Promise.resolve({ id: requestBody.accessRequest._id })
    });
    expect(approveResponse.status).toBe(200);

    const allowed = await checkDomain(nextRequest("http://localhost:3000/api/extension/report", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.89" },
      body: JSON.stringify({ domain: "unknownpdf.ai", url: "https://unknownpdf.ai", employeeEmail: email })
    }));
    expect((await allowed.json()).decision).toBe("ALLOW");
  });

  it("rate limits rapid extension checks", async () => {
    let last = new Response();
    for (let index = 0; index < 91; index += 1) {
      last = await checkDomain(nextRequest("http://localhost:3000/api/check-domain", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.90" },
        body: JSON.stringify({ domain: "github.com", url: "https://github.com", employeeEmail: "burst@company.com" })
      }));
    }
    expect(last.status).toBe(429);
  });
});

describe("authenticated APIs", () => {
  it("protects admin GET routes without a valid JWT", async () => {
    const routes = [getAppsRoute, getEmployeesRoute, getAlertsRoute, getEventsRoute];
    for (const route of routes) {
      expect((await route(nextRequest("http://localhost:3000/api/protected"))).status).toBe(401);
      expect((await route(nextRequest("http://localhost:3000/api/protected", { headers: { cookie: "shadowshield_token=tampered" } }))).status).toBe(401);
    }
  });

  it("supports login, protected reads, demo load, analyze, upload, and logout", async () => {
    const cookie = await loginCookie("203.0.113.100");

    expect((await loadDemo(authedRequest("/api/demo/load", cookie, { method: "POST" }))).status).toBe(200);
    expect((await getAppsRoute(authedRequest("/api/apps", cookie))).status).toBe(200);
    expect((await getEmployeesRoute(authedRequest("/api/employees", cookie))).status).toBe(200);
    expect((await getAlertsRoute(authedRequest("/api/alerts", cookie))).status).toBe(200);
    expect((await getEventsRoute(authedRequest("/api/events", cookie))).status).toBe(200);

    const explainResponse = await analyze(authedRequest("/api/analyze", cookie, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        toolName: "Claude",
        domain: "claude.ai",
        category: "AI",
        permissions: ["browser.navigation"],
        riskLevel: "MEDIUM"
      })
    }));
    expect(explainResponse.status).toBe(200);
    expect((await explainResponse.json()).explanation).toContain("Claude");

    const form = new FormData();
    form.set("file", new File([
      "employee_email,tool_name,domain,oauth_permissions,department,signup_date\nqa@company.com,GitHub,github.com,profile,Engineering,2026-05-10\n"
    ], "apps.csv", { type: "text/csv" }));
    const uploadResponse = await upload(authedRequest("/api/upload", cookie, { method: "POST", body: form }));
    expect(uploadResponse.status).toBe(200);

    const logoutResponse = await logout();
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.headers.get("set-cookie")).toContain("shadowshield_token=");
  });

  it("rejects malformed admin API payloads and brute force login", async () => {
    const cookie = await loginCookie("203.0.113.120");
    expect((await analyze(authedRequest("/api/analyze", cookie, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toolName: "OnlyName" })
    }))).status).toBe(400);
    expect((await upload(authedRequest("/api/upload", cookie, { method: "POST", body: new FormData() }))).status).toBe(400);

    let response = new Response();
    for (let index = 0; index < 6; index += 1) {
      response = await login(nextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.199" },
        body: JSON.stringify({ email: "admin@shadowshield.ai", password: "wrong" })
      }));
    }
    expect(response.status).toBe(429);
  });
});
