import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { validateCsrf, getTrustedOrigins, VERIFIED_PRODUCTION_ORIGINS } from '@/lib/csrf';
import { POST as postLogin } from '@/app/api/auth/login/route';
import { POST as postRegister } from '@/app/api/auth/register/route';
import { POST as postLogout } from '@/app/api/auth/logout/route';
import { GET as getSession } from '@/app/api/auth/session/route';
import { getSessionCookieOptions, SESSION_COOKIE_NAME, createDatabaseSession } from '@/lib/session';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { resetRateLimits } from '@/lib/rate-limiter';

describe('NEXUS Production Authentication Origin Verification Suite', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  // -------------------------------------------------------------
  // 1-5: Origin Whitelist & CSRF Boundary Validation
  // -------------------------------------------------------------
  describe('Origin Boundary & Trusted Whitelist Validation', () => {
    it('1. Primary production origin (https://breathe-wise-ai-seven.vercel.app) is Accepted', () => {
      const primaryOrigin = 'https://breathe-wise-ai-seven.vercel.app';
      const req = new NextRequest(`${primaryOrigin}/api/auth/login`, {
        method: 'POST',
        headers: {
          origin: primaryOrigin,
          'content-type': 'application/json',
        },
      });

      const result = validateCsrf(req);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('2. Main-branch Vercel origin (https://breathe-wise-ai-git-main-akshaysomanis-projects.vercel.app) is Accepted', () => {
      const mainOrigin = 'https://breathe-wise-ai-git-main-akshaysomanis-projects.vercel.app';
      const req = new NextRequest(`${mainOrigin}/api/auth/login`, {
        method: 'POST',
        headers: {
          origin: mainOrigin,
          'content-type': 'application/json',
        },
      });

      const result = validateCsrf(req);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('3. Localhost development origin (http://localhost:3000) is Accepted in non-production', () => {
      const localOrigin = 'http://localhost:3000';
      const req = new NextRequest(`${localOrigin}/api/auth/login`, {
        method: 'POST',
        headers: {
          origin: localOrigin,
          'content-type': 'application/json',
        },
      });

      const result = validateCsrf(req);
      expect(result.valid).toBe(true);
    });

    it('4. Unrelated external origin (https://malicious-attacker.com) is Rejected', () => {
      const req = new NextRequest('https://breathe-wise-ai-seven.vercel.app/api/auth/login', {
        method: 'POST',
        headers: {
          origin: 'https://malicious-attacker.com',
          'content-type': 'application/json',
        },
      });

      const result = validateCsrf(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Untrusted Origin header');
    });

    it('5. Arbitrary Vercel preview origin (https://breathe-wise-ai-pr-999.vercel.app) is Rejected', () => {
      const req = new NextRequest('https://breathe-wise-ai-seven.vercel.app/api/auth/login', {
        method: 'POST',
        headers: {
          origin: 'https://breathe-wise-ai-pr-999.vercel.app',
          'content-type': 'application/json',
        },
      });

      const result = validateCsrf(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Untrusted Origin header');
    });
  });

  // -------------------------------------------------------------
  // 6-9: End-to-End Auth Flows Under Verified Vercel Origins
  // -------------------------------------------------------------
  describe('Authentication Flow Operations Under Verified Origins', () => {
    const verifiedOrigin = 'https://breathe-wise-ai-seven.vercel.app';

    it('6. Login works under primary production origin', async () => {
      const testEmail = `prod_login_${Date.now()}@breathewise.test`;
      const testPassword = 'StrongPassword123!@#';
      const passwordHash = await hashPassword(testPassword);

      await prisma.user.create({
        data: {
          email: testEmail,
          passwordHash,
          name: 'Vercel Prod User',
        },
      });

      const req = new NextRequest(`${verifiedOrigin}/api/auth/login`, {
        method: 'POST',
        headers: {
          origin: verifiedOrigin,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      const res = await postLogin(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe(testEmail);

      // Verify session cookie was set
      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toContain(SESSION_COOKIE_NAME);
    });

    it('7. Registration works under main-branch Vercel origin', async () => {
      const mainOrigin = 'https://breathe-wise-ai-git-main-akshaysomanis-projects.vercel.app';
      const testEmail = `prod_reg_${Date.now()}@breathewise.test`;

      const req = new NextRequest(`${mainOrigin}/api/auth/register`, {
        method: 'POST',
        headers: {
          origin: mainOrigin,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'StrongRegister2026!#',
          name: 'Main Branch User',
        }),
      });

      const res = await postRegister(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe(testEmail);
    });

    it('8. Session retrieval works for authenticated user', async () => {
      const testEmail = `prod_session_${Date.now()}@breathewise.test`;
      const passwordHash = await hashPassword('ValidPass123!@#');

      const user = await prisma.user.create({
        data: {
          email: testEmail,
          passwordHash,
          name: 'Session User',
        },
      });

      const { sessionToken } = await createDatabaseSession(user.id);

      const req = new NextRequest(`${verifiedOrigin}/api/auth/session`, {
        method: 'GET',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });

      const res = await getSession(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.authenticated).toBe(true);
      expect(json.data.user.email).toBe(testEmail);
    });

    it('9. Logout works and clears session cookie', async () => {
      const testEmail = `prod_logout_${Date.now()}@breathewise.test`;
      const passwordHash = await hashPassword('ValidPass123!@#');

      const user = await prisma.user.create({
        data: {
          email: testEmail,
          passwordHash,
        },
      });

      const { sessionToken } = await createDatabaseSession(user.id);

      const req = new NextRequest(`${verifiedOrigin}/api/auth/logout`, {
        method: 'POST',
        headers: {
          origin: verifiedOrigin,
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });

      const res = await postLogout(req);
      expect(res.status).toBe(200);

      // Verify session cookie deletion (maxAge=0 or expires in past)
      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toContain(`${SESSION_COOKIE_NAME}=;`);
      expect(cookieHeader).toContain('Max-Age=0');
    });

    it('10. Secure production cookies are preserved', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        // Test production cookie attributes
        (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
        const prodOptions = getSessionCookieOptions();
        expect(prodOptions.secure).toBe(true);
        expect(prodOptions.httpOnly).toBe(true);
        expect(prodOptions.sameSite).toBe('lax');
        expect(prodOptions.path).toBe('/');

        // Test non-production cookie attributes
        (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
        const devOptions = getSessionCookieOptions();
        expect(devOptions.secure).toBe(false);
        expect(devOptions.httpOnly).toBe(true);
        expect(devOptions.sameSite).toBe('lax');
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = origEnv;
      }
    });
  });
});
