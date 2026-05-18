import { requireAuth } from "@/lib/auth";
import { deleteEntity, getApps, setAppApproval } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const approvalSchema = z.object({
  approved: z.boolean()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const parsed = approvalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid approval payload" }, { status: 400 });

  const routeParams = await params;
  const id = routeParams.id ?? (routeParams as { domain?: string }).domain;
  if (!id) return NextResponse.json({ error: "Missing app id" }, { status: 400 });
  await setAppApproval(decodeURIComponent(id), parsed.data.approved);
  return NextResponse.json({ apps: await getApps() });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;
  const routeParams = await params;
  const id = routeParams.id ?? (routeParams as { domain?: string }).domain;
  if (!id) return NextResponse.json({ error: "Missing app id" }, { status: 400 });
  await deleteEntity("apps", id);
  return NextResponse.json({ ok: true });
}
