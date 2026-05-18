import { alertsForBlockedEvent } from "@/lib/access-alerts";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeDomain } from "@/lib/risk";
import { addAlerts, addEvent, evaluatePolicyAccess, recordAccessExposure } from "@/lib/store";
import type { AccessEvent } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  domain: z.string().min(3).max(253).regex(/^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/),
  employee: z.string().email().max(254),
  url: z.string().url().max(2048).optional()
});

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

function clientKey(request: NextRequest, employeeEmail: string) {
  return `${request.headers.get("x-forwarded-for") ?? "local"}:${employeeEmail}:policy`;
}

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return json({ error: "Invalid policy check query", details: parsed.error.flatten() }, { status: 400 });

  const employeeEmail = parsed.data.employee.trim().toLowerCase();
  const domain = normalizeDomain(parsed.data.domain).replace(/[^a-z0-9.-]/g, "");
  const url = parsed.data.url ?? `https://${domain}`;
  const parsedUrl = new URL(url);
  const urlDomain = normalizeDomain(parsedUrl.hostname);
  if (urlDomain !== domain && !urlDomain.endsWith(`.${domain}`)) {
    return json({ error: "Domain does not match URL hostname" }, { status: 400 });
  }

  const limited = rateLimit(clientKey(request, employeeEmail), 120, 60_000);
  if (!limited.allowed) return json({ error: "Rate limit exceeded", retryAfter: limited.retryAfter }, { status: 429 });

  const decision = await evaluatePolicyAccess({ domain, employeeEmail });
  const timestamp = new Date().toISOString();
  const event: AccessEvent = {
    employeeEmail,
    domain,
    url,
    decision: decision.decision,
    riskLevel: decision.riskLevel,
    riskScore: decision.riskScore,
    category: decision.category,
    timestamp,
    blocked: decision.decision === "BLOCK",
    reason: decision.reason
  };

  await addEvent(event);
  await recordAccessExposure(event);
  if (event.blocked) await addAlerts(alertsForBlockedEvent(event));

  return json({
    decision: decision.decision,
    riskLevel: decision.riskLevel,
    riskScore: decision.riskScore,
    category: decision.category,
    reason: decision.reason,
    message: decision.message,
    source: decision.source,
    policyId: decision.policy?._id,
    timestamp
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
