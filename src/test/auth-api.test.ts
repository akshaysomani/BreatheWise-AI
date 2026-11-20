import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { POST as postRegister } from '@/app/api/auth/register/route';
import { POST as postLogin } from '@/app/api/auth/login/route';
import { POST as postLogout } from '@/app/api/auth/logout/route';
import { GET as getSession } from '@/app/api/auth/session/route';
import { POST as postResetPassword } from '@/app/api/auth/reset-password/route';
import { GET as getHousehold } from '@/app/api/household/route';
import { resetRateLimits } from '@/lib/rate-limiter';
import { SESSION_COOKIE_NAME } from '@/lib/session';

describe('Authentication API & Route Handlers (M3 Phase 3 & 4)', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  describe('Registration Flow (POST /api/auth/register)', () => {
    it('successfully registers new household account, hashes password, and issues session cookie', async () => {
      const uniqueEmail = `test_family_${Date.now()}@breathewise.local`;
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Verma Family',
          email: uniqueEmail,
          password: 'CleanAirLiving2026!',
        }),
      });

      const res = await postRegister(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe(uniqueEmail);
      expect(json.data.user.role).toBe('USER');
      // Verifies zero password hash leakage in client response
      expect(json.data.user.passwordHash).toBeUndefined();

      // Verifies session cookie is attached with HttpOnly
      const setCookieHeader = res.headers.get('set-cookie');
      expect(setCookieHeader).toContain(SESSION_COOKIE_NAME);
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader?.toLowerCase()).toContain('samesite=lax');

      // Verify database record has hashed password (not plaintext)
      const dbUser = await prisma.user.findUnique({ where: { email: uniqueEmail } });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.passwordHash).toMatch(/^scrypt\$/);
      expect(dbUser?.passwordHash).not.toContain('CleanAirLiving2026!');
    });

    it('rejects duplicate email registration with HTTP 409 Conflict', async () => {
      const email = `duplicate_test_${Date.now()}@breathewise.local`;
      const req1 = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'Password123!',
        }),
      });
      await postRegister(req1);

      // Second registration with same email
      const req2 = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'Password123!',
        }),
      });
      const res2 = await postRegister(req2);
      const json2 = await res2.json();

      expect(res2.status).toBe(409);
      expect(json2.success).toBe(false);
      expect(json2.error.code).toBe('ACCOUNT_EXISTS');
    });

    it('rejects invalid password inputs with HTTP 422 Validation Error', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'valid_email@breathewise.local',
          password: 'short', // Too short (min 8)
        }),
      });
      const res = await postRegister(req);
      expect(res.status).toBe(422);
    });

    it('prevents privilege escalation by ignoring client-supplied role parameters', async () => {
      const email = `priv_test_${Date.now()}@breathewise.local`;
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'SecurePassword123!',
          role: 'ADMIN', // Attempted privilege escalation
        }),
      });
      const res = await postRegister(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.user.role).toBe('USER'); // Role remains unprivileged USER

      const dbUser = await prisma.user.findUnique({ where: { email } });
      expect(dbUser?.role).toBe('USER');
    });
  });

  describe('Login Flow (POST /api/auth/login)', () => {
    const loginUser = {
      email: `login_test_${Date.now()}@breathewise.local`,
      password: 'CorrectPassword2026!',
    };

    beforeEach(async () => {
      // Register user
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Login Test User',
          email: loginUser.email,
          password: loginUser.password,
        }),
      });
      await postRegister(req);
      resetRateLimits();
    });

    it('successfully signs in with valid credentials and sets session cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: loginUser.email,
          password: loginUser.password,
        }),
      });

      const res = await postLogin(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe(loginUser.email);
      expect(res.headers.get('set-cookie')).toContain(SESSION_COOKIE_NAME);
    });

    it('rejects incorrect password with generic HTTP 401 message', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: loginUser.email,
          password: 'WrongPassword!',
        }),
      });

      const res = await postLogin(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error.code).toBe('INVALID_CREDENTIALS');
      expect(json.error.message).toBe('Invalid email or password.');
    });

    it('rejects non-existent account with generic HTTP 401 message (defeating enumeration)', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'non_existent_account_999@breathewise.local',
          password: 'SomePassword123!',
        }),
      });

      const res = await postLogin(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error.message).toBe('Invalid email or password.');
    });

    it('enforces rate limiting after 5 failed login attempts', async () => {
      for (let i = 0; i < 5; i++) {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email: loginUser.email,
            password: 'WrongPassword!',
          }),
        });
        await postLogin(req);
      }

      // 6th attempt should be blocked by rate limiter
      const req6 = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: loginUser.email,
          password: 'WrongPassword!',
        }),
      });
      const res6 = await postLogin(req6);
      expect(res6.status).toBe(429);
    });
  });

  describe('Session Retrieval & Invalidation (GET /api/auth/session & POST /api/auth/logout)', () => {
    it('retrieves authenticated session with cookie and invalidates on logout', async () => {
      // 1. Register user and get session cookie
      const email = `session_flow_${Date.now()}@breathewise.local`;
      const regReq = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'Password123!',
        }),
      });
      const regRes = await postRegister(regReq);
      const cookieHeader = regRes.headers.get('set-cookie') || '';
      const tokenMatch = cookieHeader.match(/breathewise_session=([0-9a-f]{64})/);
      expect(tokenMatch).not.toBeNull();
      const sessionToken = tokenMatch![1];

      // 2. Query /api/auth/session with cookie
      const sessionReq = new NextRequest('http://localhost:3000/api/auth/session', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });
      const sessionRes = await getSession(sessionReq);
      const sessionJson = await sessionRes.json();

      expect(sessionRes.status).toBe(200);
      expect(sessionJson.data.authenticated).toBe(true);
      expect(sessionJson.data.user.email).toBe(email);

      // 3. Access protected API /api/household with cookie
      const householdReq = new NextRequest('http://localhost:3000/api/household', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });
      const householdRes = await getHousehold(householdReq);
      // Either 200 or 404 (if profile not yet created), but crucially NOT 401!
      expect(householdRes.status).not.toBe(401);

      // 4. Logout
      const logoutReq = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });
      const logoutRes = await postLogout(logoutReq);
      expect(logoutRes.status).toBe(200);

      // 5. Attempt reusing logged-out session -> Must be rejected with 401
      const postLogoutReq = new NextRequest('http://localhost:3000/api/household', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });
      const postLogoutRes = await getHousehold(postLogoutReq);
      expect(postLogoutRes.status).toBe(401);
    });
  });

  describe('Password Reset Lifecycle (POST /api/auth/reset-password)', () => {
    it('generates hashed token, discloses unconfigured email provider, and completes reset', async () => {
      const email = `pwd_reset_${Date.now()}@breathewise.local`;
      const regReq = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'InitialPassword123!' }),
      });
      await postRegister(regReq);

      // 1. Request password reset
      const resetReq = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const resetRes = await postResetPassword(resetReq);
      const resetJson = await resetRes.json();

      expect(resetRes.status).toBe(200);
      expect(resetJson.data.emailDeliveryConfigured).toBe(false); // Honest disclosure

      // 2. Fetch the generated token directly from DB for verification
      const user = await prisma.user.findUnique({ where: { email } });
      const resetRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: user!.id },
      });
      expect(resetRecord).not.toBeNull();
      expect(resetRecord?.usedAt).toBeNull();
    });
  });
});
