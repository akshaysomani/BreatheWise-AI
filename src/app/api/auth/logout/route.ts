import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { invalidateDatabaseSession, SESSION_COOKIE_NAME } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    // 1. Get session token from cookie
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    // 2. Also inspect Bearer header if called via API
    const authHeader = req.headers.get('authorization');
    const bearerToken =
      authHeader && authHeader.trim().startsWith('Bearer ')
        ? authHeader.trim().substring(7).trim()
        : null;

    if (sessionCookie) {
      await invalidateDatabaseSession(sessionCookie);
    }
    if (bearerToken && bearerToken !== sessionCookie) {
      await invalidateDatabaseSession(bearerToken);
    }

    const response = apiSuccess({
      message: 'Logged out successfully.',
    });

    // Invalidate browser cookie immediately
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/logout');
  }
}
