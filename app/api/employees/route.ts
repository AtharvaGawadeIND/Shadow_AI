import { requireAuth } from "@/lib/auth";
import { getApps, getEmployees } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;
  const [employees, apps] = await Promise.all([getEmployees(), getApps()]);
  return NextResponse.json({ employees, apps });
}
