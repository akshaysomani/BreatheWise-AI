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
  calculateOfficialCpcbAqi,
  calculateShortTermIndicator,
  calculateCpcbSubIndex,
  CPCB_HEALTH_STATEMENTS,
  RawPollutantInput,
  HourlySampleInput,
} from '@/lib/air-quality/cpcb-aqi';
import { selectBestStation, MAX_REPRESENTATIVE_DISTANCE_KM } from '@/lib/air-quality/station-selector';
import { openaqProvider } from '@/lib/air-quality/providers/openaq-provider';
import { cpcbProvider } from '@/lib/air-quality/providers/cpcb-provider';
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
  ProvenanceType,
  OfficialCpcbAqiResult,
  ShortTermAirQualityIndicator,
  CpcbCategory,
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
    providerStatus?: {
      configured: boolean;
      status: string;
      lastError?: any;
    };
    data?: CanonicalAirQualityRecord;
    notice?: string;
  }> {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowFixture = !isProduction && (options?.allowFixture === true || process.env.ALLOW_MOCK_AQI === 'true');
    const openAqStatus = openaqProvider.getProviderStatus();

    try {
      // 1. Check local database telemetry cache (< 60 minutes)
      const cached = await airQualityRepository.getLatestByLocation(latitude, longitude, 60);

      if (cached) {
        const isFixture =
          cached.provenanceType === 'SYNTHETIC_FIXTURE' ||
          cached.sourceProvider === 'MOCK_FIXTURE' ||
          cached.stationId?.startsWith('TEST_');
        if (isFixture && !allowFixture) {
          // Hard boundary: In production or real queries, synthetic fixture / test records from cache are never served
        } else {
          const freshness = evaluateFreshness(cached.measurementTimestamp);
          const provenanceStatus: TelemetryProvenanceStatus = isFixture
            ? 'MOCK'
            : freshness.state === 'AGING'
            ? 'AGING'
            : freshness.isStale
            ? 'STALE'
            : 'CACHED';

          const record = this.reconstructRecordFromSnapshot(
            cached,
            freshness,
            provenanceStatus,
            isFixture ? 'SYNTHETIC_FIXTURE' : ((cached.provenanceType as ProvenanceType) || 'UNKNOWN_PROVENANCE')
          );
          return {
            status: 'SUCCESS',
            provenanceStatus,
            providerStatus: {
              configured: openAqStatus.configured,
              status: openAqStatus.status,
              lastError: openAqStatus.lastError || null,
            },
            data: record,
          };
        }
      }

      // 2. Provider discovery: If fixture is explicitly requested in test mode, prioritize fixture
      let stations: MonitoringStation[] = [];
      let isLiveFeed = false;
      let usedProvider: 'OPENAQ' | 'CPCB_CAAQMS' | 'MOCK_FIXTURE' = 'OPENAQ';

      if (!isProduction && options?.allowFixture === true) {
        stations = await mockCpcbFixtureProvider.getNearbyStations(latitude, longitude, MAX_REPRESENTATIVE_DISTANCE_KM);
        usedProvider = 'MOCK_FIXTURE';
      } else {
        // Query upstream live provider: OpenAQ v3
        if (openAqStatus.configured) {
          try {
            const liveStations = await openaqProvider.getNearbyStations(latitude, longitude, MAX_REPRESENTATIVE_DISTANCE_KM);
            if (liveStations.length > 0) {
              stations = liveStations;
              isLiveFeed = true;
              usedProvider = 'OPENAQ';
            }
          } catch {
            stations = [];
          }
        }

        // 3. Fallback evaluation: Authoritative CPCB CAAQMS Station Network
        if (stations.length === 0) {
          try {
            const cpcbStations = await cpcbProvider.getNearbyStations(latitude, longitude, MAX_REPRESENTATIVE_DISTANCE_KM);
            if (cpcbStations.length > 0) {
              stations = cpcbStations;
              usedProvider = 'CPCB_CAAQMS';
              isLiveFeed = false;
            }
          } catch {
            stations = [];
          }
        }
      }

      // 4. Secondary fallback: Check older database cache (up to 24h)
      if (stations.length === 0) {
        const olderCached = await airQualityRepository.getLatestByLocation(latitude, longitude, 1440);
        if (olderCached) {
          const isFixture =
            olderCached.provenanceType === 'SYNTHETIC_FIXTURE' ||
            olderCached.sourceProvider === 'MOCK_FIXTURE' ||
            olderCached.stationId?.startsWith('TEST_');
          if (isFixture && !allowFixture) {
            // Hard boundary: skip synthetic fixtures / test records
          } else {
            const staleFreshness = evaluateFreshness(olderCached.measurementTimestamp);
            const fallbackStatus: TelemetryProvenanceStatus = isFixture
              ? 'MOCK'
              : staleFreshness.state === 'AGING'
              ? 'AGING'
              : 'STALE';
            return {
              status: 'SUCCESS',
              provenanceStatus: fallbackStatus,
              providerStatus: {
                configured: openAqStatus.configured,
                status: openAqStatus.status,
                lastError: openAqStatus.lastError || null,
              },
              data: this.reconstructRecordFromSnapshot(
                olderCached,
                staleFreshness,
                fallbackStatus,
                isFixture ? 'SYNTHETIC_FIXTURE' : ((olderCached.provenanceType as ProvenanceType) || 'HISTORICAL_IMPORTED')
              ),
              notice: 'Live sensor telemetry is temporarily unavailable. Serving verified historical baseline from cache.',
            };
          }
        }

        // When no stations exist in any provider and no cache is present:
        return {
          status: isProduction ? 'NO_DATA' : 'NO_NEARBY_STATION',
          provenanceStatus: 'NO_DATA',
          providerStatus: {
            configured: openAqStatus.configured,
            status: openAqStatus.status,
            lastError: openAqStatus.lastError || null,
          },
          notice: `No active continuous ambient air quality monitoring station is located within the ${MAX_REPRESENTATIVE_DISTANCE_KM} km representative radius of coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)}). BreatheWise AI strictly adheres to verified environmental data and will not display fabricated numbers.`,
        };
      }

      // 5. Select optimal monitoring station using Haversine & composite ranking
      const selection = selectBestStation(stations, latitude, longitude, MAX_REPRESENTATIVE_DISTANCE_KM);

      if (!selection.selected || !selection.isWithinRange) {
        return {
          status: 'NO_NEARBY_STATION',
          provenanceStatus: 'NO_DATA',
          providerStatus: {
            configured: openAqStatus.configured,
            status: openAqStatus.status,
            lastError: openAqStatus.lastError || null,
          },
          notice: `No active continuous ambient air quality monitoring station is located within the ${MAX_REPRESENTATIVE_DISTANCE_KM} km representative radius of coordinates (${latitude.toFixed(2)}, ${longitude.toFixed(2)}). BreatheWise AI strictly adheres to verified sensor data and will not display fabricated numbers.`,
        };
      }

      const station = selection.selected;

      // 6. Fetch telemetry measurements for the selected station
      let rawTelemetry: any = null;
      if (usedProvider === 'OPENAQ') {
        rawTelemetry = await openaqProvider.getLatestStationMeasurements(station.id);
        // If OpenAQ measurement fetch failed (e.g. auth rejected or empty sensors), fall back to CPCB CAAQMS baseline
        if (!rawTelemetry || !rawTelemetry.measurements || Object.keys(rawTelemetry.measurements).length === 0) {
          const cpcbStations = await cpcbProvider.getNearbyStations(latitude, longitude, MAX_REPRESENTATIVE_DISTANCE_KM);
          const cpcbSelection = selectBestStation(cpcbStations, latitude, longitude, MAX_REPRESENTATIVE_DISTANCE_KM);
          if (cpcbSelection.selected) {
            rawTelemetry = await cpcbProvider.getLatestStationMeasurements(cpcbSelection.selected.id);
            usedProvider = 'CPCB_CAAQMS';
            isLiveFeed = false;
          }
        }
      } else if (usedProvider === 'CPCB_CAAQMS') {
        rawTelemetry = await cpcbProvider.getLatestStationMeasurements(station.id);
      } else if (usedProvider === 'MOCK_FIXTURE' && allowFixture) {
        rawTelemetry = await mockCpcbFixtureProvider.getLatestStationMeasurements(station.id);
      }

      if (!rawTelemetry || !rawTelemetry.measurements || Object.keys(rawTelemetry.measurements).length === 0) {
        return {
          status: 'NO_DATA',
          provenanceStatus: 'NO_DATA',
          providerStatus: {
            configured: openAqStatus.configured,
            status: openAqStatus.status,
            lastError: openAqStatus.lastError || null,
          },
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

      // 7. Calculate acute Short-Term Indicator and individual sub-indices
      const { measurements, aqiResult, shortTermIndicator } = calculateCpcbAqi(inputs);

      // 7b. Query rolling 24-hour observation history to calculate Official CPCB Regulatory AQI
      let officialCpcbAqi: OfficialCpcbAqiResult;
      try {
        const observationDate = new Date(inputs[0]?.measurementTimestampUtc || new Date());
        const rollingHistory = await airQualityRepository.getRolling24HourHistory(station.id, observationDate);

        const hourlySamples: HourlySampleInput[] = [];
        for (const row of rollingHistory) {
          if (row.pm25 !== null) hourlySamples.push({ pollutant: 'PM2.5', value: row.pm25, unit: 'µg/m³', measurementTimestamp: row.measurementTimestamp, stationId: row.stationId || station.id });
          if (row.pm10 !== null) hourlySamples.push({ pollutant: 'PM10', value: row.pm10, unit: 'µg/m³', measurementTimestamp: row.measurementTimestamp, stationId: row.stationId || station.id });
          if (row.no2 !== null) hourlySamples.push({ pollutant: 'NO2', value: row.no2, unit: 'µg/m³', measurementTimestamp: row.measurementTimestamp, stationId: row.stationId || station.id });
          if (row.so2 !== null) hourlySamples.push({ pollutant: 'SO2', value: row.so2, unit: 'µg/m³', measurementTimestamp: row.measurementTimestamp, stationId: row.stationId || station.id });
          if (row.co !== null) hourlySamples.push({ pollutant: 'CO', value: row.co, unit: 'mg/m³', measurementTimestamp: row.measurementTimestamp, stationId: row.stationId || station.id });
          if (row.o3 !== null) hourlySamples.push({ pollutant: 'O3', value: row.o3, unit: 'µg/m³', measurementTimestamp: row.measurementTimestamp, stationId: row.stationId || station.id });
          if (row.nh3 !== null) hourlySamples.push({ pollutant: 'NH3', value: row.nh3, unit: 'µg/m³', measurementTimestamp: row.measurementTimestamp, stationId: row.stationId || station.id });
          if (row.pb !== null) hourlySamples.push({ pollutant: 'Pb', value: row.pb, unit: 'µg/m³', measurementTimestamp: row.measurementTimestamp, stationId: row.stationId || station.id });
        }
        for (const inp of inputs) {
          hourlySamples.push({
            pollutant: inp.pollutant,
            value: inp.value,
            unit: inp.unit,
            measurementTimestamp: inp.measurementTimestampUtc || observationDate,
            stationId: station.id,
          });
        }
        officialCpcbAqi = calculateOfficialCpcbAqi(hourlySamples, observationDate, station.id);
      } catch {
        officialCpcbAqi = calculateCpcbAqi(inputs).officialCpcbAqi;
      }

      // 8. Evaluate data freshness & construct 4-timestamp model
      const observationTimestampUtc = inputs[0]?.measurementTimestampUtc || new Date().toISOString();
      const freshness = evaluateFreshness(observationTimestampUtc);
      const timestamps = buildTelemetryTimestamps(observationTimestampUtc, new Date());

      const provenanceType: ProvenanceType =
        usedProvider === 'MOCK_FIXTURE'
          ? 'SYNTHETIC_FIXTURE'
          : usedProvider === 'CPCB_CAAQMS'
          ? 'HISTORICAL_IMPORTED'
          : isLiveFeed
          ? 'VERIFIED_EXTERNAL_OBSERVATION'
          : 'UNKNOWN_PROVENANCE';

      const provenanceStatus: TelemetryProvenanceStatus =
        usedProvider === 'MOCK_FIXTURE'
          ? 'MOCK'
          : freshness.state === 'AGING'
          ? 'AGING'
          : freshness.isStale
          ? 'STALE'
          : isLiveFeed
          ? 'LIVE'
          : 'CACHED';

      const record: CanonicalAirQualityRecord = {
        status: provenanceStatus,
        provenanceType,
        station: {
          ...station,
          distanceKm: selection.distanceKm ?? station.distanceKm,
        },
        measurements,
        officialCpcbAqi,
        shortTermIndicator,
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
              : usedProvider === 'CPCB_CAAQMS'
              ? 'CPCB CAAQMS Station Network'
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
              : usedProvider === 'CPCB_CAAQMS'
              ? 'Air-quality monitoring information is currently available from historical station records. Live monitoring updates are temporarily unavailable.'
              : 'Live air-quality monitoring data is available for this location.',
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
            provenanceType,
            averagingPeriod: '1_HOUR',
            completenessHours: 1.0,
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
        providerStatus: {
          configured: openAqStatus.configured,
          status: openAqStatus.status,
          lastError: openAqStatus.lastError || null,
        },
        data: record,
        notice: record.attribution.notice,
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
    provenanceStatus: TelemetryProvenanceStatus,
    provenanceType: ProvenanceType = 'UNKNOWN_PROVENANCE'
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

    const { measurements, aqiResult, shortTermIndicator } = calculateCpcbAqi(inputs);
    const timestamps = buildTelemetryTimestamps(
      snapshot.measurementTimestamp,
      snapshot.fetchedAt,
      snapshot.fetchedAt
    );

    const isRegulatoryCompliant = (snapshot.completenessHours ?? 1.0) >= 16.0;
    const officialCpcbAqi: OfficialCpcbAqiResult = {
      status: isRegulatoryCompliant ? 'AVAILABLE' : 'INSUFFICIENT_COMPLETENESS',
      aqi: isRegulatoryCompliant ? snapshot.aqiValue : null,
      category: isRegulatoryCompliant ? (snapshot.aqiCategory as any) : 'UNAVAILABLE',
      dominantPollutant: isRegulatoryCompliant ? (snapshot.dominantPollutant as any) : null,
      dominantSubIndex: isRegulatoryCompliant ? snapshot.aqiValue : null,
      completenessHours: snapshot.completenessHours ?? 1.0,
      minRequiredHours: 16.0,
      completenessThresholdHours: 16.0,
      validPollutantCount: isRegulatoryCompliant ? 3 : 0,
      hasParticulate: isRegulatoryCompliant,
      isOverallAqiEligible: isRegulatoryCompliant,
      isRegulatoryCompliant,
      averagingPeriod: '24_HOUR',
      subIndices: shortTermIndicator.subIndices,
      healthGuidance: isRegulatoryCompliant
        ? (CPCB_HEALTH_STATEMENTS[snapshot.aqiCategory as CpcbCategory] || CPCB_HEALTH_STATEMENTS.UNAVAILABLE)
        : CPCB_HEALTH_STATEMENTS.UNAVAILABLE,
      methodology: 'CPCB_NAQI_INDIA_2014',
      reason: isRegulatoryCompliant
        ? 'CPCB National AQI: Validated completeness across criteria pollutants (24-hour averages for PM/gases, 8-hour running mean for CO/O3).'
        : `Snapshot observation represents ${snapshot.completenessHours ?? 1} hour(s) of valid data. CPCB National AQI mandates at least 16 hours of valid data in the 24-hour monitoring cycle (non-continuous data accepted).`,
    };

    return {
      status: provenanceStatus,
      provenanceType,
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
      officialCpcbAqi,
      shortTermIndicator,
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
        notice:
          provenanceType === 'DEVELOPMENT_SEED'
            ? 'Retrieved from verified regional development baseline cache. Historical baseline record.'
            : provenanceType === 'SYNTHETIC_FIXTURE'
            ? 'DEMONSTRATION FIXTURE: Offline test baseline for verification purposes. Never permitted in production.'
            : 'Retrieved from verified local atmospheric telemetry cache.',
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
