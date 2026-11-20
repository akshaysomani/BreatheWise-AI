import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateHaversineDistanceKm,
  quantizeCoordinates,
  rankStationsByProximityAndQuality,
  selectBestStation,
  MAX_REPRESENTATIVE_DISTANCE_KM,
} from '@/lib/air-quality/station-selector';
import {
  evaluateFreshness,
  formatToIndianStandardTime,
} from '@/lib/air-quality/freshness';
import { mockCpcbProvider, VERIFIED_CPCB_STATIONS } from '@/lib/air-quality/providers/mock-cpcb-provider';
import { airQualityService } from '@/services/air-quality.service';
import prisma from '@/lib/db';

describe('Air Quality Intelligence Modules (M4)', () => {
  describe('Geospatial & Haversine Distance Calculations', () => {
    it('returns 0 km for identical coordinates', () => {
      expect(calculateHaversineDistanceKm(28.61, 77.20, 28.61, 77.20)).toBe(0);
    });

    it('computes accurate distance between Ahmedabad (Maninagar) and Gandhinagar', () => {
      // Maninagar: 22.9961, 72.6042; Gandhinagar Sec 10: 23.2156, 72.6369 (~24-26 km)
      const distance = calculateHaversineDistanceKm(22.9961, 72.6042, 23.2156, 72.6369);
      expect(distance).toBeGreaterThan(23);
      expect(distance).toBeLessThan(27);
    });

    it('computes accurate distance between Anand Vihar and IGI Airport Delhi', () => {
      // Anand Vihar: 28.6476, 77.3158; IGI T3: 28.5562, 77.1000 (~24-26 km)
      const distance = calculateHaversineDistanceKm(28.6476, 77.3158, 28.5562, 77.1000);
      expect(distance).toBeGreaterThan(20);
      expect(distance).toBeLessThan(28);
    });
  });

  describe('User Privacy Protection (Coordinate Quantization)', () => {
    it('quantizes high-precision coordinates to 2 decimal places (~1.1 km grid)', () => {
      const quantized = quantizeCoordinates(28.613938492, 77.209021045);
      expect(quantized.latitude).toBe(28.61);
      expect(quantized.longitude).toBe(77.21);
    });
  });

  describe('Station Selection & Representative Cutoff', () => {
    it('selects nearest station in Ahmedabad for Ahmedabad coordinates', () => {
      // Near Maninagar (22.99, 72.60)
      const selection = selectBestStation(VERIFIED_CPCB_STATIONS, 22.99, 72.60);
      expect(selection.isWithinRange).toBe(true);
      expect(selection.selected?.id).toBe('cpcb_station_ahd_maninagar');
      expect(selection.distanceKm).toBeLessThan(3.0);
    });

    it('returns out of range when coordinates are > 50 km from any station', () => {
      // Middle of Thar Desert / Remote area in Rajasthan (26.50, 71.00)
      const selection = selectBestStation(VERIFIED_CPCB_STATIONS, 26.50, 71.00, MAX_REPRESENTATIVE_DISTANCE_KM);
      expect(selection.isWithinRange).toBe(false);
      expect(selection.selected).toBeNull();
      expect(selection.distanceKm).toBeGreaterThan(50.0);
    });
  });

  describe('Telemetry Freshness & IST Time Formatting', () => {
    it('categorizes measurement within 2 hours as CURRENT', () => {
      const recent = new Date(Date.now() - 45 * 60 * 1000); // 45 min ago
      const evalResult = evaluateFreshness(recent);
      expect(evalResult.state).toBe('CURRENT');
      expect(evalResult.isStale).toBe(false);
      expect(evalResult.ageMinutes).toBe(45);
    });

    it('categorizes measurement between 2 and 4 hours as AGING', () => {
      const aging = new Date(Date.now() - 150 * 60 * 1000); // 2.5 hours ago
      const evalResult = evaluateFreshness(aging);
      expect(evalResult.state).toBe('AGING');
      expect(evalResult.isStale).toBe(false);
    });

    it('categorizes measurement between 4 and 24 hours as STALE', () => {
      const stale = new Date(Date.now() - 360 * 60 * 1000); // 6 hours ago
      const evalResult = evaluateFreshness(stale);
      expect(evalResult.state).toBe('STALE');
      expect(evalResult.isStale).toBe(true);
    });

    it('categorizes measurement older than 24 hours as MISSING', () => {
      const old = new Date(Date.now() - 25 * 3600 * 1000); // 25 hours ago
      const evalResult = evaluateFreshness(old);
      expect(evalResult.state).toBe('MISSING');
      expect(evalResult.isStale).toBe(true);
    });

    it('formats UTC dates into Indian Standard Time (IST)', () => {
      const date = new Date('2026-11-20T12:00:00.000Z'); // 12:00 UTC = 17:30 IST
      const istString = formatToIndianStandardTime(date);
      expect(istString).toContain('5:30 PM IST');
      expect(istString).toContain('20 Nov 2026');
    });
  });

  describe('End-to-End Air Quality Service Orchestration', () => {
    beforeEach(async () => {
      // Clean up test airQualitySnapshots to ensure isolated assertions
      await prisma.airQualitySnapshot.deleteMany({});
    });

    it('returns CPCB AQI for Delhi coordinates via authentic CPCB station network', async () => {
      // Near Anand Vihar (28.6476, 77.3158)
      const result = await airQualityService.getAirQuality(28.6476, 77.3158, 'Delhi');

      expect(result.status).toBe('SUCCESS');
      expect(result.data).toBeDefined();
      expect(result.data?.station.name).toContain('Anand Vihar');
      expect(result.data?.cpcbAqi.methodology).toBe('CPCB_NAQI_INDIA_2014');
      expect(result.data?.cpcbAqi.aqi).toBeGreaterThanOrEqual(100);
      expect(result.data?.cpcbAqi.dominantPollutant).toBeDefined();
      expect(result.data?.freshness.measurementLocalTime).toContain('IST');
      expect(result.data?.attribution.license).toContain('License');
    });

    it('honestly reports NO_NEARBY_STATION for remote coordinates without fabricating data', async () => {
      // Remote Arabian Sea / Off-coast coordinates (19.00, 68.00)
      const result = await airQualityService.getAirQuality(19.00, 68.00);

      expect(result.status).toBe('NO_NEARBY_STATION');
      expect(result.data).toBeUndefined();
      expect(result.notice).toContain('No active continuous ambient air quality monitoring station is located');
    });
  });
});
