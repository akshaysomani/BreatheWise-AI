import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { POST as postRegister } from '@/app/api/auth/register/route';
import { resetRateLimits } from '@/lib/rate-limiter';
import { SESSION_COOKIE_NAME } from '@/lib/session';

describe('NEXUS Registration Diagnosis & Repair Test Suite', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
  });

  // 1. Successful registration
  it('1. Successful registration: creates user, hashes password, returns 201 without leaking password', async () => {
    const email = `reg_success_${Date.now()}@breathewise.test`;
    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        name: 'Clean Air Resident',
        email,
        password: 'ValidPass123!',
      }),
    });

    const res = await postRegister(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe(email);
    expect(json.data.user.role).toBe('USER');
    expect(json.data.user.passwordHash).toBeUndefined();
    expect(json.data.user.password).toBeUndefined();

    // Verify session cookie attached
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain(SESSION_COOKIE_NAME);
    expect(setCookie).toContain('HttpOnly');
  });

  // 2. Duplicate email handling
  it('2. Duplicate email: returns HTTP 409 ACCOUNT_EXISTS when email already registered', async () => {
    const email = `reg_dup_${Date.now()}@breathewise.test`;
    
    // Register first user
    const req1 = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        name: 'First User',
        email,
        password: 'ValidPass123!',
      }),
    });
    const res1 = await postRegister(req1);
    expect(res1.status).toBe(201);

    // Register second user with exact same email
    const req2 = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        name: 'Duplicate Attempt',
        email,
        password: 'ValidPass123!',
      }),
    });
    const res2 = await postRegister(req2);
    const json2 = await res2.json();

    expect(res2.status).toBe(409);
    expect(json2.success).toBe(false);
    expect(json2.error.code).toBe('ACCOUNT_EXISTS');
    expect(json2.error.message).toContain('already exists');
  });

  // 2b. Prisma P2002 race-condition handling
  it('2b. Prisma P2002 race condition: gracefully handles unique constraint violation as 409', async () => {
    const email = `reg_race_${Date.now()}@breathewise.test`;
    
    // Mock prisma.user.create to throw Prisma P2002 unique constraint violation
    vi.spyOn(prisma.user, 'create').mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the constraint: User_email_key', {
        code: 'P2002',
        clientVersion: '6.4.1',
        meta: { target: ['email'] },
      })
    );

    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        name: 'Race Condition User',
        email,
        password: 'ValidPass123!',
      }),
    });

    const res = await postRegister(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('ACCOUNT_EXISTS');
  });

  // 3. Invalid registration input validation
  it('3. Invalid registration input: rejects short or weak passwords with HTTP 422 VALIDATION_ERROR', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'invalid_pass@breathewise.test',
        password: 'weak', // Fails min 8, uppercase, number, symbol
      }),
    });

    const res = await postRegister(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(json.error.details)).toBe(true);
  });

  // 4. Password hashing: never store plaintext
  it('4. Password hashing: verifies password is stored using memory-hard scrypt, never plaintext', async () => {
    const email = `reg_hash_${Date.now()}@breathewise.test`;
    const plaintextPassword = 'SecretP@ssw0rd2026!';

    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        name: 'Security Minded',
        email,
        password: plaintextPassword,
      }),
    });

    const res = await postRegister(req);
    expect(res.status).toBe(201);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    expect(user!.passwordHash).toMatch(/^scrypt\$/);
    expect(user!.passwordHash).not.toContain(plaintextPassword);
  });

  // 5. Database insertion failure / uninitialized table
  it('5. Database table missing (P2021): returns safe 500 without leaking SQL or table metadata', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('The table `public.User` does not exist in the current database.', {
        code: 'P2021',
        clientVersion: '6.4.1',
        meta: { table: 'public.User' },
      })
    );

    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'missing_table@breathewise.test',
        password: 'ValidPass123!',
      }),
    });

    const res = await postRegister(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(json.error.message).toBe('An unexpected error occurred. Please try again later.');
    // Zero internal table name leakage
    expect(JSON.stringify(json)).not.toContain('public.User');
    expect(JSON.stringify(json)).not.toContain('P2021');
  });

  // 6. CSRF / untrusted origin rejection
  it('6. CSRF untrusted origin: rejects requests from unauthorized origins with HTTP 403 CSRF_ERROR', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://malicious-phishing-attacker.com',
      },
      body: JSON.stringify({
        email: 'attack@breathewise.test',
        password: 'ValidPass123!',
      }),
    });

    const res = await postRegister(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('CSRF_ERROR');
  });

  // 7. Safe error responses: never leak internal stack traces or database connection strings
  it('7. Safe error responses: database connection failure (P1001) never leaks connection string or host', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Can't reach database server at `ep-cool-fog-12345.neon.tech`:`5432`", {
        code: 'P1001',
        clientVersion: '6.4.1',
      })
    );

    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'db_down@breathewise.test',
        password: 'ValidPass123!',
      }),
    });

    const res = await postRegister(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(json.error.message).toBe('An unexpected error occurred. Please try again later.');
    // Zero database host or credentials leaked
    expect(JSON.stringify(json)).not.toContain('neon.tech');
    expect(JSON.stringify(json)).not.toContain('P1001');
  });
});
