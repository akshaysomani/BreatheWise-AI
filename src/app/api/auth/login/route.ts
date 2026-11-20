import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { loginSchema } from '@/lib/validations/auth.schema';
import { verifyPassword, dummyPasswordVerification } from '@/lib/password';
import { createDatabaseSession, getSessionCookieOptions } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { validateCsrf } from '@/lib/csrf';

export async function POST(req: NextRequest) {
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
