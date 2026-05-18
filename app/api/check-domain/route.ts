import { alertsForBlockedEvent } from "@/lib/access-alerts";
import { rateLimit } from "@/lib/rate-limit";
import { evaluateDomainAccess, normalizeDomain } from "@/lib/risk";
import { addAlerts, addEvent, getApprovedDomains, recordAccessExposure } from "@/lib/store";
import type { AccessEvent } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const payloadSchema = z.object({
  domain: z.string().min(3).max(253).regex(/^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/),
  url: z.string().url().max(2048).refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }, "URL must use http or https"),
  employeeEmail: z.string().email().max(254)
});

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

function clientKey(request: NextRequest, employeeEmail: string) {
  return `${request.headers.get("x-forwarded-for") ?? "local"}:${employeeEmail}`;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Invalid request payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const employeeEmail = parsed.data.employeeEmail.trim().toLowerCase();
  const domain = normalizeDomain(parsed.data.domain).replace(/[^a-z0-9.-]/g, "");
  const url = parsed.data.url.trim();
  const parsedUrl = new URL(url);
  const urlDomain = normalizeDomain(parsedUrl.hostname);
  if (urlDomain !== domain && !urlDomain.endsWith(`.${domain}`)) {
    return json({ error: "Domain does not match URL hostname" }, { status: 400 });
  }

  const limited = rateLimit(clientKey(request, employeeEmail), 90, 60_000);

  if (!limited.allowed) {
    return json({ error: "Rate limit exceeded", retryAfter: limited.retryAfter }, { status: 429 });
  }

  const decision = evaluateDomainAccess({ domain, approvedDomains: await getApprovedDomains() });
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
  if (event.blocked) {
    await addAlerts(alertsForBlockedEvent(event));
  }

  return json({
    decision: decision.decision,
    riskLevel: decision.riskLevel,
    riskScore: decision.riskScore,
    category: decision.category,
    reason: decision.reason,
    message: decision.message,
    timestamp
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
