import { analyzeRecords } from "@/lib/analyzer";
import { requireAuth } from "@/lib/auth";
import { replaceData } from "@/lib/store";
import type { UploadRecord } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a CSV or JSON file." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }

  const text = await file.text();
  let records: UploadRecord[];
  try {
    if (file.name.endsWith(".json")) {
      const parsed = JSON.parse(text);
      records = Array.isArray(parsed) ? parsed : parsed.records;
    } else if (file.name.endsWith(".csv")) {
      const parsed = Papa.parse<UploadRecord>(text, { header: true, skipEmptyLines: true });
      if (parsed.errors.length) throw new Error(parsed.errors[0].message);
      records = parsed.data;
    } else {
      return NextResponse.json({ error: "Unsupported format. Use CSV or JSON." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Malformed upload." }, { status: 400 });
  }

  try {
    const result = await analyzeRecords(records);
    await replaceData(result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not analyze upload." }, { status: 400 });
  }
}
