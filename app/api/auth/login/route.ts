import { signSession, verifyAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = rateLimit(`login:${ip}`);
  if (!limited.allowed) {
    return NextResponse.json({ error: `Too many attempts. Try again in ${limited.retryAfter}s.` }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const email = sanitizeText(body?.email).toLowerCase();
  const password = sanitizeText(body?.password);

  if (!(await verifyAdmin(email, password))) {
    return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
  }

  const token = signSession(email);
  const response = NextResponse.json({ ok: true, user: { email, role: "admin" } });
  response.cookies.set("shadowshield_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}
