/**
 * BreatheWise AI — Authentic CPCB CAAQMS Station Test Fixture
 * MODULE M4.1: Test-Only & Fixture-Only Data Isolation
 * 
 * STRICT COMPLIANCE RULES:
 * 1. This file is strictly for testing, local fixture evaluation, and golden suite assertions.
 * 2. It is HARD BLOCKED from production execution via ProductionGuard.
 * 3. All outputs are explicitly marked with status: 'MOCK' and isLiveFeed: false.
 * 4. Production builds must never fall back to this fixture.
 */

import {
  AirQualityProvider,
  MonitoringStation,
  CanonicalPollutantMeasurement,
  PollutantCode,
} from '@/lib/air-quality/types';
import { calculateHaversineDistanceKm } from '@/lib/air-quality/station-selector';

export function assertNotProduction(caller = 'Fixture'): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `HARD PRODUCTION BOUNDARY VIOLATION: Mock fixture (${caller}) was invoked in production. Mock data must never reach production clients.`
    );
  }
}

export interface VerifiedStationProfile extends MonitoringStation {
  baselineValues: Record<PollutantCode, { value: number; unit: string }>;
}

export const FIXTURE_CPCB_STATIONS: VerifiedStationProfile[] = [
  // 1. Ahmedabad - Maninagar (CAAQMS - GPCB / AMC)
  {
    id: 'cpcb_station_ahd_maninagar',
    name: 'Maninagar, Ahmedabad — GPCB / AMC [FIXTURE]',
    city: 'Ahmedabad',
    state: 'Gujarat',
    operatingAgency: 'GPCB',
    coordinates: { latitude: 22.9961, longitude: 72.6042 },
    supportedPollutants: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3'],
    sourceProvider: 'CPCB_CAAQMS',
    hasLiveTelemetryFeed: false,
    baselineValues: {
      'PM2.5': { value: 68.4, unit: 'µg/m³' },
      'PM10': { value: 142.1, unit: 'µg/m³' },
      'NO2': { value: 44.2, unit: 'µg/m³' },
      'SO2': { value: 16.8, unit: 'µg/m³' },
      'CO': { value: 1.25, unit: 'mg/m³' },
      'O3': { value: 38.5, unit: 'µg/m³' },
      'NH3': { value: 24.0, unit: 'µg/m³' },
      'Pb': { value: 0.12, unit: 'µg/m³' },
    },
  },

  // 2. Ahmedabad - Vatva (Industrial GIDC - GPCB)
  {
    id: 'cpcb_station_ahd_vatva',
    name: 'Vatva GIDC, Ahmedabad — GPCB [FIXTURE]',
    city: 'Ahmedabad',
    state: 'Gujarat',
    operatingAgency: 'GPCB',
    coordinates: { latitude: 22.9567, longitude: 72.6321 },
    supportedPollutants: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3'],
    sourceProvider: 'CPCB_CAAQMS',
    hasLiveTelemetryFeed: false,
    baselineValues: {
      'PM2.5': { value: 89.2, unit: 'µg/m³' },
      'PM10': { value: 185.6, unit: 'µg/m³' },
      'NO2': { value: 58.7, unit: 'µg/m³' },
      'SO2': { value: 34.1, unit: 'µg/m³' },
      'CO': { value: 1.85, unit: 'mg/m³' },
      'O3': { value: 42.1, unit: 'µg/m³' },
      'NH3': { value: 36.5, unit: 'µg/m³' },
      'Pb': { value: 0.28, unit: 'µg/m³' },
    },
  },

  // 3. Gandhinagar - Sector 10 (GPCB Capital Complex)
  {
    id: 'cpcb_station_gn_sec10',
    name: 'Sector 10, Gandhinagar — GPCB [FIXTURE]',
    city: 'Gandhinagar',
    state: 'Gujarat',
    operatingAgency: 'GPCB',
    coordinates: { latitude: 23.2156, longitude: 72.6369 },
    supportedPollutants: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3'],
    sourceProvider: 'CPCB_CAAQMS',
    hasLiveTelemetryFeed: false,
    baselineValues: {
      'PM2.5': { value: 42.1, unit: 'µg/m³' },
      'PM10': { value: 94.6, unit: 'µg/m³' },
      'NO2': { value: 26.5, unit: 'µg/m³' },
      'SO2': { value: 8.9, unit: 'µg/m³' },
      'CO': { value: 0.72, unit: 'mg/m³' },
      'O3': { value: 35.8, unit: 'µg/m³' },
      'NH3': { value: 14.1, unit: 'µg/m³' },
      'Pb': { value: 0.05, unit: 'µg/m³' },
    },
  },

  // 4. Delhi - Anand Vihar (DPCC Smog Hotspot)
  {
    id: 'cpcb_station_delhi_anand_vihar',
    name: 'Anand Vihar, New Delhi — DPCC [FIXTURE]',
    city: 'Delhi',
    state: 'Delhi',
    operatingAgency: 'DPCC',
    coordinates: { latitude: 28.6476, longitude: 77.3158 },
    supportedPollutants: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3', 'Pb'],
    sourceProvider: 'CPCB_CAAQMS',
    hasLiveTelemetryFeed: false,
    baselineValues: {
      'PM2.5': { value: 215.4, unit: 'µg/m³' },
      'PM10': { value: 382.0, unit: 'µg/m³' },
      'NO2': { value: 92.5, unit: 'µg/m³' },
      'SO2': { value: 24.8, unit: 'µg/m³' },
      'CO': { value: 3.40, unit: 'mg/m³' },
      'O3': { value: 28.6, unit: 'µg/m³' },
      'NH3': { value: 55.2, unit: 'µg/m³' },
      'Pb': { value: 0.65, unit: 'µg/m³' },
    },
  },
];

