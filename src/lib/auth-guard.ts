import { NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import {
  createDatabaseSession,
  validateDatabaseSession,
  SESSION_COOKIE_NAME,
} from './session';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string | null;
}

export interface SessionPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'local-dev-session-secret-breathewise-ai-32-chars-minimum';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function createSignature(data: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Pure cryptographic HMAC token signer.
 * Deprecated for authorization in M3.1.1: Stateless tokens lack immediate revocation on logout.
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
 * Pure cryptographic HMAC token verifier.
 * Returns null if token is malformed, expired, or tampered.
 */
export function verifySessionToken(token: string): AuthenticatedUser | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    return null;
  }

  const [, encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  const expectedSignature = createSignature(encodedPayload, SESSION_SECRET);
  if (!constantTimeEquals(signature, expectedSignature)) {
    return null;
  }

  try {
    const rawPayload = base64UrlDecode(encodedPayload);
    const payload: SessionPayload = JSON.parse(rawPayload);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
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
    return null;
  }
}

/**
 * Secure Server-Side Identity Boundary for BreatheWise AI (M3.1.1 Canonical Architecture).
 * 
 * ARCHITECTURAL SPECIFICATION:
 * - Unified on database-backed opaque 256-bit session tokens (`Session` model in Prisma/SQLite).
 * - Supported Credentials:
 *   1. Web Browser: `breathewise_session` HttpOnly, SameSite=Lax cookie.
 *   2. API Client / CLI: `Authorization: Bearer <sessionToken>` header.
 * - SECURITY INVARIANTS:
 *   - Stateless, unrevocable bearer tokens (`v1.<payload>.<sig>`) are retired and rejected with 401.
 *   - Instant Revocation: Calling `POST /api/auth/logout` deletes the session from the database,
 *     ensuring immediate revocation across both browser and Bearer API requests.
 *   - Immediate Credential Invalidation: Password reset deletes all user sessions atomically.
 *   - User Lifecycle & Cascades: If a user is deleted, their sessions are cascade-deleted immediately.
 *   - Real-Time Role Enforcement: User role is read from the live database record on every request.
 *   - Zero Client Identity Trust: Never inspects client-supplied identity headers (`x-authenticated-user-id`).
 */
export async function getSessionUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  let sessionToken: string | null = null;

  // 1. Inspect Session Cookie (Browser flow)
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieValue) {
    sessionToken = cookieValue.trim();
  }

  // 2. Inspect Authorization Header (API / CLI / Test client flow)
  if (!sessionToken) {
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const trimmed = authHeader.trim();
      if (trimmed.startsWith('Bearer ')) {
        sessionToken = trimmed.substring(7).trim();
      }
    }
  }

  if (!sessionToken) {
    return null; // Fail closed on missing credentials
  }

  // 3. Reject deprecated stateless tokens (fail closed)
  if (sessionToken.startsWith('v1.')) {
    return null;
  }

  // 4. Validate opaque session token against database Session table
  const dbSession = await validateDatabaseSession(sessionToken);
  if (!dbSession || !dbSession.user) {
    return null; // Expired, revoked, or non-existent session
  }

  return {
    id: dbSession.user.id,
    email: dbSession.user.email,
    name: dbSession.user.name,
    role: dbSession.user.role,
  };
}

/**
 * Generates an Authorization header containing a valid database-backed session token.
 * Canonical helper for tests and automated clients.
 */
export async function createTestAuthHeader(userId: string): Promise<string> {
  const { sessionToken } = await createDatabaseSession(userId);
  return `Bearer ${sessionToken}`;
}
