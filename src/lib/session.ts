import crypto from 'crypto';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { getClientIp } from './rate-limiter';

export const SESSION_COOKIE_NAME = 'breathewise_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionData {
  id: string;
  sessionToken: string;
  userId: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

/**
 * Creates an opaque, 256-bit cryptographically random session and stores it in the database.
 */
export async function createDatabaseSession(
  userId: string,
  req?: NextRequest
): Promise<{ sessionToken: string; expiresAt: Date }> {
  // 32 bytes = 256 bits of cryptographic entropy
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const userAgent = req?.headers.get('user-agent') || undefined;
  const ipAddress = req ? getClientIp(req) : undefined;

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expiresAt,
      userAgent: userAgent ? userAgent.substring(0, 255) : undefined,
      ipAddress: ipAddress ? ipAddress.substring(0, 45) : undefined,
    },
  });

  return { sessionToken, expiresAt };
}

/**
 * Validates a session token against the database.
 * Fails closed if session is expired, missing, or revoked.
 */
export async function validateDatabaseSession(sessionToken: string): Promise<SessionData | null> {
  if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.length < 32) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  // Check expiration
  if (session.expiresAt.getTime() < Date.now()) {
    // Clean up expired session asynchronously
    prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session;
}

/**
 * Invalidates (revokes) a session in the database immediately upon logout.
 */
export async function invalidateDatabaseSession(sessionToken: string): Promise<boolean> {
  try {
    await prisma.session.delete({
      where: { sessionToken },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Invalidates all active sessions for a user (e.g. security credential reset).
 */
export async function invalidateAllUserSessions(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { userId },
  });
  return result.count;
}

/**
 * Returns standard cookie configuration for the session cookie.
 */
export function getSessionCookieOptions(expiresAt?: Date) {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}
