// Cloudflare Pages Functions Middleware for Next.js SSR
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Handle authentication for protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/auth/v2/login', request.url));
    }
  }

  // Handle API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Proxy to Workers
    const apiUrl = new URL(request.nextUrl.pathname.replace('/api', ''), 'https://core-processor.ness.workers.dev');
    return NextResponse.rewrite(apiUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*'
  ]
};
