import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sanitizeReturnUrl } from '@/lib/sanitize-redirect';

export function middleware(req: NextRequest) {
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
