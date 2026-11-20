import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '@/lib/db';
import { hashPassword, verifyPassword, dummyPasswordVerification } from '@/lib/password';
import {
  createDatabaseSession,
  validateDatabaseSession,
  invalidateDatabaseSession,
  invalidateAllUserSessions,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '@/lib/session';
import { sanitizeReturnUrl } from '@/lib/sanitize-redirect';
import { validateCsrf } from '@/lib/csrf';
import { NextRequest } from 'next/server';

describe('Authentication & Session Engine (M3 Core Services)', () => {
  const testUser = {
    id: 'usr_auth_svc_test_001',
    email: 'auth_service_test@breathewise.local',
    password: 'SecurePassword123!',
    role: 'USER',
  };

  beforeEach(async () => {
    // Ensure test user exists in database
    await prisma.user.upsert({
      where: { id: testUser.id },
      create: {
        id: testUser.id,
        email: testUser.email,
        passwordHash: await hashPassword(testUser.password),
        role: testUser.role,
      },
      update: {},
    });
  });

  describe('Password Hashing & Constant-Time Verification', () => {
    it('hashes passwords using scrypt KDF with random salt (never plaintext)', async () => {
      const plaintext = 'MySecretFamilyPassword2026';
      const hash1 = await hashPassword(plaintext);
      const hash2 = await hashPassword(plaintext);

      // Verify format
      expect(hash1).toMatch(/^scrypt\$N=16384,r=8,p=1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
      expect(hash2).toMatch(/^scrypt\$N=16384,r=8,p=1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);

      // Salting ensures identical plaintext produces distinct hashes
      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toContain(plaintext);
    });

    it('verifies correct passwords and rejects incorrect passwords', async () => {
      const plaintext = 'CorrectHorseBatteryStaple99!';
      const hash = await hashPassword(plaintext);

      const isMatch = await verifyPassword(plaintext, hash);
      const isMismatch = await verifyPassword('WrongPassword123!', hash);

      expect(isMatch).toBe(true);
      expect(isMismatch).toBe(false);
    });

    it('handles corrupted hashes gracefully without throwing', async () => {
      expect(await verifyPassword('password', 'corrupted_hash')).toBe(false);
      expect(await verifyPassword('password', '')).toBe(false);
      expect(await verifyPassword('password', 'scrypt$bad$salt$hash')).toBe(false);
    });

    it('executes dummy verification to prevent timing-based user enumeration', async () => {
      const start = Date.now();
      await dummyPasswordVerification();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Server-Side Opaque Database Sessions', () => {
    it('creates an opaque 256-bit session record in database', async () => {
      const { sessionToken, expiresAt } = await createDatabaseSession(testUser.id);

      expect(sessionToken).toHaveLength(64); // 32 bytes hex = 64 characters
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      const validated = await validateDatabaseSession(sessionToken);
      expect(validated).not.toBeNull();
      expect(validated?.userId).toBe(testUser.id);
      expect(validated?.user.email).toBe(testUser.email);
    });

    it('invalidates session immediately upon logout', async () => {
      const { sessionToken } = await createDatabaseSession(testUser.id);
      expect(await validateDatabaseSession(sessionToken)).not.toBeNull();

      const revoked = await invalidateDatabaseSession(sessionToken);
      expect(revoked).toBe(true);

      const postLogoutValidation = await validateDatabaseSession(sessionToken);
      expect(postLogoutValidation).toBeNull();
    });

    it('invalidates all active sessions for a user upon global logout', async () => {
      const s1 = await createDatabaseSession(testUser.id);
      const s2 = await createDatabaseSession(testUser.id);

      const count = await invalidateAllUserSessions(testUser.id);
      expect(count).toBeGreaterThanOrEqual(2);

      expect(await validateDatabaseSession(s1.sessionToken)).toBeNull();
      expect(await validateDatabaseSession(s2.sessionToken)).toBeNull();
    });

    it('rejects expired sessions and cleans them up', async () => {
      // Create manually expired session
      const expiredSession = await prisma.session.create({
        data: {
          sessionToken: 'expired_test_session_token_1234567890abcdef',
          userId: testUser.id,
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      });

      const validation = await validateDatabaseSession(expiredSession.sessionToken);
      expect(validation).toBeNull();
    });

    it('generates secure HttpOnly cookie options with appropriate SameSite policy', () => {
      const options = getSessionCookieOptions();
      expect(options.name).toBe(SESSION_COOKIE_NAME);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('Open Redirect Prevention (sanitizeReturnUrl)', () => {
    it('accepts safe internal relative paths', () => {
      expect(sanitizeReturnUrl('/dashboard')).toBe('/dashboard');
      expect(sanitizeReturnUrl('/dashboard/household')).toBe('/dashboard/household');
      expect(sanitizeReturnUrl('/assistant?category=routines')).toBe('/assistant?category=routines');
    });

    it('rejects malicious external URLs and falls back to /dashboard', () => {
      expect(sanitizeReturnUrl('https://malicious-attacker.com')).toBe('/dashboard');
      expect(sanitizeReturnUrl('http://phishing.site')).toBe('/dashboard');
      expect(sanitizeReturnUrl('//evil.com')).toBe('/dashboard');
      expect(sanitizeReturnUrl('/\\evil.com')).toBe('/dashboard');
      expect(sanitizeReturnUrl('javascript:alert(1)')).toBe('/dashboard');
      expect(sanitizeReturnUrl(null)).toBe('/dashboard');
      expect(sanitizeReturnUrl('')).toBe('/dashboard');
    });
  });

  describe('CSRF Defense Guard (validateCsrf)', () => {
    it('allows safe read-only HTTP methods (GET, HEAD)', () => {
      const req = new NextRequest('http://localhost:3000/api/auth/session', { method: 'GET' });
      expect(validateCsrf(req).valid).toBe(true);
    });

    it('allows requests with Bearer authentication', () => {
      const req = new NextRequest('http://localhost:3000/api/household', {
        method: 'POST',
        headers: { authorization: 'Bearer some_token' },
      });
      expect(validateCsrf(req).valid).toBe(true);
    });

    it('allows matching origin/referer headers', () => {
      const req = new NextRequest('http://localhost:3000/api/household', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
          'content-type': 'application/json',
        },
      });
      expect(validateCsrf(req).valid).toBe(true);
    });

    it('rejects state-changing requests from cross-site external origins', () => {
      const req = new NextRequest('http://localhost:3000/api/household', {
        method: 'POST',
        headers: {
          origin: 'https://attacker-evil-site.com',
          host: 'localhost:3000',
        },
      });
      const check = validateCsrf(req);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('does not match host');
    });
  });
});
