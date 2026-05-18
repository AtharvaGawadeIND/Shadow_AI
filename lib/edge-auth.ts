import { NextRequest } from "next/server";

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function readEdgeSession(request: NextRequest) {
  const token = request.cookies.get("shadowshield_token")?.value;
  if (!token) return null;

  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) return null;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(process.env.JWT_SECRET || "shadowshield-local-dev-secret"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
    if (bytesToBase64Url(expected) !== signature) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as {
      email?: string;
      role?: string;
      exp?: number;
    };
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (payload.role !== "admin" || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}
