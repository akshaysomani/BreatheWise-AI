import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MockCpcbFixtureProvider,
  assertNotProduction,
} from './fixtures/mock-cpcb-fixture';
import { airQualityService } from '@/services/air-quality.service';
import prisma from '@/lib/db';

describe('Mock Data Hard Production Boundary & Isolation (M4.1 Audit)', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  describe('1. assertNotProduction() Hard Guard Assertion', () => {
    it('throws a fatal error if invoked when NODE_ENV is production', () => {
      (process.env as any).NODE_ENV = 'production';
      expect(() => {
        assertNotProduction('CRITICAL TEST CALL');
      }).toThrow(/HARD PRODUCTION BOUNDARY VIOLATION/);
    });

    it('does not throw when NODE_ENV is test or development', () => {
      (process.env as any).NODE_ENV = 'test';
      expect(() => {
        assertNotProduction('TEST CALL');
      }).not.toThrow();

      (process.env as any).NODE_ENV = 'development';
      expect(() => {
        assertNotProduction('DEV CALL');
      }).not.toThrow();
    });

    it('prevents MockCpcbFixtureProvider methods in production', async () => {
      (process.env as any).NODE_ENV = 'production';
      const provider = new MockCpcbFixtureProvider();

      await expect(provider.getNearbyStations(28.6476, 77.3158)).rejects.toThrow(
        /HARD PRODUCTION BOUNDARY VIOLATION/
      );

      await expect(provider.getLatestStationMeasurements('test_station')).rejects.toThrow(
        /HARD PRODUCTION BOUNDARY VIOLATION/
      );
    });
  });

  describe('2. AirQualityService Zero-Fabrication Production Boundary', () => {
    beforeEach(async () => {
      // Clean non-seed test snapshots
      await prisma.airQualitySnapshot.deleteMany({
        where: {
          stationId: { startsWith: 'test_' },
        },
      });
    });

    it('strictly returns NO_DATA in production when upstream live provider is unavailable and cache is empty', async () => {
      (process.env as any).NODE_ENV = 'production';

      // Remote/un-cached coordinates (Noida Sector 128: 28.515, 77.375)
      const result = await airQualityService.getAirQuality(28.515, 77.375, 'Noida');

      // Must NOT return mock data or SUCCESS with synthetic numbers
      expect(result.status).toBe('NO_DATA');
      expect(result.provenanceStatus).toBe('NO_DATA');
      expect(result.data).toBeUndefined();
      expect(result.notice).toContain('BreatheWise AI strictly adheres to verified environmental data');
      expect(result.notice).toContain('will not display fabricated numbers');
    });

    it('never assigns MOCK provenance status in production mode', async () => {
      (process.env as any).NODE_ENV = 'production';

      const result = await airQualityService.getAirQuality(28.515, 77.375);
      expect(result.provenanceStatus).not.toBe('MOCK');
      expect(result.status).not.toBe('MOCK');
    });

    it('permits fixture in test environment only when explicitly authorized with allowFixture flag', async () => {
      (process.env as any).NODE_ENV = 'test';

      // Gandhinagar coordinates (not in seed cache, present in fixture)
      const resultWithFixture = await airQualityService.getAirQuality(23.2156, 72.6369, 'Gandhinagar', {
        allowFixture: true,
      });

      expect(resultWithFixture.status).toBe('SUCCESS');
      expect(resultWithFixture.provenanceStatus).toBe('MOCK');
      expect(resultWithFixture.data?.cpcbAqi.aqi).toBeGreaterThan(0);
    });
  });
});
