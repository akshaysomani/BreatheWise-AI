import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MockCpcbFixtureProvider,
  assertNotProduction,
} from './fixtures/mock-cpcb-fixture';
import { airQualityService } from '@/services/air-quality.service';
import { openaqProvider } from '@/lib/air-quality/providers/openaq-provider';
import { cpcbProvider } from '@/lib/air-quality/providers/cpcb-provider';
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
      // Deterministically clean snapshots across test bounding boxes to guarantee genuine test isolation
      await prisma.airQualitySnapshot.deleteMany({
        where: {
          OR: [
            { stationId: { startsWith: 'test_' } },
            { latitude: { gte: 28.0, lte: 29.0 }, longitude: { gte: 76.5, lte: 77.8 } }, // Delhi NCR
            { latitude: { gte: 34.0, lte: 34.5 }, longitude: { gte: 77.0, lte: 78.0 } }, // Leh
          ],
        },
      });
    });

    it('strictly returns NO_DATA in production when upstream live provider is unavailable and cache is empty', async () => {
      (process.env as any).NODE_ENV = 'production';
      vi.spyOn(openaqProvider, 'getNearbyStations').mockResolvedValue([]);
      vi.spyOn(cpcbProvider, 'getNearbyStations').mockResolvedValue([]);

      // Test with isolated urban Delhi coordinates (28.6139, 77.2090)
      const result = await airQualityService.getAirQuality(28.6139, 77.2090, 'Delhi');

      // Must NOT return mock data or SUCCESS with synthetic numbers
      expect(result.status).toBe('NO_DATA');
      expect(result.provenanceStatus).toBe('NO_DATA');
      expect(result.data).toBeUndefined();
      expect(result.notice).toContain('BreatheWise AI strictly adheres to verified environmental data');
      expect(result.notice).toContain('will not display fabricated numbers');
    });

    it('never assigns MOCK provenance status in production mode', async () => {
      (process.env as any).NODE_ENV = 'production';
      vi.spyOn(openaqProvider, 'getNearbyStations').mockResolvedValue([]);
      vi.spyOn(cpcbProvider, 'getNearbyStations').mockResolvedValue([]);

      const result = await airQualityService.getAirQuality(28.6139, 77.2090);
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
