import { describe, it, expect } from 'vitest';
import {
  calculateCpcbSubIndex,
  calculateCpcbAqi,
  normalizeConcentration,
  checkCpcbDataSufficiency,
  getCpcbCategory,
  CPCB_BREAKPOINTS,
  CPCB_NAAQS_LIMITS,
} from '@/lib/air-quality/cpcb-aqi';
import { validateMeasurement, PHYSICAL_CONCENTRATION_CEILINGS } from '@/lib/air-quality/measurement-validator';
import { PollutantCode } from '@/lib/air-quality/types';

describe('CPCB Golden Calculation Engine & Standard Compliance (M4.1 Audit)', () => {
  describe('1. Golden Breakpoint Matrix Across All 8 Criteria Pollutants', () => {
    // PM2.5 (24-hr avg in µg/m³): 0-30 Good, 31-60 Sat, 61-90 Mod, 91-120 Poor, 121-250 Very Poor, 251-380 Severe
    it('accurately interpolates PM2.5 at exact breakpoints and interval midpoints', () => {
      // Good bracket
      expect(calculateCpcbSubIndex('PM2.5', 0).subIndex).toBe(0);
      expect(calculateCpcbSubIndex('PM2.5', 30).subIndex).toBe(50);
      expect(calculateCpcbSubIndex('PM2.5', 30).category).toBe('GOOD');

      // Satisfactory bracket
      expect(calculateCpcbSubIndex('PM2.5', 31).subIndex).toBe(51);
      expect(calculateCpcbSubIndex('PM2.5', 60).subIndex).toBe(100);
      expect(calculateCpcbSubIndex('PM2.5', 60).category).toBe('SATISFACTORY');

      // Moderately Polluted bracket
      expect(calculateCpcbSubIndex('PM2.5', 61).subIndex).toBe(101);
      expect(calculateCpcbSubIndex('PM2.5', 90).subIndex).toBe(200);
      expect(calculateCpcbSubIndex('PM2.5', 90).category).toBe('MODERATELY_POLLUTED');

      // Poor bracket
      expect(calculateCpcbSubIndex('PM2.5', 91).subIndex).toBe(201);
      expect(calculateCpcbSubIndex('PM2.5', 120).subIndex).toBe(300);
      expect(calculateCpcbSubIndex('PM2.5', 120).category).toBe('POOR');

      // Very Poor bracket
      expect(calculateCpcbSubIndex('PM2.5', 121).subIndex).toBe(301);
      expect(calculateCpcbSubIndex('PM2.5', 250).subIndex).toBe(400);
      expect(calculateCpcbSubIndex('PM2.5', 250).category).toBe('VERY_POOR');

      // Severe bracket
      expect(calculateCpcbSubIndex('PM2.5', 251).subIndex).toBe(401);
      expect(calculateCpcbSubIndex('PM2.5', 380).subIndex).toBe(500);
      expect(calculateCpcbSubIndex('PM2.5', 380).category).toBe('SEVERE');

      // Clamped above 380
      expect(calculateCpcbSubIndex('PM2.5', 450).subIndex).toBe(500);
      expect(calculateCpcbSubIndex('PM2.5', 450).category).toBe('SEVERE');
    });

    // PM10 (24-hr avg in µg/m³): 0-50 Good, 51-100 Sat, 101-250 Mod, 251-350 Poor, 351-430 Very Poor, 431-550 Severe
    it('accurately interpolates PM10 at exact breakpoints', () => {
      expect(calculateCpcbSubIndex('PM10', 0).subIndex).toBe(0);
      expect(calculateCpcbSubIndex('PM10', 50).subIndex).toBe(50);
      expect(calculateCpcbSubIndex('PM10', 51).subIndex).toBe(51);
      expect(calculateCpcbSubIndex('PM10', 100).subIndex).toBe(100);
      expect(calculateCpcbSubIndex('PM10', 101).subIndex).toBe(101);
      expect(calculateCpcbSubIndex('PM10', 250).subIndex).toBe(200);
      expect(calculateCpcbSubIndex('PM10', 251).subIndex).toBe(201);
      expect(calculateCpcbSubIndex('PM10', 350).subIndex).toBe(300);
      expect(calculateCpcbSubIndex('PM10', 351).subIndex).toBe(301);
      expect(calculateCpcbSubIndex('PM10', 430).subIndex).toBe(400);
      expect(calculateCpcbSubIndex('PM10', 431).subIndex).toBe(401);
      expect(calculateCpcbSubIndex('PM10', 550).subIndex).toBe(500);
    });

    // NO2 (24-hr avg in µg/m³): 0-40 Good, 41-80 Sat, 81-180 Mod, 181-280 Poor, 281-400 Very Poor, 401-600 Severe
    it('accurately interpolates NO2 at exact breakpoints', () => {
      expect(calculateCpcbSubIndex('NO2', 0).subIndex).toBe(0);
      expect(calculateCpcbSubIndex('NO2', 40).subIndex).toBe(50);
      expect(calculateCpcbSubIndex('NO2', 41).subIndex).toBe(51);
      expect(calculateCpcbSubIndex('NO2', 80).subIndex).toBe(100);
      expect(calculateCpcbSubIndex('NO2', 180).subIndex).toBe(200);
      expect(calculateCpcbSubIndex('NO2', 280).subIndex).toBe(300);
      expect(calculateCpcbSubIndex('NO2', 400).subIndex).toBe(400);
      expect(calculateCpcbSubIndex('NO2', 600).subIndex).toBe(500);
    });

    // O3 (8-hr avg in µg/m³): 0-50 Good, 51-100 Sat, 101-168 Mod, 169-208 Poor, 209-748 Very Poor, 749-1000 Severe
    it('accurately interpolates O3 at exact breakpoints', () => {
      expect(calculateCpcbSubIndex('O3', 0).subIndex).toBe(0);
      expect(calculateCpcbSubIndex('O3', 50).subIndex).toBe(50);
      expect(calculateCpcbSubIndex('O3', 100).subIndex).toBe(100);
      expect(calculateCpcbSubIndex('O3', 168).subIndex).toBe(200);
      expect(calculateCpcbSubIndex('O3', 208).subIndex).toBe(300);
      expect(calculateCpcbSubIndex('O3', 748).subIndex).toBe(400);
      expect(calculateCpcbSubIndex('O3', 1000).subIndex).toBe(500);
    });

    // CO (8-hr avg in mg/m³): 0.0-1.0 Good, 1.1-2.0 Sat, 2.1-10.0 Mod, 10.1-17.0 Poor, 17.1-34.0 Very Poor, 34.1-50.0 Severe
    it('accurately interpolates CO with decimal concentration handling', () => {
      expect(calculateCpcbSubIndex('CO', 0.0).subIndex).toBe(0);
      expect(calculateCpcbSubIndex('CO', 1.0).subIndex).toBe(50);
      expect(calculateCpcbSubIndex('CO', 1.1).subIndex).toBe(51);
      expect(calculateCpcbSubIndex('CO', 2.0).subIndex).toBe(100);
      expect(calculateCpcbSubIndex('CO', 10.0).subIndex).toBe(200);
      expect(calculateCpcbSubIndex('CO', 17.0).subIndex).toBe(300);
      expect(calculateCpcbSubIndex('CO', 34.0).subIndex).toBe(400);
      expect(calculateCpcbSubIndex('CO', 50.0).subIndex).toBe(500);
    });

    // SO2 (24-hr avg in µg/m³): 0-40 Good, 41-80 Sat, 81-380 Mod, 381-800 Poor, 801-1600 Very Poor, 1601-2400 Severe
    it('accurately interpolates SO2 at exact breakpoints', () => {
      expect(calculateCpcbSubIndex('SO2', 0).subIndex).toBe(0);
      expect(calculateCpcbSubIndex('SO2', 40).subIndex).toBe(50);
      expect(calculateCpcbSubIndex('SO2', 80).subIndex).toBe(100);
      expect(calculateCpcbSubIndex('SO2', 380).subIndex).toBe(200);
      expect(calculateCpcbSubIndex('SO2', 800).subIndex).toBe(300);
      expect(calculateCpcbSubIndex('SO2', 1600).subIndex).toBe(400);
      expect(calculateCpcbSubIndex('SO2', 2400).subIndex).toBe(500);
    });

    // NH3 (24-hr avg in µg/m³): 0-200 Good, 201-400 Sat, 401-800 Mod, 801-1200 Poor, 1201-1800 Very Poor, 1801-2400 Severe
    it('accurately interpolates NH3 at exact breakpoints', () => {
      expect(calculateCpcbSubIndex('NH3', 0).subIndex).toBe(0);
      expect(calculateCpcbSubIndex('NH3', 200).subIndex).toBe(50);
      expect(calculateCpcbSubIndex('NH3', 400).subIndex).toBe(100);
      expect(calculateCpcbSubIndex('NH3', 800).subIndex).toBe(200);
      expect(calculateCpcbSubIndex('NH3', 1200).subIndex).toBe(300);
      expect(calculateCpcbSubIndex('NH3', 1800).subIndex).toBe(400);
      expect(calculateCpcbSubIndex('NH3', 2400).subIndex).toBe(500);
    });

    // Pb (24-hr avg in µg/m³): 0.0-0.5 Good, 0.6-1.0 Sat, 1.1-2.0 Mod, 2.1-3.0 Poor, 3.1-3.5 Very Poor, 3.6-5.0 Severe
    it('accurately interpolates Pb with 1-decimal concentration precision', () => {
      expect(calculateCpcbSubIndex('Pb', 0.0).subIndex).toBe(0);
      expect(calculateCpcbSubIndex('Pb', 0.5).subIndex).toBe(50);
      expect(calculateCpcbSubIndex('Pb', 0.6).subIndex).toBe(51);
      expect(calculateCpcbSubIndex('Pb', 1.0).subIndex).toBe(100);
      expect(calculateCpcbSubIndex('Pb', 2.0).subIndex).toBe(200);
      expect(calculateCpcbSubIndex('Pb', 3.0).subIndex).toBe(300);
      expect(calculateCpcbSubIndex('Pb', 3.5).subIndex).toBe(400);
      expect(calculateCpcbSubIndex('Pb', 5.0).subIndex).toBe(500);
    });
  });

  describe('2. Negative & Invalid Value Rejection', () => {
    it('returns null subIndex for negative, NaN, or infinite concentrations', () => {
      expect(calculateCpcbSubIndex('PM2.5', -1).subIndex).toBeNull();
      expect(calculateCpcbSubIndex('PM10', -50).subIndex).toBeNull();
      expect(calculateCpcbSubIndex('CO', NaN).subIndex).toBeNull();
      expect(calculateCpcbSubIndex('NO2', Infinity).subIndex).toBeNull();
      expect(calculateCpcbSubIndex('SO2', -Infinity).subIndex).toBeNull();
    });
  });

  describe('3. CPCB Data Sufficiency Rule Truth Table', () => {
    it('rejects calculation if fewer than 3 pollutants are monitored', () => {
      const res0 = checkCpcbDataSufficiency([]);
      expect(res0.isSufficient).toBe(false);

      const res1 = checkCpcbDataSufficiency(['PM2.5']);
      expect(res1.isSufficient).toBe(false);

      const res2 = checkCpcbDataSufficiency(['PM2.5', 'NO2']);
      expect(res2.isSufficient).toBe(false);
    });

    it('rejects calculation if 3+ pollutants are monitored but neither PM2.5 nor PM10 is present', () => {
      // 3 gases without particulate
      const res = checkCpcbDataSufficiency(['NO2', 'SO2', 'CO']);
      expect(res.isSufficient).toBe(false);
      expect(res.hasParticulate).toBe(false);
      expect(res.details).toContain('neither PM2.5 nor PM10 particulate is measured');
    });

    it('approves calculation when 3+ pollutants include PM2.5', () => {
      const res = checkCpcbDataSufficiency(['PM2.5', 'NO2', 'SO2']);
      expect(res.isSufficient).toBe(true);
      expect(res.hasParticulate).toBe(true);
      expect(res.pollutantCount).toBe(3);
    });

    it('approves calculation when 3+ pollutants include PM10', () => {
      const res = checkCpcbDataSufficiency(['PM10', 'NO2', 'CO']);
      expect(res.isSufficient).toBe(true);
      expect(res.hasParticulate).toBe(true);
    });

    it('approves full 8-parameter suite', () => {
      const res = checkCpcbDataSufficiency(['PM2.5', 'PM10', 'NO2', 'O3', 'CO', 'SO2', 'NH3', 'Pb']);
      expect(res.isSufficient).toBe(true);
      expect(res.pollutantCount).toBe(8);
    });
  });

  describe('4. Overall CPCB AQI & Dominant Pollutant Determination', () => {
    it('sets overall AQI to maximum subIndex and assigns dominant pollutant', () => {
      const readings = [
        { pollutant: 'PM2.5' as PollutantCode, value: 105, unit: 'µg/m³' }, // SubIndex = 249 (POOR)
        { pollutant: 'PM10' as PollutantCode, value: 80, unit: 'µg/m³' },   // SubIndex = 80 (SATISFACTORY)
        { pollutant: 'NO2' as PollutantCode, value: 30, unit: 'µg/m³' },    // SubIndex = 38 (GOOD)
      ];

      const { aqiResult } = calculateCpcbAqi(readings);
      expect(aqiResult.aqi).toBe(249);
      expect(aqiResult.category).toBe('POOR');
      expect(aqiResult.dominantPollutant).toBe('PM2.5');
      expect(aqiResult.averagingNotice).toContain('Acute 1-hour sensor concentrations');
    });

    it('returns null AQI and INSUFFICIENT_DATA category when sufficiency fails', () => {
      const insufficientReadings = [
        { pollutant: 'PM2.5' as PollutantCode, value: 50, unit: 'µg/m³' },
        { pollutant: 'NO2' as PollutantCode, value: 40, unit: 'µg/m³' },
        // Only 2 pollutants
      ];

      const { aqiResult } = calculateCpcbAqi(insufficientReadings);
      expect(aqiResult.aqi).toBeNull();
      expect(aqiResult.category).toBe('INSUFFICIENT_DATA');
      expect(aqiResult.dominantPollutant).toBeNull();
      expect(aqiResult.dataSufficiency.isSufficient).toBe(false);
    });
  });

  describe('5. Physical Plausibility Ceilings & Measurement Validator', () => {
    it('rejects concentrations exceeding physical atmosphere ceilings', () => {
      const now = new Date();
      // PM2.5 ceiling is 2000 µg/m³
      const valid = validateMeasurement('PM2.5', 1800, 'µg/m³', now);
      expect(valid.isValid).toBe(true);

      const invalid = validateMeasurement('PM2.5', 2500, 'µg/m³', now);
      expect(invalid.isValid).toBe(false);
      expect(invalid.rejectionReason).toContain('exceeds physical plausibility ceiling');
    });

    it('rejects future timestamps exceeding 5-minute clock drift', () => {
      const farFuture = new Date(Date.now() + 10 * 60 * 1000); // 10 min in future
      const res = validateMeasurement('PM10', 80, 'µg/m³', farFuture);
      expect(res.isValid).toBe(false);
      expect(res.rejectionReason).toContain('Future timestamp rejected');
    });

    it('accepts timestamps within 5-minute clock drift margin', () => {
      const slightFuture = new Date(Date.now() + 2 * 60 * 1000); // 2 min in future
      const res = validateMeasurement('PM10', 80, 'µg/m³', slightFuture);
      expect(res.isValid).toBe(true);
    });
  });
});
