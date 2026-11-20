import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { GET as getHousehold, POST as postHousehold } from '@/app/api/household/route';
import { GET as getRoutines, POST as postRoutines } from '@/app/api/routines/route';
import { GET as getImpact, POST as postImpact } from '@/app/api/impact/route';
import { GET as getRecommendations, POST as postRecommendations } from '@/app/api/recommendations/route';
import { GET as getCommunityReports } from '@/app/api/community/reports/route';
import { createSessionToken, createTestAuthHeader, verifySessionToken } from '@/lib/auth-guard';
import { checkRateLimit, resetRateLimits, getClientIp } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { routineRepository } from '@/repositories/routine.repository';

describe('M2.1 Security Remediation & Independent Verification Suite', () => {
  const userA = { id: 'usr_sec_audit_a_001', email: 'userA@breathewise.local', role: 'USER' };
  const userB = { id: 'usr_sec_audit_b_002', email: 'userB@breathewise.local', role: 'USER' };

  beforeEach(async () => {
    resetRateLimits();

    // Ensure test users exist in database
    await prisma.user.upsert({
      where: { id: userA.id },
      create: {
        id: userA.id,
        email: userA.email,
        passwordHash: 'argon2id_mock_hash_for_test',
        role: userA.role,
      },
      update: {},
    });

    await prisma.user.upsert({
      where: { id: userB.id },
      create: {
        id: userB.id,
        email: userB.email,
        passwordHash: 'argon2id_mock_hash_for_test',
        role: userB.role,
      },
      update: {},
    });
  });

  // --------------------------------------------------------------------------
  // 1. Forged x-authenticated-user-id Header Rejection
  // --------------------------------------------------------------------------
  it('1. strictly rejects client-supplied x-authenticated-user-id header without cryptographic session (HTTP 401)', async () => {
    const req = new NextRequest('http://localhost:3000/api/household', {
      headers: {
        'x-authenticated-user-id': userA.id, // Forged client header
      },
    });

    const res = await getHousehold(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  // --------------------------------------------------------------------------
  // 2. Cross-User Household Access (IDOR Prevention)
  // --------------------------------------------------------------------------
  it("2. prevents cross-user access: User B cannot access User A's private household profile", async () => {
    // Setup User A's profile
    const tokenA = await createTestAuthHeader(userA.id);
    const createReqA = new NextRequest('http://localhost:3000/api/household', {
      method: 'POST',
      headers: {
        authorization: tokenA,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        city: 'Delhi',
        latitude: 28.61,
        longitude: 77.21,
        homeType: 'APARTMENT',
        floorAreaSqFt: 1200,
        ceilingHeightFt: 9.0,
        hasHEPAFilter: true,
        hepaCADR: 250,
        windowSealing: 'MODERATE',
        primaryCookingFuel: 'LPG_GAS',
        members: [
          {
            nameOrAlias: 'Child A',
            ageGroup: 'CHILD',
            hasAsthma: true,
            hasHeartCondition: false,
            isPregnant: false,
            outdoorHoursPerDay: 1.5,
          },
        ],
      }),
    });
    const createResA = await postHousehold(createReqA);
    expect(createResA.status).toBe(201);

    // User B requests their own profile; should return 404 (not found) and NEVER User A's profile
    const tokenB = await createTestAuthHeader(userB.id);
    const getReqB = new NextRequest('http://localhost:3000/api/household', {
      headers: { authorization: tokenB },
    });
    const getResB = await getHousehold(getReqB);
    const jsonB = await getResB.json();

    expect(getResB.status).toBe(404);
    expect(jsonB.error.code).toBe('NOT_FOUND');
  });

  // --------------------------------------------------------------------------
  // 3. Cross-User Impact Access
  // --------------------------------------------------------------------------
  it("3. isolates personal impact records: User B cannot view User A's impact logs", async () => {
    const tokenA = await createTestAuthHeader(userA.id);
    const createImpactReqA = new NextRequest('http://localhost:3000/api/impact', {
      method: 'POST',
      headers: {
        authorization: tokenA,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        actionType: 'COMMUTE_SHIFT',
        title: 'User A Metro Switch',
        co2AvoidedKg: 3.42,
        pm25AvoidedGrams: 0.35,
        distanceShiftedKm: 25.0,
        calculationFormula: '25 km * 0.136 kg/km',
        uncertaintyMargin: 0.15,
      }),
    });
    const createResA = await postImpact(createImpactReqA);
    expect(createResA.status).toBe(201);

    // User B fetches their logs
    const tokenB = await createTestAuthHeader(userB.id);
    const getImpactReqB = new NextRequest('http://localhost:3000/api/impact', {
      headers: { authorization: tokenB },
    });
    const getResB = await getImpact(getImpactReqB);
    const jsonB = await getResB.json();

    expect(getResB.status).toBe(200);
    // User B should have 0 logs (no cross-user leakage)
    const logsB = jsonB.data.logs;
    const hasUserALog = logsB.some((l: any) => l.title === 'User A Metro Switch');
    expect(hasUserALog).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 4. Cross-User Routine Access
  // --------------------------------------------------------------------------
  it("4. isolates commute routines: User B cannot access User A's private commute routes", async () => {
    const tokenA = await createTestAuthHeader(userA.id);
    const createRoutineReqA = new NextRequest('http://localhost:3000/api/routines', {
      method: 'POST',
      headers: {
        authorization: tokenA,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Secret Route of User A',
        origin: 'User A Secret Residence',
        destination: 'User A Office',
        distanceKm: 15.0,
        departureTime: '08:45',
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'METRO',
      }),
    });
    const resA = await postRoutines(createRoutineReqA);
    expect(resA.status).toBe(201);

    // User B queries routines
    const tokenB = await createTestAuthHeader(userB.id);
    const getRoutinesReqB = new NextRequest('http://localhost:3000/api/routines', {
      headers: { authorization: tokenB },
    });
    const resB = await getRoutines(getRoutinesReqB);
    const jsonB = await resB.json();

    expect(resB.status).toBe(200);
    const hasSecretRoute = jsonB.data.routines.some((r: any) => r.title === 'Secret Route of User A');
    expect(hasSecretRoute).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 5. Cross-User Recommendation Access
  // --------------------------------------------------------------------------
  it("5. protects personalized recommendations: User B cannot read User A's recommendations", async () => {
    const tokenA = await createTestAuthHeader(userA.id);
    const recReqA = new NextRequest('http://localhost:3000/api/recommendations', {
      method: 'POST',
      headers: {
        authorization: tokenA,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        category: 'DAILY_ROUTINE',
        recommendedAction: 'Child Asthmatic Smog Protocol for User A',
        scientificReason: 'High vulnerability tier requires PM2.5 < 10 µg/m³',
        expectedBenefit: 'Reduces bronchospasm risk by 75%',
        assumptionsAndUncertainty: 'Based on baseline PEF measurements',
        implementationSteps: ['Close windows', 'Run HEPA on Turbo'],
        disclaimer: 'Environmental advice only',
      }),
    });
    const resA = await postRecommendations(recReqA);
    expect(resA.status).toBe(201);

    // User B queries recommendations
    const tokenB = await createTestAuthHeader(userB.id);
    const getRecReqB = new NextRequest('http://localhost:3000/api/recommendations', {
      headers: { authorization: tokenB },
    });
    const resB = await getRecommendations(getRecReqB);
    const jsonB = await resB.json();

    expect(resB.status).toBe(200);
    const hasUserARec = jsonB.data.records.some(
      (r: any) => r.recommendedAction === 'Child Asthmatic Smog Protocol for User A'
    );
    expect(hasUserARec).toBe(false);
  });

  // --------------------------------------------------------------------------
  // 6. Missing Sessions Fail Closed
  // --------------------------------------------------------------------------
  it('6. fails closed on missing authorization credentials (HTTP 401)', async () => {
    const req = new NextRequest('http://localhost:3000/api/household');
    const res = await getHousehold(req);
    expect(res.status).toBe(401);
  });

  // --------------------------------------------------------------------------
  // 7. Malformed & Tampered Authorization Credentials
  // --------------------------------------------------------------------------
  it('7. rejects forged HMAC signatures and tampered tokens (HTTP 401)', async () => {
    // Generate valid token for User B, then tamper with payload to claim User A's ID
    const validTokenB = createSessionToken(userB);
    const parts = validTokenB.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        sub: userA.id, // Forged claim
        email: userA.email,
        role: 'ADMIN',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    )
      .toString('base64')
      .replace(/=/g, '');

    // Reassemble with original signature -> Signature mismatch!
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const verified = verifySessionToken(tamperedToken);
    expect(verified).toBeNull();

    const req = new NextRequest('http://localhost:3000/api/household', {
      headers: { authorization: `Bearer ${tamperedToken}` },
    });
    const res = await getHousehold(req);
    expect(res.status).toBe(401);
  });

  // --------------------------------------------------------------------------
  // 8. Spoofed Forwarded IP Headers
  // --------------------------------------------------------------------------
  it('8. sanitizes and handles spoofed forwarded IP headers safely', () => {
    const reqWithGarbage = new NextRequest('http://localhost:3000/api/health', {
      headers: {
        'x-forwarded-for': 'invalid_ip; DROP TABLE users; --, 127.0.0.1',
      },
    });
    const extractedIp = getClientIp(reqWithGarbage);
    expect(extractedIp).toBe('127.0.0.1'); // Safely fell back to safe localhost

    const reqWithValidIps = new NextRequest('http://localhost:3000/api/health', {
      headers: {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
      },
    });
    const parsedIp = getClientIp(reqWithValidIps);
    expect(parsedIp).toBe('203.0.113.195');
  });

  // --------------------------------------------------------------------------
  // 9. Rate Limit Threshold Enforcement
  // --------------------------------------------------------------------------
  it('9. enforces rate-limit threshold and returns HTTP 429 when quota exceeded', () => {
    const testKey = 'audit_rate_limit_probe_user';
    const limit = 5;

    for (let i = 0; i < limit; i++) {
      const allowedCheck = checkRateLimit(testKey, limit, 60_000);
      expect(allowedCheck.allowed).toBe(true);
    }

    const blockedCheck = checkRateLimit(testKey, limit, 60_000);
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.remaining).toBe(0);
    expect(blockedCheck.resetMs).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // 10. Sensitive Health Data Redaction & Zero Password Leakage
  // --------------------------------------------------------------------------
  it('10. redacts sensitive health conditions, asthma diagnosis, and credentials in logger', () => {
    let capturedLog = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      capturedLog = msg;
    };

    try {
      logger.info('Auditing medical sensitivity logging', {
        userId: 'usr_sec_123',
        hasAsthma: true,
        hasHeartCondition: true,
        isPregnant: true,
        password: 'SamplePassword',
        gemini_api_key: 'AIzaSy12345',
      });

      const parsed = JSON.parse(capturedLog);
      expect(parsed.context.hasAsthma).toBe('[REDACTED]');
      expect(parsed.context.hasHeartCondition).toBe('[REDACTED]');
      expect(parsed.context.isPregnant).toBe('[REDACTED]');
      expect(parsed.context.password).toBe('[REDACTED]');
      expect(parsed.context.gemini_api_key).toBe('[REDACTED]');
      expect(parsed.context.userId).toBe('usr_sec_123');
    } finally {
      console.log = originalLog;
    }
  });

  // --------------------------------------------------------------------------
  // 11. Community Privacy Exposure
  // --------------------------------------------------------------------------
  it('11. verifies public community reports contain NO member medical data and use fuzzed coordinates', async () => {
    const req = new NextRequest('http://localhost:3000/api/community/reports?lat=28.61&lon=77.20');
    const res = await getCommunityReports(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.reports).toBeDefined();

    for (const report of json.data.reports) {
      // Must not expose user email, password, or medical profiles
      expect(report.user).toBeUndefined();
      expect(report.household).toBeUndefined();
      expect(report.hasAsthma).toBeUndefined();
      expect(report.members).toBeUndefined();
      // Latitude and longitude must be quantized (2 decimal places)
      const latStr = report.fuzzedLatitude.toString();
      const decimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(2);
      expect(report.isOfficialData).toBe(false);
    }
  });

  // --------------------------------------------------------------------------
  // 12. Unauthorized Resource Deletion (IDOR on Routine)
  // --------------------------------------------------------------------------
  it("12. prevents unauthorized resource deletion: User B cannot delete User A's saved routine", async () => {
    // Create routine owned by User A
    const routineA = await routineRepository.create(userA.id, {
      title: 'User A Routine To Protect',
      origin: 'Point A',
      destination: 'Point B',
      distanceKm: 8.0,
      departureTime: '09:00',
      baselineMode: 'SOLO_CAR',
    });

    // Attempt deletion by User B -> Must fail / throw
    await expect(routineRepository.delete(userB.id, routineA.id)).rejects.toThrow(
      'Routine not found or unauthorized'
    );

    // Verify routine still exists in database
    const surviving = await prisma.savedRoutine.findUnique({
      where: { id: routineA.id },
    });
    expect(surviving).not.toBeNull();
    expect(surviving?.title).toBe('User A Routine To Protect');
  });
});
