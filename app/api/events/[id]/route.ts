import { requireAuth } from "@/lib/auth";
import { deleteEntity } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  await deleteEntity("events", id);
  return NextResponse.json({ ok: true });
}
