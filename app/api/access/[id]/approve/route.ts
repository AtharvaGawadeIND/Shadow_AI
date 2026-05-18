import { readSession, requireAuth } from "@/lib/auth";
import { approveAccessRequest } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;
  const session = readSession(request);
  const { id } = await params;
  const accessRequest = await approveAccessRequest(id, session?.email ?? "admin@shadowshield.ai");
  if (!accessRequest) return NextResponse.json({ error: "Access request not found" }, { status: 404 });
  return NextResponse.json({ ok: true, accessRequest });
}
