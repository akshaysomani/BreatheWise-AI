import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { POST as postRegister } from '@/app/api/auth/register/route';
import { POST as postLogin } from '@/app/api/auth/login/route';
import { POST as postLogout } from '@/app/api/auth/logout/route';
import { POST as postResetPassword } from '@/app/api/auth/reset-password/route';
import { GET as getHousehold } from '@/app/api/household/route';
import { validateCsrf } from '@/lib/csrf';
import {
  createSessionToken,
  verifySessionToken,
  getSessionUser,
} from '@/lib/auth-guard';
import {
  createDatabaseSession,
  validateDatabaseSession,
  invalidateDatabaseSession,
  SESSION_COOKIE_NAME,
} from '@/lib/session';
import { logger } from '@/lib/logger';
import { hashPassword } from '@/lib/password';

/**
 * BreatheWise AI — Module M3.1 Security Hardening Regression Suite
 * Covers all 26 required security assertions.
 */
describe('M3.1 Security Hardening & Adversarial Regression Suite', () => {
  const testRunId = Date.now();

  // Test User Helper
  async function createVerifiedUser(prefix: string) {
    const email = `${prefix}_${testRunId}_${Math.random().toString(36).substring(7)}@breathewise.test`;
    const password = 'StrongPassword123!';
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: `${prefix} User`,
        role: 'USER',
      },
    });
    return { user, password, email };
  }

  // -------------------------------------------------------------
  // Group A: Password Reset Security (Tests 1 - 8)
  // -------------------------------------------------------------
  describe('Password Reset Security & Zero Token Exposure', () => {
    it('1. Reset token never logged to server logs', async () => {
      const { email } = await createVerifiedUser('sec_log_test');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const req = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      await postResetPassword(req);

      // Verify none of the log calls contain the raw 64-char token or sensitive secret
      const loggedOutput = logSpy.mock.calls.map((call) => JSON.stringify(call)).join(' ');
      expect(loggedOutput).not.toMatch(/[0-9a-f]{64}/);
      logSpy.mockRestore();
    });

    it('2. Reset token never returned in production API response', async () => {
      const { email } = await createVerifiedUser('sec_resp_test');
      const req = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const res = await postResetPassword(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.rawToken).toBeUndefined();
      expect(json.data.token).toBeUndefined();
      expect(json.data.tokenHash).toBeUndefined();
      expect(json.data.resetToken).toBeUndefined();
    });

    it('3. Reset token hash stored instead of raw token in database', async () => {
      const { user, email } = await createVerifiedUser('sec_db_test');
      const req = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      await postResetPassword(req);

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id },
      });
      expect(tokenRecord).not.toBeNull();
      // SHA-256 is 64 hex characters
      expect(tokenRecord!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('4. Reset token expiration is strictly enforced', async () => {
      const { user } = await createVerifiedUser('sec_exp_test');
      const rawToken = 'test_exp_' + Date.now() + '_' + crypto.randomBytes(8).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Create an already-expired token in database
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() - 60_000), // 1 minute in the past
        },
      });

      const confirmReq = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.99.4.1' },
        body: JSON.stringify({
          token: rawToken,
          newPassword: 'NewValidPassword123!',
        }),
      });
      const res = await postResetPassword(confirmReq);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('INVALID_TOKEN');
    });

    it('5. Reset token single-use enforcement prevents replay', async () => {
      const { user } = await createVerifiedUser('sec_single_use');
      const rawToken = 'test_single_' + Date.now() + '_' + crypto.randomBytes(8).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });

      // 1st use -> Succeeded
      const req1 = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.99.5.1' },
        body: JSON.stringify({
          token: rawToken,
          newPassword: 'NewValidPassword123!',
        }),
      });
      const res1 = await postResetPassword(req1);
      expect(res1.status).toBe(200);

      // 2nd use -> Must fail (single-use enforced)
      const req2 = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.99.5.2' },
        body: JSON.stringify({
          token: rawToken,
          newPassword: 'AnotherPassword123!',
        }),
      });
      const res2 = await postResetPassword(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.error.code).toBe('INVALID_TOKEN');
    });

    it('6. Concurrent reset attempts handle race conditions gracefully', async () => {
      const { user } = await createVerifiedUser('sec_concurrent');
      const rawToken = 'test_concur_' + Date.now() + '_' + crypto.randomBytes(8).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });

      // Submit 2 concurrent requests with the same token
      const reqA = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.99.6.1' },
        body: JSON.stringify({ token: rawToken, newPassword: 'PasswordA123!' }),
      });
      const reqB = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.99.6.2' },
        body: JSON.stringify({ token: rawToken, newPassword: 'PasswordB123!' }),
      });

      const [resA, resB] = await Promise.all([postResetPassword(reqA), postResetPassword(reqB)]);
      const statuses = [resA.status, resB.status];
      // Exactly one must succeed (200) and the other must be rejected (400)
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);
    });

    it('7. Session invalidation after successful password reset', async () => {
      const { user } = await createVerifiedUser('sec_session_inval');
      // Create active session in database
      const { sessionToken } = await createDatabaseSession(user.id);
      expect(await validateDatabaseSession(sessionToken)).not.toBeNull();

      const rawToken = 'test_inval_' + Date.now() + '_' + crypto.randomBytes(8).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });

      const resetReq = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.99.7.1' },
        body: JSON.stringify({ token: rawToken, newPassword: 'NewPassword999!' }),
      });
      const res = await postResetPassword(resetReq);
      expect(res.status).toBe(200);

      // Verify previously active session is now deleted from database
      const checkSession = await validateDatabaseSession(sessionToken);
      expect(checkSession).toBeNull();
    });

    it('8. Generic account-reset response returns identical message for non-existent users', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.99.8.1' },
        body: JSON.stringify({ email: 'absolutely_non_existent_user_999@test.com' }),
      });
      const res = await postResetPassword(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.message).toContain('If an account exists with this email address');
    });
  });

  // -------------------------------------------------------------
  // Group B: CSRF & Trusted Origin (Tests 9 - 15)
  // -------------------------------------------------------------
  describe('CSRF & Trusted Origin Protection', () => {
    it('9. Trusted origin validation allows configured origin', () => {
      const req = new NextRequest('http://localhost:3000/api/household', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
        },
      });
      expect(validateCsrf(req).valid).toBe(true);
    });

    it('10. Host-header manipulation does not trick CSRF validation', () => {
      const req = new NextRequest('http://localhost:3000/api/household', {
        method: 'POST',
        headers: {
          // Attacker sends matching Host and Origin to simulate forged Host header
          host: 'attacker-spoofed-host.com',
          origin: 'http://attacker-spoofed-host.com',
          'content-type': 'application/json',
        },
      });
      const check = validateCsrf(req);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('Untrusted Origin header');
    });

    it('11. Forwarded-host manipulation does not bypass origin validation', () => {
      const req = new NextRequest('http://localhost:3000/api/household', {
        method: 'POST',
        headers: {
          'x-forwarded-host': 'attacker-spoofed-host.com',
          origin: 'http://attacker-spoofed-host.com',
          'content-type': 'application/json',
        },
      });
      const check = validateCsrf(req);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('Untrusted Origin header');
    });

    it('12. Cross-origin POST rejection', () => {
      const req = new NextRequest('http://localhost:3000/api/household', {
        method: 'POST',
        headers: {
          origin: 'https://malicious-phishing-site.org',
          'content-type': 'application/json',
        },
      });
      expect(validateCsrf(req).valid).toBe(false);
    });

    it('13. Cross-origin PUT rejection', () => {
      const req = new NextRequest('http://localhost:3000/api/household', {
        method: 'PUT',
        headers: {
          origin: 'https://malicious-phishing-site.org',
          'content-type': 'application/json',
        },
      });
      expect(validateCsrf(req).valid).toBe(false);
    });

    it('14. Cross-origin DELETE rejection', () => {
      const req = new NextRequest('http://localhost:3000/api/routines', {
        method: 'DELETE',
        headers: {
          origin: 'https://malicious-phishing-site.org',
          'content-type': 'application/json',
        },
      });
      expect(validateCsrf(req).valid).toBe(false);
    });

    it('15. Missing Origin policy rejects cookie-authenticated mutation without referer', () => {
      const req = new NextRequest('http://localhost:3000/api/household', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=some_fake_session_token_1234567890123456`,
          'content-type': 'application/json',
        },
      });
      const check = validateCsrf(req);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('Missing both Origin and Referer');
    });
  });

  // -------------------------------------------------------------
  // Group C: Bearer Tokens & Session Integrity (Tests 16 - 20)
  // -------------------------------------------------------------
  describe('Bearer & Session Cryptographic Integrity', () => {
    it('16. Invalid bearer-token signature fails verification', () => {
      const user = { id: 'usr_sig_test', email: 'sig@test.com', role: 'USER' };
      const validToken = createSessionToken(user);
      // Tamper signature part
      const tamperedToken = validToken.substring(0, validToken.length - 6) + 'xxxxxx';
      expect(verifySessionToken(tamperedToken)).toBeNull();
    });

    it('17. Expired bearer token is rejected', () => {
      const user = { id: 'usr_exp_test', email: 'exp@test.com', role: 'USER' };
      // Expire immediately with negative duration
      const expiredToken = createSessionToken(user, -10);
      expect(verifySessionToken(expiredToken)).toBeNull();
    });

    it('18. Revoked database session is rejected', async () => {
      const { user } = await createVerifiedUser('sec_revoke_test');
      const { sessionToken } = await createDatabaseSession(user.id);

      // Invalidate
      await invalidateDatabaseSession(sessionToken);

      // Validate
      const session = await validateDatabaseSession(sessionToken);
      expect(session).toBeNull();
    });

    it('19. Logout invalidation deletes database session', async () => {
      const { user } = await createVerifiedUser('sec_logout_test');
      const { sessionToken } = await createDatabaseSession(user.id);

      const logoutReq = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });
      const res = await postLogout(logoutReq);
      expect(res.status).toBe(200);

      // Verify database record is deleted
      const check = await validateDatabaseSession(sessionToken);
      expect(check).toBeNull();
    });

    it('20. Session fixation prevention rotates session on login', async () => {
      const { user, password, email } = await createVerifiedUser('sec_fixation_test');
      // Pre-existing session
      const { sessionToken: oldSessionToken } = await createDatabaseSession(user.id);

      // Login providing old session cookie
      const loginReq = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${oldSessionToken}`,
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const loginRes = await postLogin(loginReq);
      expect(loginRes.status).toBe(200);

      // Old session must be deleted
      const checkOld = await validateDatabaseSession(oldSessionToken);
      expect(checkOld).toBeNull();

      // New cookie must be set and different from old token
      const cookieHeader = loginRes.headers.get('set-cookie') || '';
      expect(cookieHeader).not.toContain(oldSessionToken);
    });
  });

  // -------------------------------------------------------------
  // Group D: Rate Limiting & Isolation (Tests 21 - 26)
  // -------------------------------------------------------------
  describe('Rate Limiting, Authorization & Data Isolation', () => {
    it('21. Login rate limiting blocks after threshold', async () => {
      const testIp = `192.168.10.${Math.floor(Math.random() * 200 + 1)}`;
      for (let i = 0; i < 5; i++) {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'x-forwarded-for': testIp,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ email: 'bad@test.com', password: 'WrongPassword!' }),
        });
        await postLogin(req);
      }

      // 6th attempt must be throttled
      const req6 = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'x-forwarded-for': testIp,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email: 'bad@test.com', password: 'WrongPassword!' }),
      });
      const res6 = await postLogin(req6);
      expect(res6.status).toBe(429);
    });

    it('22. Registration rate limiting blocks abusive registrations', async () => {
      const testIp = `192.168.20.${Math.floor(Math.random() * 200 + 1)}`;
      for (let i = 0; i < 10; i++) {
        const req = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: {
            'x-forwarded-for': testIp,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            email: `bulk_${i}_${testRunId}@test.com`,
            password: 'ValidPassword123!',
          }),
        });
        await postRegister(req);
      }

      // 11th registration attempt
      const req11 = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'x-forwarded-for': testIp,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: `bulk_11_${testRunId}@test.com`,
          password: 'ValidPassword123!',
        }),
      });
      const res11 = await postRegister(req11);
      expect(res11.status).toBe(429);
    });

    it('23. Reset request rate limiting blocks rapid attempts', async () => {
      const testIp = `192.168.30.${Math.floor(Math.random() * 200 + 1)}`;
      for (let i = 0; i < 3; i++) {
        const req = new NextRequest('http://localhost:3000/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'x-forwarded-for': testIp,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ email: `rapid_reset_${i}@test.com` }),
        });
        await postResetPassword(req);
      }

      // 4th reset request attempt
      const req4 = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'x-forwarded-for': testIp,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email: `rapid_reset_4@test.com` }),
      });
      const res4 = await postResetPassword(req4);
      expect(res4.status).toBe(429);
    });

    it('24. Cross-user resource isolation prevents IDOR on private household', async () => {
      const { user: userA } = await createVerifiedUser('user_a_idor');
      const { user: userB } = await createVerifiedUser('user_b_idor');

      // User A creates a household profile
      await prisma.householdProfile.create({
        data: {
          userId: userA.id,
          city: 'New Delhi',
          latitude: 28.6139,
          longitude: 77.209,
          homeType: 'APARTMENT',
          floorAreaSqFt: 850.0,
        },
      });

      // User B queries household with User B's session
      const { sessionToken: sessionB } = await createDatabaseSession(userB.id);
      const reqB = new NextRequest('http://localhost:3000/api/household', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionB}`,
        },
      });
      const resB = await getHousehold(reqB);
      const jsonB = await resB.json();

      // User B must receive 404 (no household found for user B) and never see User A's data
      expect(resB.status).toBe(404);
      expect(jsonB.error.message).toContain('Household profile not found');
    });

    it('25. Privilege escalation prevention forces role to USER on registration', async () => {
      const email = `escalate_${testRunId}@breathewise.test`;
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'Password123!',
          role: 'ADMIN', // Attacker attempt to self-elevate
        }),
      });
      const res = await postRegister(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.user.role).toBe('USER');

      const dbUser = await prisma.user.findUnique({ where: { email } });
      expect(dbUser?.role).toBe('USER');
    });

    it('26. Sensitive logger redaction automatically scrubs tokens and passwords', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.info('Audit event with sensitive credentials', {
        password: 'PlainTextPassword123!',
        token: 'secret_session_token_12345',
        rawToken: 'raw_reset_token_67890',
        hasAsthma: true,
      });

      expect(logSpy).toHaveBeenCalled();
      const lastCall = JSON.parse(logSpy.mock.calls[logSpy.mock.calls.length - 1][0]);
      expect(lastCall.context.password).toBe('[REDACTED]');
      expect(lastCall.context.token).toBe('[REDACTED]');
      expect(lastCall.context.rawToken).toBe('[REDACTED]');
      expect(lastCall.context.hasAsthma).toBe('[REDACTED]');

      logSpy.mockRestore();
    });
  });
});
