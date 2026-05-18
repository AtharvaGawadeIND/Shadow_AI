import { requireAuth } from "@/lib/auth";
import { normalizeDomain } from "@/lib/risk";
import { getApps, setAppApproval } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const approvalSchema = z.object({
  approved: z.boolean()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const parsed = approvalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid approval payload" }, { status: 400 });
  }

  const { domain } = await params;
  await setAppApproval(normalizeDomain(decodeURIComponent(domain)), parsed.data.approved);
  return NextResponse.json({ apps: await getApps() });
}
