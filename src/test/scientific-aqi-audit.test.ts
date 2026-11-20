/**
 * BreatheWise AI — Scientific AQI Validation & Data Provenance Audit Suite
 * Module M4.1.2: CPCB Averaging Rules Correction & Final Scientific Verification
 * 
 * Verifies:
 * 1. CPCB 24-Hour valid data completeness requirement (>= 16 valid observation hours in 24-hr cycle)
 *    - Validates that non-continuous observation hours (with operational gaps) satisfy the CPCB standard.
 *    - Rejects < 16 valid observation hours.
 * 2. CPCB 8-Hour averaging for CO and O3:
 *    - Calculated using 8-hour running average over the active window [asOfTime - 8h, asOfTime].
 *    - Requires station to have >= 16 valid hours in the 24-hour cycle per official CPCB protocol.
 *    - Eliminates invented 6-hour threshold.
 * 3. Sample deduplication:
 *    - Multiple observations within the same hour bucket do NOT inflate validObservationHours.
 * 4. Station isolation:
 *    - Telemetry from different stations cannot be mixed or combined to meet completeness.
 * 5. Data integrity defense:
 *    - Rejection of future timestamps (> 5 min clock drift).
 *    - Rejection of negative concentrations and readings exceeding physical plausibility ceilings.
 * 6. Detailed PollutantCompletenessAudit model:
 *    - Full inspection of averagingPeriodHours, validObservationCount, validObservationHours,
 *      dataCoverageHours, completenessThresholdHours (16), isSubIndexEligible, subIndex, rejectionReason.
 * 7. Decoupling of 24-Hour Official Regulatory AQI from Acute 1-Hour Short-Term Indicator.
 * 8. 10 Production Data Safety Invariants.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  calculateOfficialCpcbAqi,
  calculateShortTermIndicator,
  calculateCpcbAqi,
  HourlySampleInput,
} from '@/lib/air-quality/cpcb-aqi';
import { airQualityService } from '@/services/air-quality.service';
import { airQualityRepository } from '@/repositories/air-quality.repository';
import prisma from '@/lib/db';

describe('M4.1.2 Scientific AQI Validation & CPCB Averaging Rules Audit', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv;
  });

  describe('1. CPCB Regulatory 24-Hour Completeness & Non-Continuous Averaging', () => {
    const baseDate = new Date('2026-11-20T12:00:00.000Z');

    it('rejects regulatory calculation when criteria completeness is < 16 hours (e.g. 15 hours)', () => {
      // 15 hourly samples (15 hours < 16 hours requirement)
      const samples: HourlySampleInput[] = [];
      for (let i = 0; i < 15; i++) {
        const time = new Date(baseDate.getTime() - i * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 85, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 160, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'NO2', value: 45, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples, baseDate);

      expect(result.status).toBe('INSUFFICIENT_COMPLETENESS');
      expect(result.aqi).toBeNull();
      expect(result.category).toBe('UNAVAILABLE');
      expect(result.isRegulatoryCompliant).toBe(false);
      expect(result.completenessHours).toBe(15);
      expect(result.minRequiredHours).toBe(16);
      expect(result.completenessThresholdHours).toBe(16);
      expect(result.reason).toContain('at least 16 hours of valid data');
    });

    it('approves regulatory calculation for consecutive 16 hours', () => {
      const samples: HourlySampleInput[] = [];
      for (let i = 0; i < 16; i++) {
        const time = new Date(baseDate.getTime() - i * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 85, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 160, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'NO2', value: 45, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples, baseDate);

      expect(result.status).toBe('AVAILABLE');
      expect(result.aqi).toBeGreaterThan(0);
      expect(result.category).not.toBe('UNAVAILABLE');
      expect(result.isRegulatoryCompliant).toBe(true);
      expect(result.completenessHours).toBe(16);
      expect(result.completenessThresholdHours).toBe(16);
    });

    it('SCIENTIFIC PROOF: approves non-continuous observation hours (16 distinct hours with gaps across 24h cycle)', () => {
      // Discontinuous hours: 16 non-consecutive hours with operational gaps
      // e.g. hours 0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 22
      const discontinuousHours = [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 22];
      expect(discontinuousHours.length).toBe(16);

      const samples: HourlySampleInput[] = [];
      for (const h of discontinuousHours) {
        const time = new Date(baseDate.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 75, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 140, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'SO2', value: 30, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples, baseDate);

      expect(result.status).toBe('AVAILABLE');
      expect(result.isRegulatoryCompliant).toBe(true);
      expect(result.completenessHours).toBe(16);
      expect(result.pollutantAudits?.['PM2.5']?.validObservationHours).toBe(16);
      expect(result.pollutantAudits?.['PM2.5']?.isSubIndexEligible).toBe(true);
      expect(result.reason).toContain('Satisfies official CPCB 24-hour regulatory data completeness');
    });

    it('rejects non-continuous observation hours when distinct valid hours < 16 (e.g. 15 hours with gaps)', () => {
      // 15 discontinuous hours with gaps
      const discontinuous15 = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 21, 22, 23, 1];
      expect(discontinuous15.length).toBe(15);

      const samples: HourlySampleInput[] = [];
      for (const h of discontinuous15) {
        const time = new Date(baseDate.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 75, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 140, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'SO2', value: 30, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples, baseDate);

      expect(result.status).toBe('INSUFFICIENT_COMPLETENESS');
      expect(result.aqi).toBeNull();
      expect(result.completenessHours).toBe(15);
      expect(result.isRegulatoryCompliant).toBe(false);
      expect(result.pollutantAudits?.['PM2.5']?.isSubIndexEligible).toBe(false);
      expect(result.pollutantAudits?.['PM2.5']?.rejectionReason).toContain('Insufficient valid observation hours (15/24 hrs)');
    });

    it('sample deduplication: multiple readings within the same hourly bucket do NOT inflate validObservationHours', () => {
      const samples: HourlySampleInput[] = [];
      // Create 3 readings within hour 0 (different minutes)
      samples.push(
        { pollutant: 'PM2.5', value: 80, unit: 'µg/m³', measurementTimestamp: new Date(baseDate.getTime() - 5 * 60 * 1000) },
        { pollutant: 'PM2.5', value: 84, unit: 'µg/m³', measurementTimestamp: new Date(baseDate.getTime() - 25 * 60 * 1000) },
        { pollutant: 'PM2.5', value: 88, unit: 'µg/m³', measurementTimestamp: new Date(baseDate.getTime() - 50 * 60 * 1000) }
      );
      // Plus 14 other distinct hours (total 15 distinct hours, even though total samples for PM2.5 = 17)
      for (let h = 2; h <= 15; h++) {
        const time = new Date(baseDate.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 80, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 150, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'NO2', value: 40, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples, baseDate);

      // Total PM2.5 observations received = 17, but valid observation hours = 15!
      expect(result.pollutantAudits?.['PM2.5']?.validObservationCount).toBe(17);
      expect(result.pollutantAudits?.['PM2.5']?.validObservationHours).toBe(15);
      expect(result.pollutantAudits?.['PM2.5']?.isSubIndexEligible).toBe(false);
      expect(result.status).toBe('INSUFFICIENT_COMPLETENESS');
    });

    it('calculates accurate 24-hour regulatory average for a full 24-hour observation cycle', () => {
      const samples: HourlySampleInput[] = [];
      for (let i = 0; i < 24; i++) {
        const time = new Date(baseDate.getTime() - i * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 80 + (i % 20), unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 150, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'NO2', value: 40, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples, baseDate);

      expect(result.status).toBe('AVAILABLE');
      expect(result.isRegulatoryCompliant).toBe(true);
      expect(result.completenessHours).toBe(24);
      expect(result.dominantPollutant).toBe('PM2.5');
      expect(result.pollutantAudits?.['PM2.5']?.validObservationHours).toBe(24);
      expect(result.pollutantAudits?.['PM2.5']?.isSubIndexEligible).toBe(true);
    });

    it('CO and O3 averaging: maps 8-hour running mean when 16-hour 24h cycle completeness is satisfied', () => {
      const samples: HourlySampleInput[] = [];
      // 16 distinct hours in the 24h cycle
      for (let i = 0; i < 16; i++) {
        const time = new Date(baseDate.getTime() - i * 60 * 60 * 1000);
        // Vary CO: first 8 hours (0-7) have value 2.0 mg/m³, remaining hours (8-15) have value 4.0 mg/m³
        const coVal = i < 8 ? 2.0 : 4.0;
        const o3Val = i < 8 ? 60.0 : 120.0;
        samples.push(
          { pollutant: 'CO', value: coVal, unit: 'mg/m³', measurementTimestamp: time },
          { pollutant: 'O3', value: o3Val, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM2.5', value: 75, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples, baseDate);

      expect(result.status).toBe('AVAILABLE');
      expect(result.subIndices['CO']).not.toBeNull();
      expect(result.subIndices['O3']).not.toBeNull();

      const coAudit = result.pollutantAudits?.['CO'];
      expect(coAudit?.averagingPeriodHours).toBe(8);
      expect(coAudit?.observationWindowHours).toBe(24);
      expect(coAudit?.validObservationHours).toBe(16);
      expect(coAudit?.completenessThresholdHours).toBe(16);
      expect(coAudit?.isSubIndexEligible).toBe(true);
      // The 8-hour running average for CO should be ~2.0 mg/m³ (from active 8-hour window 0-7)
      expect(coAudit?.concentration).toBeCloseTo(2.0, 1);

      const o3Audit = result.pollutantAudits?.['O3'];
      expect(o3Audit?.averagingPeriodHours).toBe(8);
      expect(o3Audit?.validObservationHours).toBe(16);
      expect(o3Audit?.isSubIndexEligible).toBe(true);
      expect(o3Audit?.concentration).toBeCloseTo(60.0, 1);
    });

    it('CO and O3: rejects sub-index if station records < 16 hours in 24h cycle (no invented 6-hour threshold)', () => {
      // 6 hours of CO/O3 (which formerly passed under the invalid 6-hour threshold)
      const samples6h: HourlySampleInput[] = [];
      for (let i = 0; i < 6; i++) {
        const time = new Date(baseDate.getTime() - i * 60 * 60 * 1000);
        samples6h.push(
          { pollutant: 'CO', value: 2.0, unit: 'mg/m³', measurementTimestamp: time },
          { pollutant: 'O3', value: 60, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples6h, baseDate);

      // Under official CPCB rules, 6 hours in the 24h cycle is INSUFFICIENT for calculating a sub-index
      expect(result.subIndices['CO']).toBeNull();
      expect(result.subIndices['O3']).toBeNull();
      expect(result.pollutantAudits?.['CO']?.isSubIndexEligible).toBe(false);
      expect(result.pollutantAudits?.['CO']?.rejectionReason).toContain('requires at least 16 valid observation hours');
      expect(result.pollutantAudits?.['O3']?.isSubIndexEligible).toBe(false);
    });

    it('station isolation: rejects telemetry from different stations when targetStationId is specified', () => {
      const samples: HourlySampleInput[] = [];
      // Station A has 10 hours
      for (let i = 0; i < 10; i++) {
        const time = new Date(baseDate.getTime() - i * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 80, unit: 'µg/m³', measurementTimestamp: time, stationId: 'station_A' },
          { pollutant: 'PM10', value: 150, unit: 'µg/m³', measurementTimestamp: time, stationId: 'station_A' },
          { pollutant: 'NO2', value: 40, unit: 'µg/m³', measurementTimestamp: time, stationId: 'station_A' }
        );
      }
      // Station B has 8 hours
      for (let i = 10; i < 18; i++) {
        const time = new Date(baseDate.getTime() - i * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 80, unit: 'µg/m³', measurementTimestamp: time, stationId: 'station_B' },
          { pollutant: 'PM10', value: 150, unit: 'µg/m³', measurementTimestamp: time, stationId: 'station_B' },
          { pollutant: 'NO2', value: 40, unit: 'µg/m³', measurementTimestamp: time, stationId: 'station_B' }
        );
      }

      // If stations were mixed, total hours = 18 (>= 16).
      // But with station isolation for station_A, station_B samples are rejected!
      const resultStationA = calculateOfficialCpcbAqi(samples, baseDate, 'station_A');

      expect(resultStationA.status).toBe('INSUFFICIENT_COMPLETENESS');
      expect(resultStationA.completenessHours).toBe(10);
      expect(resultStationA.isRegulatoryCompliant).toBe(false);
    });

    it('rejects future timestamps (> 5 min) and physical ceiling violations', () => {
      const samples: HourlySampleInput[] = [];
      // 16 valid hours
      for (let i = 0; i < 16; i++) {
        const time = new Date(baseDate.getTime() - i * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 80, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 150, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'NO2', value: 40, unit: 'µg/m³', measurementTimestamp: time }
        );
      }
      // Corrupt sample: future timestamp (+15 min)
      samples.push({
        pollutant: 'PM2.5',
        value: 999,
        unit: 'µg/m³',
        measurementTimestamp: new Date(baseDate.getTime() + 15 * 60 * 1000),
      });
      // Corrupt sample: physically impossible ceiling violation (PM2.5 > 2000 µg/m³)
      samples.push({
        pollutant: 'PM2.5',
        value: 5000,
        unit: 'µg/m³',
        measurementTimestamp: new Date(baseDate.getTime() - 2 * 60 * 60 * 1000),
      });
      // Corrupt sample: negative reading
      samples.push({
        pollutant: 'PM2.5',
        value: -50,
        unit: 'µg/m³',
        measurementTimestamp: new Date(baseDate.getTime() - 3 * 60 * 60 * 1000),
      });

      const result = calculateOfficialCpcbAqi(samples, baseDate);

      // Calculation passes on the 16 valid hours; corrupt values are excluded
      expect(result.status).toBe('AVAILABLE');
      expect(result.completenessHours).toBe(16);
      expect(result.pollutantAudits?.['PM2.5']?.concentration).toBe(80);
    });
  });

  describe('2. Decoupling Official CPCB AQI from Acute Short-Term Indicator', () => {
    it('single hourly measurement yields null Official AQI and valid Short-Term Indicator', () => {
      const inputs = [
        { pollutant: 'PM2.5' as const, value: 110, unit: 'µg/m³' },
        { pollutant: 'PM10' as const, value: 220, unit: 'µg/m³' },
        { pollutant: 'NO2' as const, value: 60, unit: 'µg/m³' },
      ];

      const { aqiResult, officialCpcbAqi, shortTermIndicator } = calculateCpcbAqi(inputs);

      // Official 24-hour regulatory AQI must be UNAVAILABLE due to completeness
      expect(officialCpcbAqi.status).toBe('INSUFFICIENT_COMPLETENESS');
      expect(officialCpcbAqi.aqi).toBeNull();
      expect(officialCpcbAqi.category).toBe('UNAVAILABLE');
      expect(officialCpcbAqi.isRegulatoryCompliant).toBe(false);
      expect(officialCpcbAqi.completenessThresholdHours).toBe(16.0);
      expect(officialCpcbAqi.reason).toContain('minimum 16 hours of valid data');

      // Short-Term 1-Hour Indicator must be AVAILABLE
      expect(shortTermIndicator.status).toBe('AVAILABLE');
      expect(shortTermIndicator.indicatorValue).toBeGreaterThan(0);
      expect(shortTermIndicator.observationPeriod).toBe('1_HOUR');
      expect(shortTermIndicator.label).toBe('Short-Term Air Quality Indicator (1-Hour Acute Proxy)');

      // Backward compatible alias matches the short-term indicator
      expect(aqiResult.aqi).toBe(shortTermIndicator.indicatorValue);
      expect(aqiResult.isInstantaneousProxy).toBe(true);
    });

    it('rejects calculation if mandatory particulate parameter (PM2.5 or PM10) is absent', () => {
      const inputsWithoutPM = [
        { pollutant: 'NO2' as const, value: 65, unit: 'µg/m³' },
        { pollutant: 'SO2' as const, value: 45, unit: 'µg/m³' },
        { pollutant: 'CO' as const, value: 1.8, unit: 'mg/m³' },
      ];

      const indicator = calculateShortTermIndicator(inputsWithoutPM);

      expect(indicator.status).toBe('INSUFFICIENT_DATA');
      expect(indicator.indicatorValue).toBeNull();
      expect(indicator.category).toBe('INSUFFICIENT_DATA');
    });
  });

  describe('3. Production Data Safety & Provenance Invariants (10 Invariants)', () => {
    it('Invariant 1: Development seed records are never labeled LIVE', async () => {
      const seedRecords = await airQualityRepository.getSnapshotsByProvenance('DEVELOPMENT_SEED');
      expect(seedRecords.length).toBeGreaterThan(0);

      const record = seedRecords[0];
      expect(record.provenanceType).toBe('DEVELOPMENT_SEED');

      const reconstructed = airQualityService.reconstructRecordFromSnapshot(
        record,
        { state: 'CURRENT', ageMinutes: 10, isStale: false },
        'CACHED',
        'DEVELOPMENT_SEED'
      );

      expect(reconstructed.status).not.toBe('LIVE');
      expect(reconstructed.provenanceType).toBe('DEVELOPMENT_SEED');
      expect(reconstructed.attribution.isLiveFeed).toBe(false);
    });

    it('Invariant 2: Synthetic fixtures are never served in production mode', async () => {
      (process.env as any).NODE_ENV = 'production';

      const result = await airQualityService.getAirQuality(23.2156, 72.6369, 'Gandhinagar', {
        allowFixture: true,
      });

      expect(result.provenanceStatus).not.toBe('MOCK');
      if (result.status === 'SUCCESS') {
        expect(result.data?.provenanceType).not.toBe('SYNTHETIC_FIXTURE');
      }
    });

    it('Invariant 3: Zero-fabrication honest NO_DATA when no station is nearby', async () => {
      (process.env as any).NODE_ENV = 'production';

      const result = await airQualityService.getAirQuality(5.0, 75.0);

      expect(result.status).toBe('NO_DATA');
      expect(result.provenanceStatus).toBe('NO_DATA');
      expect(result.data).toBeUndefined();
      expect(result.notice).toContain('will not display fabricated numbers');
    });

    it('Invariant 4: Observation timestamp is strictly decoupled from ingestion time', async () => {
      const pastTime = new Date('2026-11-20T08:00:00.000Z');
      const testSnapshot = await airQualityRepository.saveSnapshot({
        latitude: 28.50,
        longitude: 77.10,
        stationId: 'test_timestamp_decouple_stn',
        stationName: 'Test Decouple Station',
        sourceProvider: 'CPCB',
        provenanceType: 'HISTORICAL_IMPORTED',
        aqiValue: 180,
        aqiCategory: 'MODERATELY_POLLUTED',
        dominantPollutant: 'PM2.5',
        pm25: 75.0,
        pm10: 120.0,
        no2: 35.0,
        measurementTimestamp: pastTime,
        isStale: false,
      });

      expect(testSnapshot.measurementTimestamp.toISOString()).toBe(pastTime.toISOString());
      expect(testSnapshot.fetchedAt.getTime()).toBeGreaterThan(pastTime.getTime());

      await prisma.airQualitySnapshot.deleteMany({
        where: { stationId: 'test_timestamp_decouple_stn' },
      });
    });

    it('Invariant 5: Historical imported records retain HISTORICAL_IMPORTED provenance', async () => {
      const testImport = await airQualityRepository.saveSnapshot({
        latitude: 28.45,
        longitude: 77.05,
        stationId: 'test_historical_import_stn',
        sourceProvider: 'CPCB_CAAQMS',
        provenanceType: 'HISTORICAL_IMPORTED',
        aqiValue: 210,
        aqiCategory: 'POOR',
        pm25: 95.0,
        pm10: 180.0,
        no2: 40.0,
        measurementTimestamp: new Date(Date.now() - 5 * 3600 * 1000),
        isStale: true,
      });

      const retrieved = await prisma.airQualitySnapshot.findUnique({
        where: { id: testImport.id },
      });

      expect(retrieved?.provenanceType).toBe('HISTORICAL_IMPORTED');

      await prisma.airQualitySnapshot.deleteMany({
        where: { stationId: 'test_historical_import_stn' },
      });
    });

    it('Invariant 6: Minimum 16 hours valid data completeness rule is strictly enforced (non-continuous data accepted)', () => {
      const baseDate = new Date();
      const samples15: HourlySampleInput[] = [];
      for (let i = 0; i < 15; i++) {
        const time = new Date(baseDate.getTime() - i * 3600 * 1000);
        samples15.push(
          { pollutant: 'PM2.5', value: 50, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 100, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'NO2', value: 30, unit: 'µg/m³', measurementTimestamp: time }
        );
      }
      const res = calculateOfficialCpcbAqi(samples15, baseDate);
      expect(res.isRegulatoryCompliant).toBe(false);
      expect(res.aqi).toBeNull();
      expect(res.completenessThresholdHours).toBe(16);
    });

    it('Invariant 7: Station mixing rejection prevents disparate stations from aggregating', () => {
      const baseDate = new Date();
      const multiStationSamples: HourlySampleInput[] = [
        { pollutant: 'PM2.5', value: 50, unit: 'µg/m³', measurementTimestamp: baseDate, stationId: 'station_delhi_1' },
        { pollutant: 'PM10', value: 100, unit: 'µg/m³', measurementTimestamp: baseDate, stationId: 'station_delhi_2' },
        { pollutant: 'NO2', value: 30, unit: 'µg/m³', measurementTimestamp: baseDate, stationId: 'station_delhi_3' },
      ];
      // Target station is station_delhi_1
      const res = calculateOfficialCpcbAqi(multiStationSamples, baseDate, 'station_delhi_1');
      expect(res.pollutantAudits?.['PM10']).toBeUndefined();
      expect(res.pollutantAudits?.['NO2']).toBeUndefined();
      expect(res.pollutantAudits?.['PM2.5']?.validObservationHours).toBe(1);
    });

    it('Invariant 8: Future timestamps exceeding 5 minutes are rejected', () => {
      const baseDate = new Date();
      const futureSamples: HourlySampleInput[] = [
        {
          pollutant: 'PM2.5',
          value: 50,
          unit: 'µg/m³',
          measurementTimestamp: new Date(baseDate.getTime() + 10 * 60 * 1000), // +10 min
        },
      ];
      const res = calculateOfficialCpcbAqi(futureSamples, baseDate);
      expect(res.pollutantAudits?.['PM2.5']).toBeUndefined();
    });

    it('Invariant 9: Negative concentrations and physical ceiling violations are rejected', () => {
      const baseDate = new Date();
      const invalidSamples: HourlySampleInput[] = [
        { pollutant: 'PM2.5', value: -25, unit: 'µg/m³', measurementTimestamp: baseDate },
        { pollutant: 'PM10', value: 99999, unit: 'µg/m³', measurementTimestamp: baseDate },
      ];
      const res = calculateOfficialCpcbAqi(invalidSamples, baseDate);
      expect(res.pollutantAudits?.['PM2.5']).toBeUndefined();
      expect(res.pollutantAudits?.['PM10']).toBeUndefined();
    });

    it('Invariant 10: Mandatory PM requirement (PM2.5 or PM10) enforced', () => {
      const baseDate = new Date();
      const gaseousOnly: HourlySampleInput[] = [];
      for (let i = 0; i < 20; i++) {
        const time = new Date(baseDate.getTime() - i * 3600 * 1000);
        gaseousOnly.push(
          { pollutant: 'NO2', value: 30, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'SO2', value: 20, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'NH3', value: 40, unit: 'µg/m³', measurementTimestamp: time }
        );
      }
      const res = calculateOfficialCpcbAqi(gaseousOnly, baseDate);
      expect(res.status).toBe('INSUFFICIENT_POLLUTANTS');
      expect(res.aqi).toBeNull();
      expect(res.hasParticulate).toBe(false);
      expect(res.reason).toContain('mandatory PM2.5 or PM10');
    });
  });
});
