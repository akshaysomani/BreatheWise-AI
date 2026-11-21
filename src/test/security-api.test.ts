import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getHealth } from '@/app/api/health/route';
import { GET as getHousehold, POST as postHousehold } from '@/app/api/household/route';
import { GET as getAqi } from '@/app/api/aqi/route';
import { GET as getLocation } from '@/app/api/location/coordinates/route';
import { checkRateLimit, resetRateLimits } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

describe('API Foundation & Security Guards (M2 Phase 5 & 7)', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  describe('Health API Endpoint (GET /api/health)', () => {
    it('returns HTTP 200, healthy status, and connected database with latency', async () => {
      const req = new NextRequest('http://localhost:3000/api/health');
      const res = await getHealth(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('healthy');
      expect(json.data.database.status).toBe('connected');
      expect(json.data.database.engine).toBe('postgresql');
      expect(typeof json.data.database.latencyMs).toBe('number');
      // Verifies zero leakage of internal database file paths or credentials
      expect(json.data.database.url).toBeUndefined();
    });
  });

  describe('Authorization Boundary & IDOR Defense (GET /api/household)', () => {
    it('rejects unauthenticated requests with HTTP 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/household');
      const res = await getHousehold(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
      expect(json.error.message).toContain('Authentication required');
    });

    it('rejects unauthenticated profile creation with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/household', {
        method: 'POST',
        body: JSON.stringify({
          city: 'Noida',
          latitude: 28.6,
          longitude: 77.3,
          floorAreaSqFt: 800,
        }),
      });
      const res = await postHousehold(req);
      expect(res.status).toBe(401);
    });
  });

  describe('Location Geocoordinates Validation & Fuzzing (GET /api/location/coordinates)', () => {
    it('validates coordinates and returns privacy-fuzzed centroid (~1.1 km)', async () => {
      const req = new NextRequest('http://localhost:3000/api/location/coordinates?lat=28.628475&lon=77.364912&city=Noida');
      const res = await getLocation(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.verifiedCoordinates.latitude).toBe(28.628475);
      expect(json.data.privacyFuzzedCoordinates.latitude).toBe(28.63);
      expect(json.data.privacyFuzzedCoordinates.longitude).toBe(77.36);
    });

    it('rejects out-of-bounds coordinates with HTTP 422 Validation Error', async () => {
      const req = new NextRequest('http://localhost:3000/api/location/coordinates?lat=95.0&lon=77.0');
      const res = await getLocation(req);
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Air Quality Data Contract (GET /api/aqi)', () => {
    it('validates coordinates and returns environmental data contract', async () => {
      const req = new NextRequest('http://localhost:3000/api/aqi?lat=28.61&lon=77.20');
      const res = await getAqi(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.isLiveExternalFeed).toBe(false);
    });
  });

  describe('Defensive Rate Limiting Security Guard', () => {
    it('throttles requests when limit is exceeded, returning allowed: false', () => {
      const clientKey = 'test_ip_client_001';
      const limit = 5;

      for (let i = 0; i < limit; i++) {
        const check = checkRateLimit(clientKey, limit, 10_000);
        expect(check.allowed).toBe(true);
      }

      // Sixth attempt exceeds limit
      const exceeded = checkRateLimit(clientKey, limit, 10_000);
      expect(exceeded.allowed).toBe(false);
      expect(exceeded.remaining).toBe(0);
      expect(exceeded.resetMs).toBeGreaterThan(0);
    });
  });

  describe('Sanitized Logging & PII Redaction', () => {
    it('redacts sensitive keys such as passwords, API keys, and tokens from structured log output', () => {
      let loggedOutput = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        loggedOutput = msg;
      };

      try {
        logger.info('User action test', {
          userId: 'usr_123',
          email: 'test@breathewise.local',
          password: 'SuperSecretPassword123!',
          gemini_api_key: 'AIzaSyMockKeyForSecurityAudit',
          token: 'bearer_token_xyz',
        });

        const parsed = JSON.parse(loggedOutput);
        expect(parsed.context.password).toBe('[REDACTED]');
        expect(parsed.context.gemini_api_key).toBe('[REDACTED]');
        expect(parsed.context.token).toBe('[REDACTED]');
        expect(parsed.context.userId).toBe('usr_123');
      } finally {
        console.log = originalLog;
      }
    });
  });
});
