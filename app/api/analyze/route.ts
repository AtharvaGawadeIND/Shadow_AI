import { requireAuth } from "@/lib/auth";
import { generateRiskExplanation } from "@/lib/ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const explainSchema = z.object({
  toolName: z.string().min(1).max(120),
  domain: z.string().min(3).max(253),
  category: z.string().min(1).max(80),
  permissions: z.array(z.string().max(120)).max(50),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"])
});

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);
  const parsed = explainSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid explanation payload.", details: parsed.error.flatten() }, { status: 400 });
  const explanation = await generateRiskExplanation(parsed.data);
  return NextResponse.json({ explanation });
}
