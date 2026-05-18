import { requireAuth } from "@/lib/auth";
import { getAlerts } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({ alerts: await getAlerts() });
}
