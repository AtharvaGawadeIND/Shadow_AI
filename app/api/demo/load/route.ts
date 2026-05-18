import { analyzeRecords } from "@/lib/analyzer";
import { requireAuth } from "@/lib/auth";
import { loadDemoData } from "@/lib/store";
import { demoRecords } from "@/data/demo";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const result = await analyzeRecords(demoRecords);
  const data = await loadDemoData(result);
  return NextResponse.json({ ok: true, ...data });
}
