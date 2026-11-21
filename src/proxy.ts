import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sanitizeReturnUrl } from '@/lib/sanitize-redirect';

/**
 * BreatheWise AI — Next.js Request Proxy & Route Guard (M8.6 / M7-003)
 * 
 * Migrated from deprecated `middleware.ts` convention to the official Next.js 16.4.6 `proxy` convention.
 * Enforces session authentication guards on protected application routes and manages safe login redirects.
 */
export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const sessionCookie = req.cookies.get('breathewise_session')?.value;

  // 1. Protected routes: /dashboard and sub-paths
  if (pathname.startsWith('/dashboard')) {
    if (!sessionCookie) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Auth routes: /login, /register
  // If user is already authenticated via session cookie, redirect them to dashboard
  if (pathname === '/login' || pathname === '/register') {
    if (sessionCookie) {
      const returnUrl = searchParams.get('returnUrl');
      const safeUrl = sanitizeReturnUrl(returnUrl);
      return NextResponse.redirect(new URL(safeUrl, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match dashboard, login, and register pages
     * Exclude static files, images, favicon, api routes
     */
    '/dashboard/:path*',
    '/login',
    '/register',
  ],
};
