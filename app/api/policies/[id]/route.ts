import { requireAuth } from "@/lib/auth";
import { deletePolicy, updatePolicy } from "@/lib/store";
import { normalizeDomain } from "@/lib/risk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z
  .object({
    domain: z.string().min(3).max(253).optional(),
    toolName: z.string().min(1).max(120).optional(),
    scope: z.enum(["global", "user"]).optional(),
    employeeEmail: z.string().email().max(254).optional().or(z.literal("")),
    action: z.enum(["block", "allow"]).optional(),
    reason: z.string().max(1000).optional(),
    active: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid policy payload", details: parsed.error.flatten() }, { status: 400 });

  const { id } = await params;
  try {
    const policy = await updatePolicy(id, {
      ...parsed.data,
      domain: parsed.data.domain ? normalizeDomain(parsed.data.domain) : undefined,
      employeeEmail: parsed.data.employeeEmail?.toLowerCase()
    });
    if (!policy) return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    return NextResponse.json({ policy });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Policy update failed" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const deleted = await deletePolicy(id);
  if (!deleted) return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