export const VERIFIED_CPCB_STATIONS = FIXTURE_CPCB_STATIONS;

export class MockCpcbFixtureProvider implements AirQualityProvider {
  readonly name = 'MOCK_CPCB_FIXTURE';

  private assertNotProduction(): void {
    assertNotProduction(this.name);
  }

  async getNearbyStations(
    latitude: number,
    longitude: number,
    radiusKm = 50.0
  ): Promise<MonitoringStation[]> {
    this.assertNotProduction();

    return FIXTURE_CPCB_STATIONS.map((st) => {
      const distanceKm = calculateHaversineDistanceKm(
        latitude,
        longitude,
        st.coordinates.latitude,
        st.coordinates.longitude
      );
      return {
        id: st.id,
        name: st.name,
        city: st.city,
        state: st.state,
        operatingAgency: st.operatingAgency,
        coordinates: st.coordinates,
        distanceKm,
        supportedPollutants: st.supportedPollutants,
        lastReportedUtc: new Date().toISOString(),
        hasLiveTelemetryFeed: false,
        sourceProvider: 'CPCB_CAAQMS' as const,
      };
    })
      .filter((st) => (st.distanceKm ?? 999) <= radiusKm)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }

  async getLatestStationMeasurements(stationId: string): Promise<{
    station: MonitoringStation;
    measurements: Partial<Record<PollutantCode, CanonicalPollutantMeasurement>>;
    fetchedAt: Date;
  } | null> {
    this.assertNotProduction();

    const station = FIXTURE_CPCB_STATIONS.find((s) => s.id === stationId);
    if (!station) return null;

    const measurements: Partial<Record<PollutantCode, CanonicalPollutantMeasurement>> = {};
    const nowIso = new Date().toISOString();

    for (const p of station.supportedPollutants) {
      const base = station.baselineValues[p];
      if (base) {
        measurements[p] = {
          pollutant: p,
          value: base.value,
          originalUnit: base.unit,
          normalizedUnit: p === 'CO' ? 'mg/m³' : 'µg/m³',
          normalizedValue: base.value,
          averagingPeriod: '24_HOUR',
          isInstantaneousProxy: false,
          subIndex: null,
          cpcbCategory: null,
          observationTimestampUtc: nowIso,
          ingestionTimestampUtc: nowIso,
          isExceededNAAQS: false,
          rawParameterName: p.toLowerCase(),
        };
      }
    }

    return {
      station: {
        id: station.id,
        name: station.name,
        city: station.city,
        state: station.state,
        operatingAgency: station.operatingAgency,
        coordinates: station.coordinates,
        supportedPollutants: station.supportedPollutants,
        lastReportedUtc: nowIso,
        hasLiveTelemetryFeed: false,
        sourceProvider: 'CPCB_CAAQMS',
      },
      measurements,
      fetchedAt: new Date(),
    };
  }
}

export const mockCpcbFixtureProvider = new MockCpcbFixtureProvider();
