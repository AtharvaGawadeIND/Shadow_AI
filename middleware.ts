import { readEdgeSession } from "@/lib/edge-auth";
import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/dashboard", "/inventory", "/employees", "/alerts", "/events"];

export async function middleware(request: NextRequest) {
  const isProtected = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));
  if (!isProtected) return NextResponse.next();
  if (!(await readEdgeSession(request))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/inventory/:path*", "/employees/:path*", "/alerts/:path*", "/events/:path*"]
};
