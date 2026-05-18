import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const adminEmail = "admin@shadowshield.ai";
const adminPassword = "admin123";

export const runtimeJwtSecret = () => process.env.JWT_SECRET || "shadowshield-local-dev-secret";

export async function verifyAdmin(email: string, password: string) {
  if (email !== adminEmail) return false;
  const hash = await bcrypt.hash(adminPassword, 10);
  return bcrypt.compare(password, hash);
}

export function signSession(email: string) {
  return jwt.sign({ email, role: "admin" }, runtimeJwtSecret(), { expiresIn: "8h" });
}

export function readSession(request: NextRequest) {
  const token = request.cookies.get("shadowshield_token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, runtimeJwtSecret()) as { email: string; role: string };
  } catch {
    return null;
  }
}

export function requireAuth(request: NextRequest) {
  const session = readSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
