/**
 * BreatheWise AI — Regional Telemetry Recovery & Public Content Audit Test Suite
 * Validates Part A (Public Content Governance) and Part B (Atmospheric Telemetry Pipeline)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { airQualityService } from '@/services/air-quality.service';
import { cpcbProvider, CPCB_REGIONAL_STATIONS } from '@/lib/air-quality/providers/cpcb-provider';
import { openaqProvider } from '@/lib/air-quality/providers/openaq-provider';
import { REGIONAL_STATIONS } from '@/components/dashboard/AirQualityRadar';
import { calculateHaversineDistanceKm } from '@/lib/air-quality/station-selector';
import { evaluateFreshness } from '@/lib/air-quality/freshness';
import { calculateCpcbAqi } from '@/lib/air-quality/cpcb-aqi';
import fs from 'fs';
import path from 'path';

describe('Part A — Public Website Content Audit', () => {
  it('Registration page does NOT contain developer personal names in placeholders', () => {
    const registerPageSource = fs.readFileSync(
      path.resolve(__dirname, '../app/register/page.tsx'),
      'utf8'
    );
    expect(registerPageSource).not.toContain('Akshay');
    expect(registerPageSource).toContain('e.g. Sharma Family or My Household');
  });

  it('README.md contains the correct repository web URL', () => {
    const readmeSource = fs.readFileSync(
      path.resolve(__dirname, '../../README.md'),
      'utf8'
    );
    expect(readmeSource).toContain('https://github.com/akshaysomani/BreatheWise-AI.git');
  });

  it('Provider User-Agent does NOT reference internal challenge scores', () => {
    const providerSource = fs.readFileSync(
      path.resolve(__dirname, '../lib/air-quality/providers/openaq-provider.ts'),
      'utf8'
    );
    expect(providerSource).not.toContain('Challenge6');
  });

  it('AirQualityRadar.tsx does NOT expose developer technical errors or HTTP status codes', () => {
    const radarSource = fs.readFileSync(
      path.resolve(__dirname, '../components/dashboard/AirQualityRadar.tsx'),
      'utf8'
    );
    expect(radarSource).not.toContain('Live Stream Fallback Active');
    expect(radarSource).not.toContain('rejected API key credentials');
    expect(radarSource).not.toContain('HTTP 401');
    expect(radarSource).not.toContain('OPENAQ_API_KEY');
    expect(radarSource).not.toContain('Provider Auth Required');
  });

  it('AirQualityRadar.tsx provides user-friendly status messages across all provider states', () => {
    const radarSource = fs.readFileSync(
      path.resolve(__dirname, '../components/dashboard/AirQualityRadar.tsx'),
      'utf8'
    );
    // State A: Live observations available
    expect(radarSource).toContain('Live air-quality monitoring data is available for this location.');
    // State B: Historical station records only
    expect(radarSource).toContain('Air-quality monitoring information is currently available from historical station records. Live monitoring updates are temporarily unavailable.');
    // State C: Neither source available
    expect(radarSource).toContain('Air-quality monitoring data is currently unavailable for this location.');
  });
});

describe('Part B — Atmospheric Telemetry Pipeline & Regional Hub Coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Regional Hub Coverage & Proximity Matching
  describe('1. Regional Hub Coverage & Proximity Matching', () => {
    it('Current Location (23.22, 72.64) matches Gandhinagar Sector 10 within 1 km', async () => {
      const result = await airQualityService.getAirQuality(23.22, 72.64);
      expect(result.status).toBe('SUCCESS');
      expect(result.data).toBeDefined();
      expect(result.data?.station.name).toContain('Gandhinagar');
      expect(result.data?.station.distanceKm).toBeLessThanOrEqual(1.0);
      expect(result.data?.cpcbAqi?.aqi).toBeGreaterThan(0);
      expect(result.data?.measurements['PM2.5']).toBeDefined();
    });

    it('Delhi (Anand Vihar) resolves verified DPCC station with genuine criteria pollutants', async () => {
      const result = await airQualityService.getAirQuality(28.6476, 77.3158);
      expect(result.status).toBe('SUCCESS');
      expect(result.data?.station.name).toContain('Anand Vihar');
      expect(result.data?.station.operatingAgency).toBe('DPCC');
      expect(result.data?.cpcbAqi?.aqi).toBeGreaterThanOrEqual(200); // Delhi severe winter smog
      expect(result.data?.measurements['PM2.5']?.normalizedValue).toBe(184.2);
      expect(result.data?.measurements['CO']?.normalizedUnit).toBe('mg/m³');
    });

    it('Delhi (IGI Airport T3) resolves verified CPCB / IMD station', async () => {
      const result = await airQualityService.getAirQuality(28.5562, 77.1000);
      expect(result.status).toBe('SUCCESS');
      expect(result.data?.station.name).toContain('IGI Airport');
      expect(result.data?.cpcbAqi?.aqi).toBeGreaterThan(0);
    });

    it('Delhi (RK Puram) resolves verified DPCC station', async () => {
      const result = await airQualityService.getAirQuality(28.5632, 77.1869);
      expect(result.status).toBe('SUCCESS');
      expect(result.data?.station.name).toContain('R K Puram');
      expect(result.data?.cpcbAqi?.aqi).toBeGreaterThan(0);
    });

    it('Ahmedabad (Maninagar) resolves verified GPCB / AMC station', async () => {
      const result = await airQualityService.getAirQuality(22.9961, 72.6042);
      expect(result.status).toBe('SUCCESS');
      expect(result.data?.station.name).toContain('Maninagar');
      expect(result.data?.station.operatingAgency).toBe('GPCB / AMC');
    });

    it('Ahmedabad (Vatva GIDC) resolves verified industrial GPCB station', async () => {
      const result = await airQualityService.getAirQuality(22.9567, 72.6321);
      expect(result.status).toBe('SUCCESS');
      expect(result.data?.station.name).toContain('Vatva GIDC');
      expect(result.data?.station.operatingAgency).toBe('GPCB');
    });

    it('Gandhinagar (Sector 10) resolves verified GPCB Capital Complex station', async () => {
      const result = await airQualityService.getAirQuality(23.2156, 72.6369);
      expect(result.status).toBe('SUCCESS');
      expect(result.data?.station.name).toContain('Sector 10, Gandhinagar');
      expect(result.data?.cpcbAqi?.category).toBe('SATISFACTORY');
    });

    it('Surat (Sachin GIDC) resolves verified GPCB industrial station', async () => {
      const result = await airQualityService.getAirQuality(21.0850, 72.8680);
      expect(result.status).toBe('SUCCESS');
      expect(result.data?.station.name).toContain('Sachin GIDC');
      expect(result.data?.station.operatingAgency).toBe('GPCB');
    });

    it('Remote coordinates (>50 km from any station) honestly report NO_DATA without fabricating data', async () => {
      const result = await airQualityService.getAirQuality(10.0, 50.0);
      expect(['NO_DATA', 'NO_NEARBY_STATION']).toContain(result.status);
      expect(result.provenanceStatus).toBe('NO_DATA');
      expect(result.notice).toContain('will not display fabricated numbers');
      expect(result.data).toBeUndefined();
    });
  });

  // 2. OpenAQ v3 Integration & Fallback Handling
  describe('2. OpenAQ v3 Integration & Upstream Failure Resilience', () => {
    it('correctly clamps OpenAQ spatial radius to <= 25,000 meters per API v3 specification', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as any);

      await openaqProvider.getNearbyStations(28.6476, 77.3158, 50.0);

      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('radius=25000'); // Clamped to 25 km max
    });

    it('falls back seamlessly to verified CPCB CAAQMS baseline when OpenAQ returns 401 Unauthorized', async () => {
      vi.spyOn(openaqProvider, 'getNearbyStations').mockImplementation(async () => {
        return [];
      });

      const result = await airQualityService.getAirQuality(28.6476, 77.3158);
      expect(result.status).toBe('SUCCESS');
      expect(result.data?.station.sourceProvider).toBe('CPCB_CAAQMS');
      expect(result.data?.attribution.isLiveFeed).toBe(false);
      expect(result.data?.station.name).toContain('Anand Vihar');
    });

    it('maps OpenAQ v3 sensorsId in /latest measurements to correct pollutant codes', async () => {
      const mockStationId = 'openaq_1234';
      vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
        const u = String(url);
        if (u.includes('/locations/1234/latest')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              results: [
                { sensorsId: 101, value: 55.4, datetime: { utc: new Date().toISOString() } },
                { sensorsId: 102, value: 1.2, datetime: { utc: new Date().toISOString() } },
              ],
            }),
          } as any);
        }
        if (u.includes('/locations/1234')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              results: {
                id: 1234,
                name: 'Mock Test Station',
                locality: 'Delhi',
                sensors: [
                  { id: 101, parameter: { name: 'pm25', units: 'µg/m³' } },
                  { id: 102, parameter: { name: 'co', units: 'mg/m³' } },
                ],
              },
            }),
          } as any);
        }
        return Promise.reject(new Error(`Unhandled URL: ${u}`));
      });

      const result = await openaqProvider.getLatestStationMeasurements(mockStationId);
      expect(result).not.toBeNull();
      expect(result?.measurements['PM2.5']?.normalizedValue).toBe(55.4);
      expect(result?.measurements['CO']?.normalizedValue).toBe(1.2);
    });
  });

  // 3. CPCB NAQI Calculation & Sufficiency Rules
  describe('3. CPCB NAQI Calculation & Sufficiency Rules', () => {
    it('satisfies 3-pollutant sufficiency rule including particulate', () => {
      const inputs = [
        { pollutant: 'PM2.5' as const, value: 45.0, unit: 'µg/m³' },
        { pollutant: 'NO2' as const, value: 30.0, unit: 'µg/m³' },
        { pollutant: 'SO2' as const, value: 12.0, unit: 'µg/m³' },
      ];
      const { aqiResult } = calculateCpcbAqi(inputs);
      expect(aqiResult.dataSufficiency.isSufficient).toBe(true);
      expect(aqiResult.aqi).not.toBeNull();
      expect(aqiResult.category).toBe('SATISFACTORY');
    });

    it('rejects AQI calculation if particulate (PM2.5 or PM10) is absent', () => {
      const inputs = [
        { pollutant: 'NO2' as const, value: 30.0, unit: 'µg/m³' },
        { pollutant: 'SO2' as const, value: 12.0, unit: 'µg/m³' },
        { pollutant: 'CO' as const, value: 1.0, unit: 'mg/m³' },
      ];
      const { aqiResult } = calculateCpcbAqi(inputs);
      expect(aqiResult.dataSufficiency.isSufficient).toBe(false);
      expect(aqiResult.aqi).toBeNull();
      expect(aqiResult.category).toBe('INSUFFICIENT_DATA');
    });

    it('normalizes CO to mg/m³ while all other 7 pollutants remain in µg/m³', () => {
      const inputs = [
        { pollutant: 'PM2.5' as const, value: 45.0, unit: 'µg/m³' },
        { pollutant: 'CO' as const, value: 1.2, unit: 'mg/m³' },
        { pollutant: 'NO2' as const, value: 25.0, unit: 'µg/m³' },
      ];
      const { measurements } = calculateCpcbAqi(inputs);
      expect(measurements['CO']?.normalizedUnit).toBe('mg/m³');
      expect(measurements['PM2.5']?.normalizedUnit).toBe('µg/m³');
      expect(measurements['NO2']?.normalizedUnit).toBe('µg/m³');
    });
  });

  // 4. Freshness Classification
  describe('4. Freshness Classification', () => {
    it('correctly classifies timestamps into CURRENT (<2h), AGING (2-4h), and STALE (>4h)', () => {
      const now = Date.now();
      const current = new Date(now - 30 * 60 * 1000); // 30 min ago
      const aging = new Date(now - 150 * 60 * 1000);   // 2.5 hours ago
      const stale = new Date(now - 360 * 60 * 1000);   // 6 hours ago

      expect(evaluateFreshness(current).state).toBe('CURRENT');
      expect(evaluateFreshness(aging).state).toBe('AGING');
      expect(evaluateFreshness(stale).state).toBe('STALE');
      expect(evaluateFreshness(stale).isStale).toBe(true);
    });
  });
});
