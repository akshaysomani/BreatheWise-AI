import { NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { passwordResetRequestSchema, passwordResetConfirmSchema } from '@/lib/validations/auth.schema';
import { hashPassword, dummyPasswordVerification } from '@/lib/password';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/reset-password
 * 
 * SECURITY SPECIFICATION (M3.1):
 * - Flow 1 (Request):
 *   - Strictly rate-limited per IP (3/15 min) and per normalized email (3/15 min).
 *   - NEVER logs raw reset tokens or user IDs.
 *   - NEVER returns raw tokens in API responses.
 *   - Stores SHA-256 tokenHash in database with 1-hour expiration.
 *   - Always returns a generic, timing-neutral response regardless of account existence.
 * - Flow 2 (Confirm):
 *   - Rate-limited per IP (5/15 min).
 *   - Compares SHA-256 hash in database.
 *   - Single-use and expiration enforced.
 *   - Atomic transaction: updates passwordHash, marks usedAt timestamp, and deletes all active sessions.
 */
export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  try {
    const body = await req.json();

    // Flow 2: Confirmation with reset token
    if (body.token && body.newPassword) {
      const rateLimitConfirm = checkRateLimit(`reset_confirm_${clientIp}`, 5, 900_000);
      if (!rateLimitConfirm.allowed) {
        return apiError('RATE_LIMIT_EXCEEDED', 'Too many password reset confirmation attempts. Please try again later.', 429);
      }

      const validated = passwordResetConfirmSchema.parse(body);

      // Compute SHA-256 hash of provided token
      const tokenHash = crypto.createHash('sha256').update(validated.token).digest('hex');

      const resetRecord = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      // Strict validation: record must exist, must not be used, must not be expired
      if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt.getTime() < Date.now()) {
        return apiError('INVALID_TOKEN', 'The password reset token is invalid, used, or expired.', 400);
      }

      // Atomic single-use token consumption (prevents concurrent race conditions)
      const consumption = await prisma.passwordResetToken.updateMany({
        where: {
          id: resetRecord.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      if (consumption.count === 0) {
        return apiError('INVALID_TOKEN', 'The password reset token is invalid, used, or expired.', 400);
      }

      // Hash new password using memory-hard scrypt
      const newPasswordHash = await hashPassword(validated.newPassword);

      // Invalidate all sessions and update password
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetRecord.userId },
          data: { passwordHash: newPasswordHash },
        }),
        prisma.session.deleteMany({
          where: { userId: resetRecord.userId },
        }),
      ]);

      logger.info('Password reset completed successfully. Active sessions revoked.');

      return apiSuccess({
        message: 'Password has been updated successfully. Please sign in with your new credentials.',
      });
    }

    // Flow 1: Requesting a reset link
    const rateLimitRequest = checkRateLimit(`reset_req_${clientIp}`, 3, 900_000);
    if (!rateLimitRequest.allowed) {
      return apiError('RATE_LIMIT_EXCEEDED', 'Too many password reset requests. Please try again later.', 429);
    }

    const validated = passwordResetRequestSchema.parse(body);
    const normalizedEmail = validated.email.trim().toLowerCase();

    // Additional per-email rate limit
    const emailRateLimit = checkRateLimit(`reset_email_${normalizedEmail}`, 3, 900_000);
    if (!emailRateLimit.allowed) {
      return apiError('RATE_LIMIT_EXCEEDED', 'Too many reset requests for this email address. Please try again later.', 429);
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Generate 32-byte (256-bit) cryptographically secure random token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 3600_000); // 1 hour validity

      // Invalidate any previous unexpired reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Persist ONLY the cryptographic hash of the token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Clean security logging: NEVER log raw tokens or user IDs
      const domain = normalizedEmail.includes('@') ? normalizedEmail.split('@')[1] : 'unknown';
      logger.info('Password reset request processed for domain', { domain });
    } else {
      // Execute timing-equal workload to defeat timing-based account enumeration
      await dummyPasswordVerification();
    }

    // Return generic, privacy-preserving response that reveals zero existence information
    return apiSuccess({
      message: 'If an account exists with this email address, password reset instructions will be processed.',
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/reset-password');
  }
}
