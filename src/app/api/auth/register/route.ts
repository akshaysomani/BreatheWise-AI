import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { registerSchema } from '@/lib/validations/auth.schema';
import { hashPassword } from '@/lib/password';
import { createDatabaseSession, getSessionCookieOptions, invalidateDatabaseSession, SESSION_COOKIE_NAME } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validateCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  // Rate limit: Max 10 registration requests per hour per IP
  const rateLimit = checkRateLimit(`register_${clientIp}`, 10, 3600_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many registration attempts. Please try again later.', 429);
  }

  // CSRF validation
  const csrf = validateCsrf(req);
  if (!csrf.valid) {
    return apiError('CSRF_ERROR', csrf.reason || 'Invalid request origin', 403);
  }

  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

    const normalizedEmail = validated.email.trim().toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      // Generic message without exposing unnecessary account metadata
      return apiError(
        'ACCOUNT_EXISTS',
        'An account with this email address already exists. Please sign in.',
        409
      );
    }

    // Hash password with memory-hard scrypt
    const passwordHash = await hashPassword(validated.password);

    // Create user with explicit role assignment (prevents privilege escalation)
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: validated.name || null,
        role: 'USER', // Hardcoded non-privileged default
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Session Fixation Defense: Invalidate any pre-existing session associated with incoming cookie
    const oldSessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (oldSessionCookie) {
      await invalidateDatabaseSession(oldSessionCookie);
    }

    // Create persistent database session
    const { sessionToken, expiresAt } = await createDatabaseSession(newUser.id, req);

    // Issue HttpOnly, SameSite=Lax cookie
    const cookieOptions = getSessionCookieOptions(expiresAt);
    const response = apiSuccess(
      {
        user: newUser,
        message: 'Account created successfully.',
      },
      undefined,
      201
    );

    response.cookies.set(cookieOptions.name, sessionToken, cookieOptions);
    return response;
  } catch (error) {
    const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code: unknown }).code : undefined;
    logger.error('Registration processing failure in POST /api/auth/register', {
      errorCode: typeof errorCode === 'string' ? errorCode : undefined,
    });
    return handleApiError(error, 'POST /api/auth/register');
  }
}
