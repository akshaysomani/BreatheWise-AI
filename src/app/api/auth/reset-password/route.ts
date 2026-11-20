import { NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { passwordResetRequestSchema, passwordResetConfirmSchema } from '@/lib/validations/auth.schema';
import { hashPassword } from '@/lib/password';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/reset-password
 * 
 * Supports:
 * 1. Requesting a reset token (body: { email })
 * 2. Confirming a reset with token (body: { token, newPassword })
 */
export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  const rateLimit = checkRateLimit(`reset_pwd_${clientIp}`, 5, 300_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many password reset requests. Please wait.', 429);
  }

  try {
    const body = await req.json();

    // Flow 2: Confirmation with reset token
    if (body.token && body.newPassword) {
      const validated = passwordResetConfirmSchema.parse(body);

      const tokenHash = crypto.createHash('sha256').update(validated.token).digest('hex');

      const resetRecord = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt.getTime() < Date.now()) {
        return apiError('INVALID_TOKEN', 'The password reset token is invalid, used, or expired.', 400);
      }

      // Hash new password
      const newPasswordHash = await hashPassword(validated.newPassword);

      // In a transaction: update user password, mark token used, invalidate all existing sessions
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetRecord.userId },
          data: { passwordHash: newPasswordHash },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetRecord.id },
          data: { usedAt: new Date() },
        }),
        prisma.session.deleteMany({
          where: { userId: resetRecord.userId },
        }),
      ]);

      return apiSuccess({
        message: 'Password has been updated successfully. Please sign in with your new credentials.',
      });
    }

    // Flow 1: Requesting a reset link/token
    const validated = passwordResetRequestSchema.parse(body);
    const normalizedEmail = validated.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Generate 32-byte cryptographically random token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 3600_000); // 1 hour validity

      // Invalidate any previous unexpired reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Persist hashed token only (never store raw tokens in database)
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Email Provider Status Audit (M3 requirement):
      // No external SMTP or SendGrid provider is configured in environment variables.
      // Honest disclosure: Do not pretend email was sent.
      logger.info('Password reset token generated for user. External email provider is unconfigured in local environment.', {
        userId: user.id,
      });
    }

    // Always return generic response to defeat user enumeration
    return apiSuccess({
      message:
        'If an account exists with that email address, password reset instructions have been generated. Note: In local development mode without an SMTP provider, password resets must be executed using verified token administration.',
      emailDeliveryConfigured: false,
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/reset-password');
  }
}
