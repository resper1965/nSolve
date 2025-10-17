/**
 * n.Solve - Middleware de Autenticação
 * Protege rotas que requerem autenticação
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas públicas que não precisam de autenticação
const publicRoutes = [
  '/auth/v1/login',
  '/auth/v2/login',
  '/auth/v1/register',
  '/auth/v2/register',
  '/auth/forgot-password',
  '/auth/reset-password',
];

// Rotas que devem redirecionar para dashboard se já autenticado
const authRoutes = publicRoutes;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Obter token dos cookies ou headers
  const token = request.cookies.get('auth_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  const isAuthenticated = !!token;

  // Se está em rota pública e já autenticado, redirecionar para dashboard
  if (authRoutes.some(route => pathname.startsWith(route)) && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Se não está autenticado e tentando acessar rota protegida
  if (!publicRoutes.some(route => pathname.startsWith(route)) && !isAuthenticated) {
    // Redirecionar para login
    const loginUrl = new URL('/auth/v2/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

