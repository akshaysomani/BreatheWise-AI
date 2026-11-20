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
import { PollutantCode } from '@/lib/air-quality/types';

describe('CPCB Indian NAQI Calculation Engine', () => {
  describe('CPCB Breakpoint Structure and Integrity', () => {
    it('defines official breakpoints for all 8 criteria pollutants', () => {
      const pollutants: PollutantCode[] = ['PM2.5', 'PM10', 'NO2', 'O3', 'CO', 'SO2', 'NH3', 'Pb'];
      for (const p of pollutants) {
        expect(CPCB_BREAKPOINTS[p]).toBeDefined();
        expect(CPCB_BREAKPOINTS[p].length).toBe(6); // 6 CPCB categories
      }
    });

    it('defines official 24-hr/8-hr NAAQS regulatory limits for all 8 criteria pollutants', () => {
      expect(CPCB_NAAQS_LIMITS['PM2.5'].limit).toBe(60);
      expect(CPCB_NAAQS_LIMITS['PM10'].limit).toBe(100);
      expect(CPCB_NAAQS_LIMITS['NO2'].limit).toBe(80);
      expect(CPCB_NAAQS_LIMITS['SO2'].limit).toBe(80);
      expect(CPCB_NAAQS_LIMITS['CO'].limit).toBe(2.0);
      expect(CPCB_NAAQS_LIMITS['O3'].limit).toBe(100);
      expect(CPCB_NAAQS_LIMITS['NH3'].limit).toBe(400);
      expect(CPCB_NAAQS_LIMITS['Pb'].limit).toBe(1.0);
    });
  });

  describe('Unit Normalization', () => {
    it('normalizes CO to mg/m³', () => {
      expect(normalizeConcentration('CO', 2.0, 'mg/m³').normalizedValue).toBe(2.0);
      expect(normalizeConcentration('CO', 2000, 'µg/m³').normalizedValue).toBe(2.0);
      // 1 ppm CO ~ 1.145 mg/m³
      const coPpm = normalizeConcentration('CO', 1.0, 'ppm');
      expect(coPpm.normalizedValue).toBe(1.15);
      expect(coPpm.normalizedUnit).toBe('mg/m³');
    });

    it('normalizes particulate and gas pollutants to µg/m³', () => {
      expect(normalizeConcentration('PM2.5', 45, 'µg/m³').normalizedValue).toBe(45);
      expect(normalizeConcentration('PM10', 80, 'µg/m³').normalizedValue).toBe(80);
      expect(normalizeConcentration('NO2', 0.05, 'mg/m³').normalizedValue).toBe(50);
    });
  });

  describe('CPCB Sub-Index Piecewise Interpolation', () => {
    it('calculates PM2.5 sub-indices across all 6 CPCB categories', () => {
      // Good (0-30 -> 0-50)
      expect(calculateCpcbSubIndex('PM2.5', 0).subIndex).toBe(0);
      expect(calculateCpcbSubIndex('PM2.5', 15).subIndex).toBe(25);
      expect(calculateCpcbSubIndex('PM2.5', 30).subIndex).toBe(50);

      // Satisfactory (31-60 -> 51-100)
      expect(calculateCpcbSubIndex('PM2.5', 45).subIndex).toBe(75);
      expect(calculateCpcbSubIndex('PM2.5', 60).subIndex).toBe(100);

      // Moderately Polluted (61-90 -> 101-200)
      expect(calculateCpcbSubIndex('PM2.5', 75).subIndex).toBe(149);
      expect(calculateCpcbSubIndex('PM2.5', 90).subIndex).toBe(200);

      // Poor (91-120 -> 201-300)
      expect(calculateCpcbSubIndex('PM2.5', 105).subIndex).toBe(249);
      expect(calculateCpcbSubIndex('PM2.5', 120).subIndex).toBe(300);

      // Very Poor (121-250 -> 301-400)
      expect(calculateCpcbSubIndex('PM2.5', 185).subIndex).toBe(350);
      expect(calculateCpcbSubIndex('PM2.5', 250).subIndex).toBe(400);

      // Severe (251-380 -> 401-500)
      expect(calculateCpcbSubIndex('PM2.5', 315).subIndex).toBe(450);
      expect(calculateCpcbSubIndex('PM2.5', 380).subIndex).toBe(500);
      // Beyond severe range -> clamped to 500
      expect(calculateCpcbSubIndex('PM2.5', 600).subIndex).toBe(500);
    });

    it('calculates PM10 sub-indices accurately', () => {
      // Good (0-50 -> 0-50)
      expect(calculateCpcbSubIndex('PM10', 25).subIndex).toBe(25);
      // Satisfactory (51-100 -> 51-100)
      expect(calculateCpcbSubIndex('PM10', 75).subIndex).toBe(75);
      // Moderately Polluted (101-250 -> 101-200)
      expect(calculateCpcbSubIndex('PM10', 175).subIndex).toBe(150);
      // Severe (431-550 -> 401-500)
      expect(calculateCpcbSubIndex('PM10', 490).subIndex).toBe(450);
    });

    it('calculates CO sub-indices in mg/m³', () => {
      // Good: 0.0 - 1.0 mg/m³ -> 0 - 50
      expect(calculateCpcbSubIndex('CO', 0.5).subIndex).toBe(25);
      // Satisfactory: 1.1 - 2.0 mg/m³ -> 51 - 100
      expect(calculateCpcbSubIndex('CO', 1.5).subIndex).toBe(73);
      // Moderately Polluted: 2.1 - 10.0 mg/m³ -> 101 - 200
      expect(calculateCpcbSubIndex('CO', 6.0).subIndex).toBe(150);
    });

    it('handles negative, NaN, and invalid concentrations by returning null', () => {
      expect(calculateCpcbSubIndex('PM2.5', -10).subIndex).toBeNull();
      expect(calculateCpcbSubIndex('PM2.5', NaN).subIndex).toBeNull();
      expect(calculateCpcbSubIndex('PM2.5', Infinity).subIndex).toBeNull();
    });
  });

  describe('CPCB Category Classification', () => {
    it('classifies AQI into official 6 CPCB categories', () => {
      expect(getCpcbCategory(25)).toBe('GOOD');
      expect(getCpcbCategory(50)).toBe('GOOD');
      expect(getCpcbCategory(51)).toBe('SATISFACTORY');
      expect(getCpcbCategory(100)).toBe('SATISFACTORY');
      expect(getCpcbCategory(101)).toBe('MODERATELY_POLLUTED');
      expect(getCpcbCategory(200)).toBe('MODERATELY_POLLUTED');
      expect(getCpcbCategory(201)).toBe('POOR');
      expect(getCpcbCategory(300)).toBe('POOR');
      expect(getCpcbCategory(301)).toBe('VERY_POOR');
      expect(getCpcbCategory(400)).toBe('VERY_POOR');
      expect(getCpcbCategory(401)).toBe('SEVERE');
      expect(getCpcbCategory(500)).toBe('SEVERE');
    });
  });

  describe('CPCB Data Sufficiency Rule', () => {
    it('fails when fewer than 3 pollutants are monitored', () => {
      const result = checkCpcbDataSufficiency(['PM2.5', 'PM10']);
      expect(result.isSufficient).toBe(false);
      expect(result.pollutantCount).toBe(2);
      expect(result.details).toContain('Only 2 pollutant(s) monitored');
    });

    it('fails when 3 pollutants are monitored but neither PM2.5 nor PM10 is included', () => {
      const result = checkCpcbDataSufficiency(['NO2', 'SO2', 'CO']);
      expect(result.isSufficient).toBe(false);
      expect(result.hasParticulate).toBe(false);
      expect(result.missingParticulateReason).toBeDefined();
    });

    it('passes when at least 3 pollutants including PM2.5 are monitored', () => {
      const result = checkCpcbDataSufficiency(['PM2.5', 'NO2', 'SO2']);
      expect(result.isSufficient).toBe(true);
      expect(result.hasParticulate).toBe(true);
      expect(result.pollutantCount).toBe(3);
    });

    it('passes when at least 3 pollutants including PM10 are monitored', () => {
      const result = checkCpcbDataSufficiency(['PM10', 'NO2', 'CO']);
      expect(result.isSufficient).toBe(true);
      expect(result.hasParticulate).toBe(true);
    });

    it('passes when full 8-pollutant suite is monitored', () => {
      const result = checkCpcbDataSufficiency(['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3', 'Pb']);
      expect(result.isSufficient).toBe(true);
      expect(result.pollutantCount).toBe(8);
    });
  });

  describe('Master calculateCpcbAqi Integration', () => {
    it('returns INSUFFICIENT_DATA when CPCB rules are not met', () => {
      const res = calculateCpcbAqi([
        { pollutant: 'PM2.5', value: 45, unit: 'µg/m³' },
        { pollutant: 'NO2', value: 30, unit: 'µg/m³' },
      ]);

      expect(res.aqiResult.aqi).toBeNull();
      expect(res.aqiResult.category).toBe('INSUFFICIENT_DATA');
      expect(res.aqiResult.dominantPollutant).toBeNull();
      expect(res.aqiResult.dataSufficiency.isSufficient).toBe(false);
      // Valid individual sub-indices are still preserved!
      expect(res.measurements['PM2.5']?.subIndex).toBe(75);
      expect(res.measurements['NO2']?.subIndex).toBe(38);
    });

    it('computes overall AQI and dominant pollutant when CPCB sufficiency is met', () => {
      // Typical winter smog scenario in Delhi / Ahmedabad
      const res = calculateCpcbAqi([
        { pollutant: 'PM2.5', value: 160, unit: 'µg/m³' }, // subIndex: ~331 (VERY_POOR)
        { pollutant: 'PM10', value: 260, unit: 'µg/m³' },  // subIndex: ~210 (POOR)
        { pollutant: 'NO2', value: 65, unit: 'µg/m³' },    // subIndex: ~82 (SATISFACTORY)
        { pollutant: 'SO2', value: 15, unit: 'µg/m³' },    // subIndex: ~19 (GOOD)
        { pollutant: 'CO', value: 1.8, unit: 'mg/m³' },    // subIndex: ~90 (SATISFACTORY)
      ]);

      expect(res.aqiResult.dataSufficiency.isSufficient).toBe(true);
      expect(res.aqiResult.aqi).toBeGreaterThanOrEqual(300);
      expect(res.aqiResult.category).toBe('VERY_POOR');
      expect(res.aqiResult.dominantPollutant).toBe('PM2.5');
      expect(res.aqiResult.healthGuidance.shortStatement).toContain('Respiratory illness');
      expect(res.measurements['PM2.5']?.isExceededNAAQS).toBe(true); // 160 > 60
    });

    it('identifies PM10 as dominant when PM10 sub-index is higher than PM2.5', () => {
      const res = calculateCpcbAqi([
        { pollutant: 'PM2.5', value: 20, unit: 'µg/m³' }, // subIndex: 33 (GOOD)
        { pollutant: 'PM10', value: 280, unit: 'µg/m³' }, // subIndex: 230 (POOR)
        { pollutant: 'NO2', value: 30, unit: 'µg/m³' },   // subIndex: 38 (GOOD)
      ]);

      expect(res.aqiResult.dominantPollutant).toBe('PM10');
      expect(res.aqiResult.category).toBe('POOR');
      expect(res.aqiResult.aqi).toBe(230);
    });
  });
});
