import { NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { validateDatabaseSession, SESSION_COOKIE_NAME } from './session';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string | null;
}

export interface SessionPayload {
  sub: string; // User ID
  email: string;
  role: string;
  exp: number; // Expiry timestamp (epoch seconds)
  iat: number; // Issued at timestamp (epoch seconds)
}

/**
 * Server-side Secret for Cryptographic Session Verification.
 * Reads from process.env.SESSION_SECRET with a hardened fallback for local testing.
 */
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'local-dev-session-secret-breathewise-ai-32-chars-minimum';

/**
 * Base64URL encoding helper.
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64URL decoding helper.
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Generates an HMAC-SHA256 cryptographic signature.
 */
function createSignature(data: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Securely compares two signatures in constant time to prevent timing attacks.
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Signs a session payload into a cryptographically verified token.
 * Format: v1.<base64UrlPayload>.<hmacSignature>
 */
export function createSessionToken(
  user: { id: string; email: string; role?: string },
  expiresInSeconds = 86400
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    role: user.role || 'USER',
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(encodedPayload, SESSION_SECRET);

  return `v1.${encodedPayload}.${signature}`;
}

/**
 * Verifies a cryptographic session token and returns the authenticated user.
 * Fails closed on forged, tampered, expired, or malformed tokens.
 */
export function verifySessionToken(token: string): AuthenticatedUser | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    return null; // Invalid token structure
  }

  const [, encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  // 1. Verify cryptographic HMAC signature
  const expectedSignature = createSignature(encodedPayload, SESSION_SECRET);
  if (!constantTimeEquals(signature, expectedSignature)) {
    return null; // Forged or tampered token
  }

  // 2. Decode and parse payload
  try {
    const rawPayload = base64UrlDecode(encodedPayload);
    const payload: SessionPayload = JSON.parse(rawPayload);

    // 3. Verify expiry timestamp
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Expired token
    }

    if (!payload.sub || typeof payload.sub !== 'string') {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role || 'USER',
    };
  } catch {
    return null; // Invalid JSON or corrupted payload
  }
}

/**
 * Secure Server-Side Identity Boundary for BreatheWise AI (M3 Dual Adapter).
 * 
 * Supports:
 * 1. Primary Browser Session: HttpOnly cookie (`breathewise_session`) validated against DB `Session` table.
 * 2. API Bearer Token:
 *    - Opaque 64-char hex token: validated against DB `Session` table.
 *    - Signed HMAC token (`v1.<payload>.<sig>`): verified cryptographically.
 * 
 * SECURITY INVARIANTS:
 * - NEVER trusts raw client-supplied headers like `x-authenticated-user-id`.
 * - Forged, expired, or unverified sessions fail closed with `null`.
 */
export async function getSessionUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  // 1. Inspect Session Cookie (Browser flow)
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    const dbSession = await validateDatabaseSession(sessionCookie);
    if (dbSession && dbSession.user) {
      return {
        id: dbSession.user.id,
        email: dbSession.user.email,
        name: dbSession.user.name,
        role: dbSession.user.role,
      };
    }
  }

  // 2. Inspect Authorization Header (API / Test client flow)
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const trimmed = authHeader.trim();
    if (trimmed.startsWith('Bearer ')) {
      const token = trimmed.substring(7).trim();
      if (!token) return null;

      // Case A: Signed HMAC token (Service-to-Service / Test client flow)
      if (token.startsWith('v1.')) {
        const verifiedTokenUser = verifySessionToken(token);
        if (!verifiedTokenUser) return null;

        // Verify active user existence in database to prevent deleted/suspended user access
        const dbUser = await prisma.user.findUnique({
          where: { id: verifiedTokenUser.id },
          select: { id: true, email: true, name: true, role: true },
        });
        if (!dbUser) return null;

        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        };
      }

      // Case B: Opaque DB session token
      const dbSession = await validateDatabaseSession(token);
      if (dbSession && dbSession.user) {
        return {
          id: dbSession.user.id,
          email: dbSession.user.email,
          name: dbSession.user.name,
          role: dbSession.user.role,
        };
      }
    }
  }

  return null;
}

/**
 * Test helper: Generates an Authorization header containing a valid cryptographic token.
 */
export function createTestAuthHeader(
  userId: string,
  email = `${userId}@breathewise.local`,
  role = 'USER'
): string {
  const token = createSessionToken({ id: userId, email, role });
  return `Bearer ${token}`;
}
