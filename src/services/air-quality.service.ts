/**
 * BreatheWise AI — Air Quality Intelligence Orchestrator
 * Module M4.1: Multi-Tier Provider Ingestion, Provenance Integrity & Mock Data Isolation
 * 
 * STRICT ARCHITECTURAL PRINCIPLES:
 * 1. ZERO SYNTHETIC TELEMETRY IN PRODUCTION: Production builds never fall back to mock data.
 * 2. HONEST NO_DATA STATE: An honest no-data notice is always preferred over fabricated readings.
 * 3. 4-TIMESTAMP MODEL: Preserves observation, ingestion, retrieval, and cache timestamps.
 * 4. 5-STATE PROVENANCE: Strictly demarcates LIVE, CACHED, STALE, MOCK, and NO_DATA.
 */

import { airQualityRepository, AqiSnapshotInput } from '@/repositories/air-quality.repository';
import {
  calculateCpcbAqi,
  RawPollutantInput,
} from '@/lib/air-quality/cpcb-aqi';
import { selectBestStation, MAX_REPRESENTATIVE_DISTANCE_KM } from '@/lib/air-quality/station-selector';
import { openaqProvider } from '@/lib/air-quality/providers/openaq-provider';
import { mockCpcbFixtureProvider } from '@/test/fixtures/mock-cpcb-fixture';
import {
  evaluateFreshness,
  buildTelemetryTimestamps,
} from '@/lib/air-quality/freshness';
import {
  CanonicalAirQualityRecord,
  PollutantCode,
  MonitoringStation,
  FreshnessState,
  TelemetryProvenanceStatus,
} from '@/lib/air-quality/types';

export interface AirQualityQueryOptions {
  allowFixture?: boolean; // Only permitted in test environments
}

