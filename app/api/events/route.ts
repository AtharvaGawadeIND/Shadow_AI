import { requireAuth } from "@/lib/auth";
import { getEvents } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({ events: await getEvents() });
}
