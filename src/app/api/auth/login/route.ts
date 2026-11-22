import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { apiSuccess, apiError, handleApiError, validateRequestBodySize } from '@/lib/api-response';
import { loginSchema } from '@/lib/validations/auth.schema';
import { verifyPassword, dummyPasswordVerification } from '@/lib/password';
import { createDatabaseSession, getSessionCookieOptions, invalidateDatabaseSession, SESSION_COOKIE_NAME } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validateCsrf } from '@/lib/csrf';

export async function POST(req: NextRequest) {
  // Body size validation (max 20 KB)
  const sizeError = validateRequestBodySize(req, 20 * 1024);
  if (sizeError) return sizeError;

  const clientIp = getClientIp(req);

  // Rate limit: 5 login attempts per 5 minutes per IP
  const rateLimit = checkRateLimit(`login_${clientIp}`, 5, 300_000);
  if (!rateLimit.allowed) {
    return apiError(
      'RATE_LIMIT_EXCEEDED',
      'Too many failed login attempts. Please wait 5 minutes before trying again.',
      429
    );
  }

  // CSRF validation
  const csrf = validateCsrf(req);
  if (!csrf.valid) {
    return apiError('CSRF_ERROR', csrf.reason || 'Invalid request origin', 403);
  }

  try {
    const body = await req.json();
    const validated = loginSchema.parse(body);

    const normalizedEmail = validated.email.trim().toLowerCase();

    // Account-level brute-force defense: Rate limit per target email (max 10 attempts per 15 minutes)
    const emailRateLimit = checkRateLimit(`login_account_${normalizedEmail}`, 10, 900_000);
    if (!emailRateLimit.allowed) {
      return apiError(
        'RATE_LIMIT_EXCEEDED',
        'Too many failed login attempts for this account. Please wait 15 minutes before trying again.',
        429
      );
    }

    // Query user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Execute dummy scrypt verification to prevent timing-based account enumeration
      await dummyPasswordVerification();
      return apiError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
    }

    // Verify password hash in constant time
    const passwordValid = await verifyPassword(validated.password, user.passwordHash);
    if (!passwordValid) {
      return apiError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
    }

    // Session Fixation Defense: Invalidate any pre-existing session associated with incoming cookie
    const oldSessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (oldSessionCookie) {
      await invalidateDatabaseSession(oldSessionCookie);
    }

    // Create session in database
    const { sessionToken, expiresAt } = await createDatabaseSession(user.id, req);

    // Prepare safe sanitized user representation (zero passwordHash)
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const cookieOptions = getSessionCookieOptions(expiresAt);
    const response = apiSuccess({
      user: sanitizedUser,
      message: 'Signed in successfully.',
    });

    response.cookies.set(cookieOptions.name, sessionToken, cookieOptions);
    return response;
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/login');
  }
}
