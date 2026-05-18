import { createAccessRequest } from "@/lib/store";
import { domainLabel, normalizeDomain } from "@/lib/risk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  employee: z.string().email().max(254),
  tool: z.string().max(120).optional(),
  domain: z.string().min(3).max(253),
  reason: z.string().min(1).max(1000)
});

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid access request payload", details: parsed.error.flatten() }, { status: 400 });
  const domain = normalizeDomain(parsed.data.domain).replace(/[^a-z0-9.-]/g, "");
  const accessRequest = await createAccessRequest({
    employee: parsed.data.employee.trim().toLowerCase(),
    tool: parsed.data.tool?.trim() || domainLabel(domain),
    domain,
    reason: parsed.data.reason.trim()
  });
  return json({ ok: true, accessRequest });
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
