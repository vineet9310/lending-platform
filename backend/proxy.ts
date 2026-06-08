import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const timestamp = new Date().toISOString();

  // Print backend API hit logs
  console.log(`[BACKEND API HIT] [${timestamp}] ${request.method} ${pathname}`);

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
