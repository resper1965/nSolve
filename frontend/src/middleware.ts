/**
 * n.Solve - Auth Middleware
 * Protects routes requiring authentication
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes (no auth required)
const publicRoutes = [
  "/auth/v1/login",
  "/auth/v2/login",
  "/auth/v1/register",
  "/auth/v2/register",
  "/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is public
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route) || pathname === route);

  // Get token from cookies
  const token = request.cookies.get("auth_token")?.value;
  const isAuthenticated = !!token;

  // If accessing public route and authenticated, redirect to dashboard
  if (isPublicRoute && isAuthenticated && !pathname.includes("/auth/")) {
    return NextResponse.redirect(new URL("/dashboard/default", request.url));
  }

  // If accessing protected route and not authenticated, redirect to login
  if (!isPublicRoute && !isAuthenticated) {
    const loginUrl = new URL("/auth/v2/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
