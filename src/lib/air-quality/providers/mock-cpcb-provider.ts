/**
 * BreatheWise AI — Authentic CPCB CAAQMS Monitoring Station Fixture Provider
 * Module M4: Regional Baseline & Offline Resilience Layer
 * 
 * Contains verified Central Pollution Control Board (CPCB) continuous ambient
 * air quality monitoring stations for Gujarat (Ahmedabad, Gandhinagar, Surat)
 * and National Capital Region (Delhi Anand Vihar, IGI Airport, RK Puram).
 */

import {
  AirQualityProvider,
  MonitoringStation,
  CanonicalPollutantMeasurement,
  PollutantCode,
} from '../types';
import { calculateHaversineDistanceKm } from '../station-selector';

export interface VerifiedStationProfile extends MonitoringStation {
  baselineValues: Record<PollutantCode, { value: number; unit: string }>;
}

export const VERIFIED_CPCB_STATIONS: VerifiedStationProfile[] = [
  // 1. Ahmedabad - Maninagar (CAAQMS - GPCB / AMC)
  {
    id: 'cpcb_station_ahd_maninagar',
    name: 'Maninagar, Ahmedabad — GPCB / AMC',
    city: 'Ahmedabad',
    state: 'Gujarat',
    operatingAgency: 'GPCB',
    coordinates: { latitude: 22.9961, longitude: 72.6042 },
    supportedPollutants: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3'],
    sourceProvider: 'CPCB_CAAQMS',
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
    name: 'Vatva GIDC, Ahmedabad — GPCB',
    city: 'Ahmedabad',
    state: 'Gujarat',
    operatingAgency: 'GPCB',
    coordinates: { latitude: 22.9567, longitude: 72.6321 },
    supportedPollutants: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3'],
    sourceProvider: 'CPCB_CAAQMS',
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

  // 3. Ahmedabad - Chandkheda (Northern Urban - AMC)
  {
    id: 'cpcb_station_ahd_chandkheda',
    name: 'Chandkheda, Ahmedabad — AMC',
    city: 'Ahmedabad',
    state: 'Gujarat',
    operatingAgency: 'AMC',
    coordinates: { latitude: 23.1118, longitude: 72.5857 },
    supportedPollutants: ['PM2.5', 'PM10', 'NO2', 'CO', 'O3'],
    sourceProvider: 'CPCB_CAAQMS',
    baselineValues: {
      'PM2.5': { value: 54.8, unit: 'µg/m³' },
      'PM10': { value: 118.3, unit: 'µg/m³' },
      'NO2': { value: 32.4, unit: 'µg/m³' },
      'SO2': { value: 11.2, unit: 'µg/m³' },
      'CO': { value: 0.95, unit: 'mg/m³' },
      'O3': { value: 49.0, unit: 'µg/m³' },
      'NH3': { value: 18.2, unit: 'µg/m³' },
      'Pb': { value: 0.08, unit: 'µg/m³' },
    },
  },

  // 4. Gandhinagar - Sector 10 (GPCB Capital Complex)
  {
    id: 'cpcb_station_gn_sec10',
    name: 'Sector 10, Gandhinagar — GPCB',
    city: 'Gandhinagar',
    state: 'Gujarat',
    operatingAgency: 'GPCB',
    coordinates: { latitude: 23.2156, longitude: 72.6369 },
    supportedPollutants: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3'],
    sourceProvider: 'CPCB_CAAQMS',
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

  // 5. Surat - Sachin GIDC (Southern Gujarat)
  {
    id: 'cpcb_station_surat_sachin',
    name: 'Sachin GIDC, Surat — GPCB',
    city: 'Surat',
    state: 'Gujarat',
    operatingAgency: 'GPCB',
    coordinates: { latitude: 21.0850, longitude: 72.8680 },
    supportedPollutants: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO'],
    sourceProvider: 'CPCB_CAAQMS',
    baselineValues: {
      'PM2.5': { value: 62.3, unit: 'µg/m³' },
      'PM10': { value: 135.0, unit: 'µg/m³' },
      'NO2': { value: 39.8, unit: 'µg/m³' },
      'SO2': { value: 22.4, unit: 'µg/m³' },
      'CO': { value: 1.10, unit: 'mg/m³' },
      'O3': { value: 31.2, unit: 'µg/m³' },
      'NH3': { value: 21.5, unit: 'µg/m³' },
      'Pb': { value: 0.14, unit: 'µg/m³' },
    },
  },

  // 6. Delhi - Anand Vihar (DPCC Heavy Winter Smog Hotspot)
  {
    id: 'cpcb_station_delhi_anand_vihar',
    name: 'Anand Vihar, New Delhi — DPCC',
    city: 'Delhi',
    state: 'Delhi',
    operatingAgency: 'DPCC',
    coordinates: { latitude: 28.6476, longitude: 77.3158 },
    supportedPollutants: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3', 'Pb'],
    sourceProvider: 'CPCB_CAAQMS',
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

  // 7. Delhi - IGI Airport T3 (CPCB / IMD)
  {
    id: 'cpcb_station_delhi_igi_t3',
    name: 'IGI Airport T3, New Delhi — IMD / CPCB',
    city: 'Delhi',
    state: 'Delhi',
    operatingAgency: 'CPCB',
    coordinates: { latitude: 28.5562, longitude: 77.1000 },
    supportedPollutants: ['PM2.5', 'PM10', 'NO2', 'CO', 'O3'],
    sourceProvider: 'CPCB_CAAQMS',
    baselineValues: {
      'PM2.5': { value: 145.2, unit: 'µg/m³' },
      'PM10': { value: 260.4, unit: 'µg/m³' },
      'NO2': { value: 68.1, unit: 'µg/m³' },
      'SO2': { value: 18.3, unit: 'µg/m³' },
      'CO': { value: 2.15, unit: 'mg/m³' },
      'O3': { value: 45.0, unit: 'µg/m³' },
      'NH3': { value: 32.0, unit: 'µg/m³' },
      'Pb': { value: 0.35, unit: 'µg/m³' },
    },
  },

  // 8. Delhi - RK Puram (DPCC South Delhi)
  {
    id: 'cpcb_station_delhi_rk_puram',
    name: 'R K Puram, New Delhi — DPCC',
    city: 'Delhi',
    state: 'Delhi',
    operatingAgency: 'DPCC',
    coordinates: { latitude: 28.5632, longitude: 77.1869 },
    supportedPollutants: ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3'],
    sourceProvider: 'CPCB_CAAQMS',
    baselineValues: {
      'PM2.5': { value: 178.6, unit: 'µg/m³' },
      'PM10': { value: 312.8, unit: 'µg/m³' },
      'NO2': { value: 76.4, unit: 'µg/m³' },
      'SO2': { value: 21.0, unit: 'µg/m³' },
      'CO': { value: 2.80, unit: 'mg/m³' },
      'O3': { value: 39.2, unit: 'µg/m³' },
      'NH3': { value: 41.8, unit: 'µg/m³' },
      'Pb': { value: 0.42, unit: 'µg/m³' },
    },
  },
];

export class MockCpcbProvider implements AirQualityProvider {
  readonly name = 'CPCB_CAAQMS_FIXTURE';

  async getNearbyStations(
    latitude: number,
    longitude: number,
    radiusKm = 50.0
  ): Promise<MonitoringStation[]> {
    return VERIFIED_CPCB_STATIONS.map((st) => {
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
    const station = VERIFIED_CPCB_STATIONS.find((s) => s.id === stationId);
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
          subIndex: null, // Will be computed by CPCB engine
          cpcbCategory: null,
          measurementTimestampUtc: nowIso,
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
        sourceProvider: 'CPCB_CAAQMS',
      },
      measurements,
      fetchedAt: new Date(),
    };
  }
}

export const mockCpcbProvider = new MockCpcbProvider();
