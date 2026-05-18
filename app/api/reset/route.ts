import { requireAuth } from "@/lib/auth";
import { clearAllData } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;
  await clearAllData();
  return NextResponse.json({ ok: true });
}
