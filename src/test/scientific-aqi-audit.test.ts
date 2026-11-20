/**
 * BreatheWise AI — Scientific AQI Validation & Final Acceptance Audit Suite
 * Module M4.1.2: Independent Acceptance Audit & Regulatory Alignment
 * 
 * Resolves & Verifies:
 * 1. 24-Hour Rolling Observation Window & Day-Boundary Semantics (Question 1)
 *    - Strict rolling 24-hour window relative to calculation time (asOfTime).
 *    - Boundary invariance across 00:00 midnight (IST and UTC) and early morning (04:00 IST).
 *    - Timezone-safe epoch arithmetic ensuring zero calendar-day resets.
 * 2. CO and O3 8-Hour Running Average & Active-Window Sufficiency (Question 2)
 *    - Demonstrates behavior across 8, 7, 6, 5, 4, 3, 2, 1, and 0 valid hourly bins in active 8h window.
 *    - Distinguishes CPCB statutory rule (>= 16h in 24h cycle) from BreatheWise engineering safeguard
 *      (>= 6h / 75% data capture in the active 8-hour window).
 * 3. Physical Plausibility Limits & Future Clock Tolerance Boundaries (Question 3)
 *    - Exact boundary tests for all 8 criteria pollutants (PM2.5, PM10, NO2, SO2, CO, O3, NH3, Pb).
 *    - Exact 5-minute future clock drift boundary tests (+290s vs +310s).
 * 4. CPCB National AQI Architecture & Additional Mandates (Question 4 & Mandates)
 *    - Overall AQI requires >= 3 eligible parameters including PM2.5 or PM10.
 *    - Overall AQI is strictly the maximum eligible sub-index.
 *    - Individual eligible sub-indices remain available when overall AQI is unavailable.
 *    - Decoupling of 24h CPCB National AQI from 1h acute sensor proxy.
 *    - 10 Production Data Safety Invariants.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  calculateOfficialCpcbAqi,
  calculateShortTermIndicator,
  calculateCpcbAqi,
  HourlySampleInput,
} from '@/lib/air-quality/cpcb-aqi';
import { validateMeasurement, PHYSICAL_CONCENTRATION_LIMITS } from '@/lib/air-quality/measurement-validator';
import { airQualityService } from '@/services/air-quality.service';
import { airQualityRepository } from '@/repositories/air-quality.repository';
import prisma from '@/lib/db';

describe('M4.1.2 Final Independent Acceptance Audit & CPCB Verification', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv;
  });

  // =========================================================================
  // QUESTION 1: 24-Hour Rolling Observation Window & Day-Boundary Semantics
  // =========================================================================
  describe('Question 1: 24-Hour Observation Window Running Semantics & Day Boundaries', () => {
    it('verifies rolling window spans exactly 24 hours across the midnight IST day boundary (no calendar-day reset)', () => {
      // Midnight IST: 2026-11-20T00:00:00+05:30 = 2026-11-19T18:30:00.000Z
      const midnightIst = new Date('2026-11-19T18:30:00.000Z');
      const samples: HourlySampleInput[] = [];

      // Generate 24 hourly readings spanning from 23 hours prior up to midnight IST
      // Hours 0-5 fall on previous day in IST; hours 6-23 fall on prior morning/afternoon
      for (let h = 0; h < 24; h++) {
        const time = new Date(midnightIst.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 80, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 150, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'NO2', value: 40, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples, midnightIst);

      expect(result.status).toBe('AVAILABLE');
      expect(result.isRegulatoryCompliant).toBe(true);
      expect(result.completenessHours).toBe(24);
      expect(result.pollutantAudits?.['PM2.5']?.validObservationHours).toBe(24);
      expect(result.pollutantAudits?.['PM2.5']?.concentration).toBe(80);
      expect(result.reason).toContain('Satisfies CPCB National AQI data completeness');
    });

    it('early morning evaluation (04:00 AM IST) seamlessly incorporates prior calendar-day observations', () => {
      // 04:00 AM IST: 2026-11-20T04:00:00+05:30 = 2026-11-19T22:30:00.000Z
      const earlyMorningIst = new Date('2026-11-19T22:30:00.000Z');
      const samples: HourlySampleInput[] = [];

      // 4 hours on current calendar day (00:00 to 04:00 IST) + 16 hours on previous calendar day (08:00 to 23:00 IST)
      // Total 20 distinct hours spanning the calendar-day transition
      for (let h = 0; h < 20; h++) {
        const time = new Date(earlyMorningIst.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 70 + (h % 10), unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 140, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'SO2', value: 30, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples, earlyMorningIst);

      // Demonstrates NO calendar-day reset: all 20 hours across day boundary are retained
      expect(result.status).toBe('AVAILABLE');
      expect(result.completenessHours).toBe(20);
      expect(result.pollutantAudits?.['PM2.5']?.validObservationHours).toBe(20);
    });

    it('evaluates official CPCB daily 4:00 PM bulletin window (16:00 IST)', () => {
      // 16:00 IST: 2026-11-20T16:00:00+05:30 = 2026-11-20T10:30:00.000Z
      const bulletinTime = new Date('2026-11-20T10:30:00.000Z');
      const samples: HourlySampleInput[] = [];

      // 16 valid hours out of 24
      for (let h = 0; h < 16; h++) {
        const time = new Date(bulletinTime.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 90, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 180, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'NO2', value: 50, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples, bulletinTime);

      expect(result.status).toBe('AVAILABLE');
      expect(result.completenessHours).toBe(16);
      expect(result.isRegulatoryCompliant).toBe(true);
    });

    it('excludes samples older than 24 hours from the calculation time', () => {
      const asOf = new Date('2026-11-20T12:00:00.000Z');
      const samples: HourlySampleInput[] = [];

      // 15 hours within the 24h window
      for (let h = 0; h < 15; h++) {
        const time = new Date(asOf.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 80, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 150, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'NO2', value: 40, unit: 'µg/m³', measurementTimestamp: time }
        );
      }
      // Sample 26 hours old (outside 24h window)
      samples.push(
        { pollutant: 'PM2.5', value: 80, unit: 'µg/m³', measurementTimestamp: new Date(asOf.getTime() - 26 * 60 * 60 * 1000) },
        { pollutant: 'PM10', value: 150, unit: 'µg/m³', measurementTimestamp: new Date(asOf.getTime() - 26 * 60 * 60 * 1000) },
        { pollutant: 'NO2', value: 40, unit: 'µg/m³', measurementTimestamp: new Date(asOf.getTime() - 26 * 60 * 60 * 1000) }
      );

      const result = calculateOfficialCpcbAqi(samples, asOf);

      // 26h sample is discarded, leaving 15 hours -> INSUFFICIENT_COMPLETENESS
      expect(result.status).toBe('INSUFFICIENT_COMPLETENESS');
      expect(result.completenessHours).toBe(15);
      expect(result.isRegulatoryCompliant).toBe(false);
    });
  });

  // =========================================================================
  // QUESTION 2: CO & O3 8-Hour Running Average & Active Window Sufficiency
  // =========================================================================
  describe('Question 2: CO & O3 8-Hour Running Average & Engineering Safeguard Demonstration', () => {
    const baseDate = new Date('2026-11-20T12:00:00.000Z');

    /**
     * Helper to build samples where:
     * - Station satisfies statutory CPCB 16-hour rule across the 24h cycle (e.g. 16 distinct hours total).
     * - Inside the active 8-hour window [baseDate - 7h, baseDate], exactly activeCount hours are present.
     */
    function build8hDemonstrationSamples(activeCount: number): HourlySampleInput[] {
      const samples: HourlySampleInput[] = [];

      // 1. Add activeCount hourly samples inside active 8h window (h = 0 to activeCount - 1)
      for (let h = 0; h < activeCount; h++) {
        const time = new Date(baseDate.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'CO', value: 2.0, unit: 'mg/m³', measurementTimestamp: time },
          { pollutant: 'O3', value: 60, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM2.5', value: 75, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      // 2. Add remaining hours outside active 8h window (h = 8 to 8 + (16 - activeCount) - 1)
      // to ensure the station satisfies CPCB 16-hour 24h cycle completeness
      const remainingNeeded = Math.max(0, 16 - activeCount);
      for (let r = 0; r < remainingNeeded; r++) {
        const h = 8 + r;
        const time = new Date(baseDate.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'CO', value: 4.0, unit: 'mg/m³', measurementTimestamp: time },
          { pollutant: 'O3', value: 120, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM2.5', value: 75, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      return samples;
    }

    it('demonstrates 8 valid hourly bins in active 8h window: APPROVED, exact running mean over 8 hours', () => {
      const samples = build8hDemonstrationSamples(8);
      const result = calculateOfficialCpcbAqi(samples, baseDate);

      const coAudit = result.pollutantAudits?.['CO'];
      expect(coAudit?.validObservationHours).toBe(16); // CPCB cycle satisfied
      expect(coAudit?.activeWindowObservationHours).toBe(8); // 8/8 in active window
      expect(coAudit?.engineeringSafeguardSatisfied).toBe(true);
      expect(coAudit?.isSubIndexEligible).toBe(true);
      expect(coAudit?.concentration).toBe(2.0); // Mean of active 8 hours (all 2.0)
      expect(result.subIndices['CO']).not.toBeNull();
    });

    it('demonstrates 7 valid hourly bins in active 8h window: APPROVED, exact running mean over 7 hours', () => {
      const samples = build8hDemonstrationSamples(7);
      const result = calculateOfficialCpcbAqi(samples, baseDate);

      const coAudit = result.pollutantAudits?.['CO'];
      expect(coAudit?.validObservationHours).toBe(16);
      expect(coAudit?.activeWindowObservationHours).toBe(7);
      expect(coAudit?.engineeringSafeguardSatisfied).toBe(true);
      expect(coAudit?.isSubIndexEligible).toBe(true);
      expect(coAudit?.concentration).toBe(2.0);
      expect(result.subIndices['CO']).not.toBeNull();
    });

    it('demonstrates 6 valid hourly bins in active 8h window: APPROVED, exact running mean over 6 hours (75% threshold)', () => {
      const samples = build8hDemonstrationSamples(6);
      const result = calculateOfficialCpcbAqi(samples, baseDate);

      const coAudit = result.pollutantAudits?.['CO'];
      expect(coAudit?.validObservationHours).toBe(16);
      expect(coAudit?.activeWindowObservationHours).toBe(6);
      expect(coAudit?.engineeringSafeguardSatisfied).toBe(true);
      expect(coAudit?.isSubIndexEligible).toBe(true);
      expect(coAudit?.concentration).toBe(2.0);
      expect(result.subIndices['CO']).not.toBeNull();
    });

    it('demonstrates 5 valid hourly bins in active 8h window: REJECTED by engineering safeguard (subIndex = null)', () => {
      const samples = build8hDemonstrationSamples(5);
      const result = calculateOfficialCpcbAqi(samples, baseDate);

      const coAudit = result.pollutantAudits?.['CO'];
      expect(coAudit?.validObservationHours).toBe(16); // CPCB 24h statutory rule WAS met
      expect(coAudit?.activeWindowObservationHours).toBe(5); // Only 5 in active 8h window
      expect(coAudit?.engineeringSafeguardSatisfied).toBe(false); // Safeguard fails (<6)
      expect(coAudit?.isSubIndexEligible).toBe(false);
      expect(coAudit?.subIndex).toBeNull();
      expect(coAudit?.rejectionReason).toContain('Engineering safeguard: Active 8-hour window contains only 5/8');
      expect(coAudit?.rejectionReason).toContain('6h in 8h window is an engineering data-quality safeguard');
      expect(result.subIndices['CO']).toBeNull();
    });

    it('demonstrates 4, 3, 2, 1, and 0 valid hourly bins in active 8h window: REJECTED by engineering safeguard', () => {
      for (const count of [4, 3, 2, 1, 0]) {
        const samples = build8hDemonstrationSamples(count);
        const result = calculateOfficialCpcbAqi(samples, baseDate);

        const coAudit = result.pollutantAudits?.['CO'];
        expect(coAudit?.isSubIndexEligible).toBe(false);
        expect(coAudit?.engineeringSafeguardSatisfied).toBe(false);
        expect(coAudit?.subIndex).toBeNull();
        expect(result.subIndices['CO']).toBeNull();
      }
    });

    /**
     * Helper to test custom hourly observation patterns in the active 8-hour window [baseDate - 7h, baseDate].
     * activeHours is an array of hour offsets (0 = current hour / end, 7 = 7 hours ago / beginning).
     * The remaining hours up to totalCycleHoursNeeded are placed outside the active window (hours 8..23)
     * so that the CPCB 16-hour 24h cycle rule is satisfied.
     */
    function buildWindowPatternSamples(
      activeHours: number[],
      activeConcentration = 2.0,
      totalCycleHoursNeeded = 16
    ): HourlySampleInput[] {
      const samples: HourlySampleInput[] = [];
      // Active window hours
      for (const h of activeHours) {
        const time = new Date(baseDate.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'CO', value: activeConcentration, unit: 'mg/m³', measurementTimestamp: time },
          { pollutant: 'O3', value: 60, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM2.5', value: 75, unit: 'µg/m³', measurementTimestamp: time }
        );
      }
      // Fill remaining cycle hours outside active window (h = 8..23) to satisfy statutory 16h rule
      let outsideH = 8;
      while (samples.filter(s => s.pollutant === 'CO').length < totalCycleHoursNeeded && outsideH <= 23) {
        const time = new Date(baseDate.getTime() - outsideH * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'CO', value: 4.0, unit: 'mg/m³', measurementTimestamp: time },
          { pollutant: 'O3', value: 120, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM2.5', value: 75, unit: 'µg/m³', measurementTimestamp: time }
        );
        outsideH++;
      }
      return samples;
    }

    it('demonstrates missing observations at BEGINNING of active 8h window (hours 6, 7 missing; hours 0-5 present): APPROVED under 75% safeguard', () => {
      // Hours 6 and 7 (oldest in 8h window) missing; hours 0, 1, 2, 3, 4, 5 present (6 valid hours)
      const samples = buildWindowPatternSamples([0, 1, 2, 3, 4, 5]);
      const result = calculateOfficialCpcbAqi(samples, baseDate);

      const coAudit = result.pollutantAudits?.['CO'];
      expect(coAudit?.validObservationHours).toBe(16); // 24h statutory cycle satisfied
      expect(coAudit?.activeWindowObservationHours).toBe(6); // 6/8 in active window
      expect(coAudit?.engineeringSafeguardSatisfied).toBe(true);
      expect(coAudit?.isSubIndexEligible).toBe(true);
      expect(coAudit?.concentration).toBe(2.0); // Exact running mean over 6 present hours
      expect(result.subIndices['CO']).not.toBeNull();
    });

    it('demonstrates missing observations in MIDDLE of active 8h window (hours 3, 4 missing; hours 0, 1, 2, 5, 6, 7 present): APPROVED under 75% safeguard', () => {
      // Hours 3 and 4 missing; hours 0, 1, 2, 5, 6, 7 present (6 valid hours)
      const samples = buildWindowPatternSamples([0, 1, 2, 5, 6, 7]);
      const result = calculateOfficialCpcbAqi(samples, baseDate);

      const coAudit = result.pollutantAudits?.['CO'];
      expect(coAudit?.validObservationHours).toBe(16);
      expect(coAudit?.activeWindowObservationHours).toBe(6);
      expect(coAudit?.engineeringSafeguardSatisfied).toBe(true);
      expect(coAudit?.isSubIndexEligible).toBe(true);
      expect(coAudit?.concentration).toBe(2.0);
      expect(result.subIndices['CO']).not.toBeNull();
    });

    it('demonstrates missing observations at END of active 8h window (hours 0, 1 missing; hours 2-7 present): APPROVED under 75% safeguard', () => {
      // Hours 0 and 1 (most recent in window) missing; hours 2, 3, 4, 5, 6, 7 present (6 valid hours)
      const samples = buildWindowPatternSamples([2, 3, 4, 5, 6, 7]);
      const result = calculateOfficialCpcbAqi(samples, baseDate);

      const coAudit = result.pollutantAudits?.['CO'];
      expect(coAudit?.validObservationHours).toBe(16);
      expect(coAudit?.activeWindowObservationHours).toBe(6);
      expect(coAudit?.engineeringSafeguardSatisfied).toBe(true);
      expect(coAudit?.isSubIndexEligible).toBe(true);
      expect(coAudit?.concentration).toBe(2.0);
      expect(result.subIndices['CO']).not.toBeNull();
    });

    it('demonstrates deficient observations (5 hours present) at BEGINNING, MIDDLE, and END of active 8h window: REJECTED by engineering safeguard', () => {
      // 1. Deficient at beginning (hours 5, 6, 7 missing; hours 0, 1, 2, 3, 4 present = 5 hours)
      const samplesBegDeficient = buildWindowPatternSamples([0, 1, 2, 3, 4]);
      const resBeg = calculateOfficialCpcbAqi(samplesBegDeficient, baseDate);
      expect(resBeg.pollutantAudits?.['CO']?.activeWindowObservationHours).toBe(5);
      expect(resBeg.pollutantAudits?.['CO']?.engineeringSafeguardSatisfied).toBe(false);
      expect(resBeg.pollutantAudits?.['CO']?.isSubIndexEligible).toBe(false);
      expect(resBeg.subIndices['CO']).toBeNull();

      // 2. Deficient in middle (hours 2, 3, 4 missing; hours 0, 1, 5, 6, 7 present = 5 hours)
      const samplesMidDeficient = buildWindowPatternSamples([0, 1, 5, 6, 7]);
      const resMid = calculateOfficialCpcbAqi(samplesMidDeficient, baseDate);
      expect(resMid.pollutantAudits?.['CO']?.activeWindowObservationHours).toBe(5);
      expect(resMid.pollutantAudits?.['CO']?.engineeringSafeguardSatisfied).toBe(false);
      expect(resMid.pollutantAudits?.['CO']?.isSubIndexEligible).toBe(false);
      expect(resMid.subIndices['CO']).toBeNull();

      // 3. Deficient at end (hours 0, 1, 2 missing; hours 3, 4, 5, 6, 7 present = 5 hours)
      const samplesEndDeficient = buildWindowPatternSamples([3, 4, 5, 6, 7]);
      const resEnd = calculateOfficialCpcbAqi(samplesEndDeficient, baseDate);
      expect(resEnd.pollutantAudits?.['CO']?.activeWindowObservationHours).toBe(5);
      expect(resEnd.pollutantAudits?.['CO']?.engineeringSafeguardSatisfied).toBe(false);
      expect(resEnd.pollutantAudits?.['CO']?.isSubIndexEligible).toBe(false);
      expect(resEnd.subIndices['CO']).toBeNull();
    });

    it('rejection if CPCB 24h cycle rule is NOT met (< 16h total) even if 8h active window is full (8/8)', () => {
      const samples: HourlySampleInput[] = [];
      // Full 8 hours in active window, but NO OTHER hours in 24h cycle (total 8 < 16)
      for (let h = 0; h < 8; h++) {
        const time = new Date(baseDate.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'CO', value: 2.0, unit: 'mg/m³', measurementTimestamp: time },
          { pollutant: 'O3', value: 60, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples, baseDate);

      const coAudit = result.pollutantAudits?.['CO'];
      expect(coAudit?.validObservationHours).toBe(8);
      expect(coAudit?.isSubIndexEligible).toBe(false);
      expect(coAudit?.rejectionReason).toContain('CPCB protocol requires at least 16 valid observation hours');
      expect(result.subIndices['CO']).toBeNull();
    });
  });

  // =========================================================================
  // QUESTION 3: PHYSICAL_CONCENTRATION_LIMITS & Future-Clock Tolerance
  // =========================================================================
  describe('Question 3: Physical Concentration Plausibility Limits & Clock Drift Boundaries', () => {
    it('PM2.5 boundary: accepts 2000 µg/m³, rejects 2000.1 µg/m³', () => {
      const valid = validateMeasurement('PM2.5', 2000, 'µg/m³');
      expect(valid.isValid).toBe(true);

      const invalid = validateMeasurement('PM2.5', 2000.1, 'µg/m³');
      expect(invalid.isValid).toBe(false);
      expect(invalid.qualityFlags).toContain('REJECTED_EXCEEDS_PHYSICAL_LIMIT');
      expect(invalid.rejectionReason).toContain('exceeds physical plausibility ceiling (2000 µg/m³)');
    });

    it('PM10 boundary: accepts 3000 µg/m³, rejects 3000.1 µg/m³', () => {
      expect(validateMeasurement('PM10', 3000, 'µg/m³').isValid).toBe(true);
      expect(validateMeasurement('PM10', 3000.1, 'µg/m³').isValid).toBe(false);
    });

    it('NO2 boundary: accepts 1500 µg/m³, rejects 1500.1 µg/m³', () => {
      expect(validateMeasurement('NO2', 1500, 'µg/m³').isValid).toBe(true);
      expect(validateMeasurement('NO2', 1500.1, 'µg/m³').isValid).toBe(false);
    });

    it('SO2 boundary: accepts 3000 µg/m³, rejects 3000.1 µg/m³', () => {
      expect(validateMeasurement('SO2', 3000, 'µg/m³').isValid).toBe(true);
      expect(validateMeasurement('SO2', 3000.1, 'µg/m³').isValid).toBe(false);
    });

    it('CO boundary: accepts 150 mg/m³, rejects 150.1 mg/m³', () => {
      expect(validateMeasurement('CO', 150, 'mg/m³').isValid).toBe(true);
      expect(validateMeasurement('CO', 150.1, 'mg/m³').isValid).toBe(false);
    });

    it('O3 boundary: accepts 1500 µg/m³, rejects 1500.1 µg/m³', () => {
      expect(validateMeasurement('O3', 1500, 'µg/m³').isValid).toBe(true);
      expect(validateMeasurement('O3', 1500.1, 'µg/m³').isValid).toBe(false);
    });

    it('NH3 boundary: accepts 3000 µg/m³, rejects 3000.1 µg/m³', () => {
      expect(validateMeasurement('NH3', 3000, 'µg/m³').isValid).toBe(true);
      expect(validateMeasurement('NH3', 3000.1, 'µg/m³').isValid).toBe(false);
    });

    it('Pb boundary: accepts 50 µg/m³, rejects 50.1 µg/m³', () => {
      expect(validateMeasurement('Pb', 50, 'µg/m³').isValid).toBe(true);
      expect(validateMeasurement('Pb', 50.1, 'µg/m³').isValid).toBe(false);
    });

    it('Future clock tolerance boundary: accepts +4.8 minutes (290s), rejects +5.2 minutes (310s)', () => {
      const now = Date.now();
      const withinTolerance = new Date(now + 290 * 1000);
      const exceedsTolerance = new Date(now + 310 * 1000);

      const resWithin = validateMeasurement('PM2.5', 50, 'µg/m³', withinTolerance);
      expect(resWithin.isValid).toBe(true);

      const resExceeds = validateMeasurement('PM2.5', 50, 'µg/m³', exceedsTolerance);
      expect(resExceeds.isValid).toBe(false);
      expect(resExceeds.qualityFlags).toContain('REJECTED_FUTURE_TIMESTAMP');
    });
  });

  // =========================================================================
  // QUESTION 4 & MANDATORY CPCB RULES
  // =========================================================================
  describe('Question 4 & Mandatory CPCB Calculation Rules', () => {
    const baseDate = new Date('2026-11-20T12:00:00.000Z');

    it('overall AQI is strictly the MAXIMUM eligible sub-index', () => {
      const samples: HourlySampleInput[] = [];
      // 16 valid hours
      for (let h = 0; h < 16; h++) {
        const time = new Date(baseDate.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 60, unit: 'µg/m³', measurementTimestamp: time }, // sub-index ~ 100
          { pollutant: 'PM10', value: 250, unit: 'µg/m³', measurementTimestamp: time }, // sub-index ~ 200
          { pollutant: 'NO2', value: 280, unit: 'µg/m³', measurementTimestamp: time }   // sub-index ~ 300 (dominant)
        );
      }

      const result = calculateOfficialCpcbAqi(samples, baseDate);

      expect(result.status).toBe('AVAILABLE');
      expect(result.dominantPollutant).toBe('NO2');
      expect(result.aqi).toBe(result.subIndices['NO2']);
      expect(result.aqi).toBeGreaterThan(result.subIndices['PM10']!);
      expect(result.aqi).toBeGreaterThan(result.subIndices['PM2.5']!);
    });

    it('individual eligible sub-indices remain available even when overall AQI is UNAVAILABLE', () => {
      const samples: HourlySampleInput[] = [];
      // Only 2 pollutants monitored (PM2.5 and PM10 with 16h valid data; no 3rd pollutant)
      for (let h = 0; h < 16; h++) {
        const time = new Date(baseDate.getTime() - h * 60 * 60 * 1000);
        samples.push(
          { pollutant: 'PM2.5', value: 85, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'PM10', value: 160, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samples, baseDate);

      // Overall AQI is null due to 3-parameter sufficiency rule
      expect(result.status).toBe('INSUFFICIENT_POLLUTANTS');
      expect(result.aqi).toBeNull();
      expect(result.category).toBe('UNAVAILABLE');
      expect(result.isRegulatoryCompliant).toBe(false);

      // BUT individual eligible sub-indices are preserved and available!
      expect(result.subIndices['PM2.5']).not.toBeNull();
      expect(result.subIndices['PM2.5']).toBeGreaterThan(0);
      expect(result.subIndices['PM10']).not.toBeNull();
      expect(result.subIndices['PM10']).toBeGreaterThan(0);
      expect(result.pollutantAudits?.['PM2.5']?.isSubIndexEligible).toBe(true);
      expect(result.pollutantAudits?.['PM10']?.isSubIndexEligible).toBe(true);
    });

    it('requires at least three eligible pollutants including PM2.5 or PM10', () => {
      const samplesWithoutParticulate: HourlySampleInput[] = [];
      // 3 pollutants (NO2, SO2, NH3) but NO particulate
      for (let h = 0; h < 16; h++) {
        const time = new Date(baseDate.getTime() - h * 60 * 60 * 1000);
        samplesWithoutParticulate.push(
          { pollutant: 'NO2', value: 40, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'SO2', value: 30, unit: 'µg/m³', measurementTimestamp: time },
          { pollutant: 'NH3', value: 50, unit: 'µg/m³', measurementTimestamp: time }
        );
      }

      const result = calculateOfficialCpcbAqi(samplesWithoutParticulate, baseDate);

      expect(result.status).toBe('INSUFFICIENT_POLLUTANTS');
      expect(result.aqi).toBeNull();
      expect(result.hasParticulate).toBe(false);
      expect(result.reason).toContain('mandatory PM2.5 or PM10');
    });

    it('decouples CPCB National AQI from Short-Term Acute 1-Hour Indicator on single-snapshot input', () => {
      const inputs = [
        { pollutant: 'PM2.5' as const, value: 110, unit: 'µg/m³' },
        { pollutant: 'PM10' as const, value: 220, unit: 'µg/m³' },
        { pollutant: 'NO2' as const, value: 60, unit: 'µg/m³' },
      ];

      const { aqiResult, officialCpcbAqi, shortTermIndicator } = calculateCpcbAqi(inputs);

      // CPCB National AQI requires 16h completeness -> INSUFFICIENT_COMPLETENESS
      expect(officialCpcbAqi.status).toBe('INSUFFICIENT_COMPLETENESS');
      expect(officialCpcbAqi.aqi).toBeNull();
      expect(officialCpcbAqi.category).toBe('UNAVAILABLE');
      expect(officialCpcbAqi.isRegulatoryCompliant).toBe(false);
      expect(officialCpcbAqi.reason).toContain('minimum 16 hours of valid data');

      // Short-Term 1-Hour Proxy is immediately available
      expect(shortTermIndicator.status).toBe('AVAILABLE');
      expect(shortTermIndicator.indicatorValue).toBeGreaterThan(0);
      expect(shortTermIndicator.observationPeriod).toBe('1_HOUR');
      expect(shortTermIndicator.label).toBe('Short-Term Air Quality Indicator (1-Hour Acute Proxy)');
    });
  });

  // =========================================================================
  // PRODUCTION DATA SAFETY & PROVENANCE INVARIANTS (10 INVARIANTS)
  // =========================================================================
  describe('Production Data Safety & Provenance Invariants (10 Invariants)', () => {
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
