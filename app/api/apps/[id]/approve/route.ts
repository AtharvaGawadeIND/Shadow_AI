import { requireAuth } from "@/lib/auth";
import { setAppApproval } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  await setAppApproval(decodeURIComponent(id), true);
  return NextResponse.json({ ok: true });
}
