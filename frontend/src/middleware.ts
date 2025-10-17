/**
 * n.Solve - Auth Middleware (Simplified)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir todas as rotas de auth
  if (pathname.startsWith("/auth") || pathname === "/") {
    return NextResponse.next();
  }

  // Verificar token
  const token = request.cookies.get("auth_token")?.value;

  // Se não tem token e está tentando acessar dashboard, redirecionar para login
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/v2/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|debug-auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
