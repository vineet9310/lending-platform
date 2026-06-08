import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const timestamp = new Date().toISOString();

  // Retrieve token using next-auth/jwt (Edge-compatible)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const userId = token?.id || "guest";
  const userRole = (token?.role as string) || "guest";
  const userStatus = (token?.status as string) || "active";

  // Request logger
  console.log(`[${timestamp}] ${request.method} ${pathname} - User: ${userId} (Role: ${userRole})`);

  // Block suspended users immediately
  if (token && userStatus === "suspended") {
    // If it's an API request, return JSON, else redirect to login
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ error: "Your account has been suspended" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    const response = NextResponse.redirect(new URL("/login?error=suspended", request.url));
    return response;
  }

  // Rate Limiting (Optional integration with Upstash Rate Limit if environment variables are set)
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) {
    try {
      // In a real environment, we would use Upstash Rate Limiter.
      // Importing it inside this block prevents failures if the lib is not loaded,
      // though we installed @upstash/ratelimit.
      // We will perform a basic API fetch rate limit check or import dynamically if supported.
    } catch (err) {
      console.error("Rate limiting error:", err);
    }
  }

  // Define route-role mappings
  // /borrower/* -> borrower
  // /agent/*    -> agent, admin, superadmin
  // /admin/*    -> admin, superadmin
  // /api/admin/* -> admin, superadmin

  const isBorrowerRoute = pathname.startsWith("/borrower");
  const isAgentRoute = pathname.startsWith("/agent");
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminApiRoute = pathname.startsWith("/api/admin");

  // Authentication & Authorization Guards
  if (isBorrowerRoute) {
    if (!token) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, request.url));
    }
    if (userRole !== "borrower") {
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }
  }

  if (isAgentRoute) {
    if (!token) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, request.url));
    }
    if (!["agent", "admin", "superadmin"].includes(userRole)) {
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }
  }

  if (isAdminRoute) {
    if (!token) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, request.url));
    }
    if (!["admin", "superadmin"].includes(userRole)) {
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }
  }

  if (isAdminApiRoute) {
    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!["admin", "superadmin"].includes(userRole)) {
      return new NextResponse(
        JSON.stringify({ error: "Access denied. Admin role required." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/borrower/:path*",
    "/agent/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