export const airQualityService = {
  /**
   * Main M4.1 entry point: Resolves live air quality for a coordinate pair,
   * enforcing strict provenance, database cache verification, and hard mock isolation.
   */
  async getAirQuality(
    latitude: number,
    longitude: number,
    cityHint?: string,
    options?: AirQualityQueryOptions
  ): Promise<{
    status: 'SUCCESS' | 'NO_DATA' | 'NO_NEARBY_STATION' | 'PROVIDER_ERROR';
    provenanceStatus?: TelemetryProvenanceStatus;
    data?: CanonicalAirQualityRecord;
    notice?: string;
  }> {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowFixture = !isProduction && (options?.allowFixture === true || process.env.ALLOW_MOCK_AQI === 'true');

    try {
      // 1. Check local database telemetry cache (< 60 minutes)
      const cached = await airQualityRepository.getLatestByLocation(latitude, longitude, 60);

      if (cached) {
        const freshness = evaluateFreshness(cached.measurementTimestamp);
        const provenanceStatus: TelemetryProvenanceStatus = freshness.isStale ? 'STALE' : 'CACHED';

        const record = this.reconstructRecordFromSnapshot(cached, freshness, provenanceStatus);
        return {
          status: 'SUCCESS',
          provenanceStatus,
          data: record,
        };
      }

      // 2. Query upstream live provider: OpenAQ v3
      let stations: MonitoringStation[] = [];
      let isLiveFeed = false;
      let usedProvider: 'OPENAQ' | 'CPCB_CAAQMS' | 'MOCK_FIXTURE' = 'OPENAQ';

      try {
        stations = await openaqProvider.getNearbyStations(latitude, longitude, MAX_REPRESENTATIVE_DISTANCE_KM);
        if (stations.length > 0) {
          isLiveFeed = true;
          usedProvider = 'OPENAQ';
        }
      } catch {
        stations = [];
      }

      // 3. Fallback evaluation
      if (stations.length === 0) {
        // If an older database cache exists (up to 24h), serve it as STALE rather than failing
        const olderCached = await airQualityRepository.getLatestByLocation(latitude, longitude, 1440);
        if (olderCached) {
          const staleFreshness = evaluateFreshness(olderCached.measurementTimestamp);
          return {
            status: 'SUCCESS',
            provenanceStatus: 'STALE',
            data: this.reconstructRecordFromSnapshot(olderCached, staleFreshness, 'STALE'),
            notice: 'Live sensor telemetry is temporarily unavailable. Serving verified historical baseline from cache.',
          };
        }

        // HARD PRODUCTION BOUNDARY: In production, mock fixtures are strictly forbidden!
        if (isProduction || !allowFixture) {
          return {
            status: 'NO_DATA',
            provenanceStatus: 'NO_DATA',
            notice: `No verified continuous ambient air quality monitoring telemetry is currently available for coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)}). BreatheWise AI strictly adheres to verified environmental data and will not display fabricated numbers.`,
          };
        }

        // Test/Fixture mode explicitly enabled
        stations = await mockCpcbFixtureProvider.getNearbyStations(latitude, longitude, MAX_REPRESENTATIVE_DISTANCE_KM);
        usedProvider = 'MOCK_FIXTURE';
      }

      // 4. Select optimal monitoring station using Haversine & composite ranking
      const selection = selectBestStation(stations, latitude, longitude, MAX_REPRESENTATIVE_DISTANCE_KM);

      if (!selection.selected || !selection.isWithinRange) {
        return {
          status: 'NO_NEARBY_STATION',
          provenanceStatus: 'NO_DATA',
          notice: `No active continuous ambient air quality monitoring station is located within the ${MAX_REPRESENTATIVE_DISTANCE_KM} km representative radius of coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)}). BreatheWise AI strictly adheres to verified sensor data and will not display fabricated numbers.`,
        };
      }

      const station = selection.selected;

      // 5. Fetch telemetry measurements for the selected station
      let rawTelemetry: any = null;
      if (usedProvider === 'OPENAQ') {
        rawTelemetry = await openaqProvider.getLatestStationMeasurements(station.id);
      } else if (usedProvider === 'MOCK_FIXTURE' && allowFixture) {
        rawTelemetry = await mockCpcbFixtureProvider.getLatestStationMeasurements(station.id);
      }

      if (!rawTelemetry || !rawTelemetry.measurements) {
        return {
          status: 'NO_DATA',
          provenanceStatus: 'NO_DATA',
          notice: 'Monitoring station telemetry is temporarily unavailable from upstream providers.',
        };
      }

      // 6. Convert raw telemetry to CPCB calculation input
      const inputs: RawPollutantInput[] = [];
      for (const [code, m] of Object.entries(rawTelemetry.measurements)) {
        if (m && typeof (m as any).value === 'number') {
          inputs.push({
            pollutant: code as PollutantCode,
            value: (m as any).value,
            unit: (m as any).originalUnit || 'µg/m³',
            averagingPeriod: (m as any).averagingPeriod || '1_HOUR',
            measurementTimestampUtc: (m as any).observationTimestampUtc || (m as any).measurementTimestampUtc,
            rawParameterName: (m as any).rawParameterName,
          });
        }
      }

      // 7. Calculate CPCB NAQI and individual sub-indices
      const { measurements, aqiResult } = calculateCpcbAqi(inputs);

      // 8. Evaluate data freshness & construct 4-timestamp model
      const observationTimestampUtc = inputs[0]?.measurementTimestampUtc || new Date().toISOString();
      const freshness = evaluateFreshness(observationTimestampUtc);
      const timestamps = buildTelemetryTimestamps(observationTimestampUtc, new Date());

      const provenanceStatus: TelemetryProvenanceStatus =
        usedProvider === 'MOCK_FIXTURE'
          ? 'MOCK'
          : freshness.isStale
          ? 'STALE'
          : isLiveFeed
          ? 'LIVE'
          : 'CACHED';

      const record: CanonicalAirQualityRecord = {
        status: provenanceStatus,
        station: {
          ...station,
          distanceKm: selection.distanceKm ?? station.distanceKm,
        },
        measurements,
        cpcbAqi: aqiResult,
        timestamps,
        freshness: {
          state: freshness.state,
          ageMinutes: freshness.ageMinutes,
          isStale: freshness.isStale,
          measurementLocalTime: freshness.measurementLocalTime,
        },
        attribution: {
          provider:
            usedProvider === 'OPENAQ'
              ? 'OpenAQ v3 / CPCB Network'
              : usedProvider === 'MOCK_FIXTURE'
              ? 'CPCB CAAQMS Baseline [TEST FIXTURE]'
              : 'CPCB CAAQMS Station Network',
          upstreamOwner: station.operatingAgency,
          license: 'Open Database License (ODbL) / Government Open Data License (GODL) India',
          attributionUrl: 'https://cpcb.nic.in / https://openaq.org',
          isLiveFeed: usedProvider === 'OPENAQ',
          isSimulatedFallback: usedProvider === 'MOCK_FIXTURE',
          notice:
            usedProvider === 'MOCK_FIXTURE'
              ? 'DEMONSTRATION FIXTURE: Offline test baseline for verification purposes. Never permitted in production.'
              : 'Live continuous telemetry retrieved via OpenAQ v3 atmospheric ingestion pipeline.',
        },
      };

      // 9. Persist snapshot to database cache only if genuine observation (or allowed test run)
      if (usedProvider !== 'MOCK_FIXTURE' || process.env.NODE_ENV === 'test') {
        try {
          await airQualityRepository.saveSnapshot({
            latitude,
            longitude,
            stationId: station.id,
            stationName: station.name,
            sourceProvider: usedProvider,
            aqiValue: aqiResult.aqi,
            aqiCategory: aqiResult.category as any,
            dominantPollutant: aqiResult.dominantPollutant,
            pm25: measurements['PM2.5']?.normalizedValue ?? null,
            pm10: measurements['PM10']?.normalizedValue ?? null,
            no2: measurements['NO2']?.normalizedValue ?? null,
            o3: measurements['O3']?.normalizedValue ?? null,
            so2: measurements['SO2']?.normalizedValue ?? null,
            co: measurements['CO']?.normalizedValue ?? null,
            nh3: measurements['NH3']?.normalizedValue ?? null,
            pb: measurements['Pb']?.normalizedValue ?? null,
            distanceKm: selection.distanceKm,
            rawBreakdownJson: JSON.stringify(measurements),
            measurementTimestamp: new Date(timestamps.observationTimeUtc),
            isStale: freshness.isStale,
          });
        } catch {}
      }

      return {
        status: 'SUCCESS',
        provenanceStatus,
        data: record,
      };
    } catch (err: any) {
      return {
        status: 'PROVIDER_ERROR',
        provenanceStatus: 'NO_DATA',
        notice: `Air quality processing error: ${err?.message || 'Unknown internal error'}`,
      };
    }
  },

  /**
   * Helper to reconstruct a full CanonicalAirQualityRecord from a cached database snapshot
   */
  reconstructRecordFromSnapshot(
    snapshot: any,
    freshness: { state: FreshnessState; ageMinutes: number; isStale: boolean; measurementLocalTime?: string },
    provenanceStatus: TelemetryProvenanceStatus
  ): CanonicalAirQualityRecord {
    const inputs: RawPollutantInput[] = [];
    if (snapshot.pm25 !== null && snapshot.pm25 !== undefined) {
      inputs.push({ pollutant: 'PM2.5', value: snapshot.pm25, unit: 'µg/m³' });
    }
    if (snapshot.pm10 !== null && snapshot.pm10 !== undefined) {
      inputs.push({ pollutant: 'PM10', value: snapshot.pm10, unit: 'µg/m³' });
    }
    if (snapshot.no2 !== null && snapshot.no2 !== undefined) {
      inputs.push({ pollutant: 'NO2', value: snapshot.no2, unit: 'µg/m³' });
    }
    if (snapshot.o3 !== null && snapshot.o3 !== undefined) {
      inputs.push({ pollutant: 'O3', value: snapshot.o3, unit: 'µg/m³' });
    }
    if (snapshot.so2 !== null && snapshot.so2 !== undefined) {
      inputs.push({ pollutant: 'SO2', value: snapshot.so2, unit: 'µg/m³' });
    }
    if (snapshot.co !== null && snapshot.co !== undefined) {
      inputs.push({ pollutant: 'CO', value: snapshot.co, unit: 'mg/m³' });
    }
    if (snapshot.nh3 !== null && snapshot.nh3 !== undefined) {
      inputs.push({ pollutant: 'NH3', value: snapshot.nh3, unit: 'µg/m³' });
    }
    if (snapshot.pb !== null && snapshot.pb !== undefined) {
      inputs.push({ pollutant: 'Pb', value: snapshot.pb, unit: 'µg/m³' });
    }

    const { measurements, aqiResult } = calculateCpcbAqi(inputs);
    const timestamps = buildTelemetryTimestamps(
      snapshot.measurementTimestamp,
      snapshot.fetchedAt,
      snapshot.fetchedAt
    );

    return {
      status: provenanceStatus,
      station: {
        id: snapshot.stationId || 'cached_station',
        name: snapshot.stationName || 'Regional Telemetry Station',
        city: 'Regional Vicinity',
        state: 'India',
        operatingAgency: 'CPCB / SPCB',
        coordinates: { latitude: snapshot.latitude, longitude: snapshot.longitude },
        distanceKm: snapshot.distanceKm ?? undefined,
        supportedPollutants: inputs.map((i) => i.pollutant),
        hasLiveTelemetryFeed: false,
        sourceProvider: (snapshot.sourceProvider as any) || 'CPCB_CAAQMS',
      },
      measurements,
      cpcbAqi: aqiResult,
      timestamps,
      freshness: {
        state: freshness.state,
        ageMinutes: freshness.ageMinutes,
        isStale: freshness.isStale,
        measurementLocalTime: freshness.measurementLocalTime,
      },
      attribution: {
        provider: `${snapshot.sourceProvider} Telemetry Cache`,
        upstreamOwner: 'CPCB / State Pollution Control Board',
        license: 'Government Open Data License (GODL) India',
        attributionUrl: 'https://cpcb.nic.in',
        isLiveFeed: false,
        notice: 'Retrieved from verified local atmospheric telemetry cache.',
      },
    };
  },

  // Backwards compatibility for M2 US EPA evaluation
  calculateAqiFromPm25(pm25: number): { aqi: number; category: string } {
    if (pm25 < 0) return { aqi: 0, category: 'GOOD' };

    const EPA_BREAKPOINTS = [
      { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50, category: 'GOOD' },
      { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100, category: 'MODERATE' },
      { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150, category: 'UNHEALTHY_SENSITIVE' },
      { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200, category: 'UNHEALTHY' },
      { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300, category: 'VERY_UNHEALTHY' },
      { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500, category: 'HAZARDOUS' },
    ];

    const truncated = Math.floor(pm25 * 10) / 10;
    for (const bp of EPA_BREAKPOINTS) {
      if (truncated >= bp.cLow && truncated <= bp.cHigh) {
        const aqi = Math.round(
          ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (truncated - bp.cLow) + bp.iLow
        );
        return { aqi, category: bp.category };
      }
    }
    return { aqi: 500, category: 'HAZARDOUS' };
  },

  isReadingStale(measurementTimestamp: Date, maxAgeMinutes = 180): boolean {
    const ageMs = Date.now() - new Date(measurementTimestamp).getTime();
    return ageMs > maxAgeMinutes * 60 * 1000;
  },

  async recordSnapshot(data: AqiSnapshotInput) {
    const isStale = this.isReadingStale(data.measurementTimestamp);
    return airQualityRepository.saveSnapshot({
      ...data,
      isStale,
    });
  },

  async getLatestSnapshot(latitude: number, longitude: number) {
    return airQualityRepository.getLatestByLocation(latitude, longitude);
  },

  async getHistory(latitude: number, longitude: number, limit?: number) {
    return airQualityRepository.getRecentHistory(latitude, longitude, limit);
  },
};
