import { readSession, requireAuth } from "@/lib/auth";
import { createPolicy, getPolicies } from "@/lib/store";
import { normalizeDomain } from "@/lib/risk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const policySchema = z
  .object({
    domain: z.string().min(3).max(253),
    toolName: z.string().min(1).max(120),
    scope: z.enum(["global", "user"]),
    employeeEmail: z.string().email().max(254).optional().or(z.literal("")),
    action: z.enum(["block", "allow"]),
    reason: z.string().max(1000).optional().default(""),
    active: z.boolean().optional().default(true)
  })
  .refine((value) => value.scope === "global" || Boolean(value.employeeEmail), {
    message: "Employee email is required for user policies",
    path: ["employeeEmail"]
  });

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const params = request.nextUrl.searchParams;
  const scope = params.get("scope");
  const action = params.get("action");
  const search = (params.get("search") ?? "").trim().toLowerCase();

  const policies = (await getPolicies()).filter((policy) => {
    const matchesScope = !scope || scope === "all" || policy.scope === scope;
    const matchesAction = !action || action === "all" || policy.action === action;
    const matchesSearch = !search || policy.domain.includes(search) || (policy.employeeEmail ?? "").includes(search);
    return matchesScope && matchesAction && matchesSearch;
  });

  return NextResponse.json({ policies });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const parsed = policySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid policy payload", details: parsed.error.flatten() }, { status: 400 });

  const session = readSession(request);
  const policy = await createPolicy({
    ...parsed.data,
    domain: normalizeDomain(parsed.data.domain),
    employeeEmail: parsed.data.scope === "user" ? parsed.data.employeeEmail?.toLowerCase() : "",
    createdBy: session?.email ?? "admin@shadowshield.ai"
  });

  return NextResponse.json({ policy }, { status: 201 });
}
