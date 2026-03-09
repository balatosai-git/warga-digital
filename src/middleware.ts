import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/onboarding", "/auth/register", "/auth/otp", "/auth/login", "/auth/set-pin", "/auth/add-family"];
const API_AUTH_PREFIX = "/api/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(API_AUTH_PREFIX)) {
    return NextResponse.next();
  }

  if (pathname === "/" || pathname.startsWith("/landing")) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}
