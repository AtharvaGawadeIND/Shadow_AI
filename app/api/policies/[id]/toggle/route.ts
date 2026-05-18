import { requireAuth } from "@/lib/auth";
import { togglePolicy } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const policy = await togglePolicy(id);
  if (!policy) return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  return NextResponse.json({ policy });
}
