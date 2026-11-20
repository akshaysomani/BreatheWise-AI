/**
 * BreatheWise AI — CPCB Indian National Air Quality Index (NAQI) Calculation Engine
 * 
 * Based on official Central Pollution Control Board (CPCB) India guidelines:
 * "National Air Quality Index" (CPCB, Ministry of Environment, Forest and Climate Change, 2014-2015).
 * 
 * Implements:
 * 1. 8 criteria pollutants: PM2.5, PM10, NO2, O3, CO, SO2, NH3, Pb.
 * 2. Piecewise linear sub-index interpolation:
 *    Ip = [ (I_high - I_low) / (BPH - BPL) ] * (Cp - BPL) + I_low
 * 3. Concentration unit handling: CO in mg/m³, all other 7 in µg/m³.
 * 4. CPCB Data Sufficiency Rule: At least 3 parameters must be monitored, of which
 *    at least one MUST be PM2.5 or PM10. If not satisfied, overall AQI is null.
 * 5. Averaging Period & Data Completeness Separation:
 *    - Official CPCB AQI: 24-hour averages (minimum 16 hours valid data completeness in the 24-hour cycle
 *      for particulates, NO2, SO2, NH3, Pb; 8-hour running average for CO and O3 with minimum 16 hours in 24-hr cycle).
 *    - Short-Term Air Quality Indicator: 1-hour acute sensor observations evaluated against
 *      CPCB breakpoints as an instantaneous real-time proxy for immediate exposure mitigation.
 * 6. Overall AQI = max(subIndices of monitored pollutants).
 * 7. Official CPCB 6-category classification & health statements.
 */

import {
  PollutantCode,
  CpcbCategory,
  CpcbHealthGuidance,
  CpcbDataSufficiency,
  CpcbAqiResult,
  CanonicalPollutantMeasurement,
  AveragingPeriod,
  OfficialCpcbAqiResult,
  ShortTermAirQualityIndicator,
  PollutantCompletenessAudit,
} from './types';
import { PHYSICAL_CONCENTRATION_LIMITS } from './measurement-validator';

export interface CpcbBreakpoint {
  bpl: number;      // Breakpoint Low concentration
  bph: number;      // Breakpoint High concentration
  iLow: number;     // Index Low (AQI)
  iHigh: number;    // Index High (AQI)
  category: CpcbCategory;
}

/**
 * Official CPCB Breakpoints Table (2014 Report, Table 4.1)
 */
export const CPCB_BREAKPOINTS: Record<PollutantCode, CpcbBreakpoint[]> = {
  // PM2.5 (24-hour average in µg/m³)
  'PM2.5': [
    { bpl: 0, bph: 30, iLow: 0, iHigh: 50, category: 'GOOD' },
    { bpl: 31, bph: 60, iLow: 51, iHigh: 100, category: 'SATISFACTORY' },
    { bpl: 61, bph: 90, iLow: 101, iHigh: 200, category: 'MODERATELY_POLLUTED' },
    { bpl: 91, bph: 120, iLow: 201, iHigh: 300, category: 'POOR' },
    { bpl: 121, bph: 250, iLow: 301, iHigh: 400, category: 'VERY_POOR' },
    { bpl: 251, bph: 380, iLow: 401, iHigh: 500, category: 'SEVERE' },
  ],

  // PM10 (24-hour average in µg/m³)
  'PM10': [
    { bpl: 0, bph: 50, iLow: 0, iHigh: 50, category: 'GOOD' },
    { bpl: 51, bph: 100, iLow: 51, iHigh: 100, category: 'SATISFACTORY' },
    { bpl: 101, bph: 250, iLow: 101, iHigh: 200, category: 'MODERATELY_POLLUTED' },
    { bpl: 251, bph: 350, iLow: 201, iHigh: 300, category: 'POOR' },
    { bpl: 351, bph: 430, iLow: 301, iHigh: 400, category: 'VERY_POOR' },
    { bpl: 431, bph: 550, iLow: 401, iHigh: 500, category: 'SEVERE' },
  ],

  // NO2 (24-hour average in µg/m³)
  'NO2': [
    { bpl: 0, bph: 40, iLow: 0, iHigh: 50, category: 'GOOD' },
    { bpl: 41, bph: 80, iLow: 51, iHigh: 100, category: 'SATISFACTORY' },
    { bpl: 81, bph: 180, iLow: 101, iHigh: 200, category: 'MODERATELY_POLLUTED' },
    { bpl: 181, bph: 280, iLow: 201, iHigh: 300, category: 'POOR' },
    { bpl: 281, bph: 400, iLow: 301, iHigh: 400, category: 'VERY_POOR' },
    { bpl: 401, bph: 600, iLow: 401, iHigh: 500, category: 'SEVERE' },
  ],

  // O3 (8-hour average in µg/m³)
  'O3': [
    { bpl: 0, bph: 50, iLow: 0, iHigh: 50, category: 'GOOD' },
    { bpl: 51, bph: 100, iLow: 51, iHigh: 100, category: 'SATISFACTORY' },
    { bpl: 101, bph: 168, iLow: 101, iHigh: 200, category: 'MODERATELY_POLLUTED' },
    { bpl: 169, bph: 208, iLow: 201, iHigh: 300, category: 'POOR' },
    { bpl: 209, bph: 748, iLow: 301, iHigh: 400, category: 'VERY_POOR' },
    { bpl: 749, bph: 1000, iLow: 401, iHigh: 500, category: 'SEVERE' },
  ],

  // CO (8-hour average in mg/m³) - NOTE: concentration is mg/m³
  'CO': [
    { bpl: 0.0, bph: 1.0, iLow: 0, iHigh: 50, category: 'GOOD' },
    { bpl: 1.1, bph: 2.0, iLow: 51, iHigh: 100, category: 'SATISFACTORY' },
    { bpl: 2.1, bph: 10.0, iLow: 101, iHigh: 200, category: 'MODERATELY_POLLUTED' },
    { bpl: 10.1, bph: 17.0, iLow: 201, iHigh: 300, category: 'POOR' },
    { bpl: 17.1, bph: 34.0, iLow: 301, iHigh: 400, category: 'VERY_POOR' },
    { bpl: 34.1, bph: 50.0, iLow: 401, iHigh: 500, category: 'SEVERE' },
  ],

  // SO2 (24-hour average in µg/m³)
  'SO2': [
    { bpl: 0, bph: 40, iLow: 0, iHigh: 50, category: 'GOOD' },
    { bpl: 41, bph: 80, iLow: 51, iHigh: 100, category: 'SATISFACTORY' },
    { bpl: 81, bph: 380, iLow: 101, iHigh: 200, category: 'MODERATELY_POLLUTED' },
    { bpl: 381, bph: 800, iLow: 201, iHigh: 300, category: 'POOR' },
    { bpl: 801, bph: 1600, iLow: 301, iHigh: 400, category: 'VERY_POOR' },
    { bpl: 1601, bph: 2400, iLow: 401, iHigh: 500, category: 'SEVERE' },
  ],

  // NH3 (24-hour average in µg/m³)
  'NH3': [
    { bpl: 0, bph: 200, iLow: 0, iHigh: 50, category: 'GOOD' },
    { bpl: 201, bph: 400, iLow: 51, iHigh: 100, category: 'SATISFACTORY' },
    { bpl: 401, bph: 800, iLow: 101, iHigh: 200, category: 'MODERATELY_POLLUTED' },
    { bpl: 801, bph: 1200, iLow: 201, iHigh: 300, category: 'POOR' },
    { bpl: 1201, bph: 1800, iLow: 301, iHigh: 400, category: 'VERY_POOR' },
    { bpl: 1801, bph: 2400, iLow: 401, iHigh: 500, category: 'SEVERE' },
  ],

  // Pb (24-hour average in µg/m³)
  'Pb': [
    { bpl: 0.0, bph: 0.5, iLow: 0, iHigh: 50, category: 'GOOD' },
    { bpl: 0.6, bph: 1.0, iLow: 51, iHigh: 100, category: 'SATISFACTORY' },
    { bpl: 1.1, bph: 2.0, iLow: 101, iHigh: 200, category: 'MODERATELY_POLLUTED' },
    { bpl: 2.1, bph: 3.0, iLow: 201, iHigh: 300, category: 'POOR' },
    { bpl: 3.1, bph: 3.5, iLow: 301, iHigh: 400, category: 'VERY_POOR' },
    { bpl: 3.6, bph: 5.0, iLow: 401, iHigh: 500, category: 'SEVERE' },
  ],
};

/**
 * Indian National Ambient Air Quality Standards (NAAQS) 24-hr Regulatory Limits
 */
export const CPCB_NAAQS_LIMITS: Record<PollutantCode, { limit: number; unit: string; period: string }> = {
  'PM2.5': { limit: 60, unit: 'µg/m³', period: '24-hour' },
  'PM10': { limit: 100, unit: 'µg/m³', period: '24-hour' },
  'NO2': { limit: 80, unit: 'µg/m³', period: '24-hour' },
  'SO2': { limit: 80, unit: 'µg/m³', period: '24-hour' },
  'CO': { limit: 2.0, unit: 'mg/m³', period: '8-hour' },
  'O3': { limit: 100, unit: 'µg/m³', period: '8-hour' },
  'NH3': { limit: 400, unit: 'µg/m³', period: '24-hour' },
  'Pb': { limit: 1.0, unit: 'µg/m³', period: '24-hour' },
};

/**
 * Official CPCB NAQI Health Guidance and Statements
 */
export const CPCB_HEALTH_STATEMENTS: Record<CpcbCategory | 'INSUFFICIENT_DATA' | 'UNAVAILABLE', CpcbHealthGuidance> = {
  GOOD: {
    shortStatement: 'Minimal health impact',
    description: 'Air quality is considered satisfactory, and air pollution poses little or no risk.',
    colorHex: '#397A55', // Forest green
    colorClass: 'text-[#397A55] bg-[#E8F3ED] border-[#397A55]/30',
    generalPublicAdvice: 'Ideal conditions for outdoor activity and natural home ventilation.',
    sensitiveGroupsAdvice: 'Safe for children, elderly, and individuals with respiratory conditions.',
    indoorGuidance: 'Open windows during morning hours to circulate fresh ambient air.',
  },
  SATISFACTORY: {
    shortStatement: 'Minor breathing discomfort to sensitive people',
    description: 'Air quality is acceptable; however, sensitive individuals may experience slight irritation.',
    colorHex: '#5B8C51', // Olive-green
    colorClass: 'text-[#487340] bg-[#EEF5EB] border-[#5B8C51]/30',
    generalPublicAdvice: 'Normal outdoor activities are generally safe for the public.',
    sensitiveGroupsAdvice: 'Individuals with severe asthma should monitor for mild symptoms.',
    indoorGuidance: 'Routine home ventilation is fine. Keep filters clean.',
  },
  MODERATELY_POLLUTED: {
    shortStatement: 'Breathing discomfort to people with lungs, asthma and heart diseases',
    description: 'Pollution levels may cause breathing discomfort to children, seniors, and those with heart/lung disease.',
    colorHex: '#D97706', // Amber-600
    colorClass: 'text-[#9A5B00] bg-[#FDF6E2] border-[#D97706]/30',
    generalPublicAdvice: 'Healthy individuals can maintain normal activities; reduce prolonged high-exertion outdoor tasks.',
    sensitiveGroupsAdvice: 'Children, asthmatics, and seniors should avoid heavy morning outdoor workouts.',
    indoorGuidance: 'Run HEPA air purifiers at low speed; keep external windows closed during peak traffic hours.',
  },
  POOR: {
    shortStatement: 'Breathing discomfort to most people on prolonged exposure',
    description: 'Significant particulate buildup. Prolonged exposure causes breathing discomfort to anyone, especially vulnerable cohorts.',
    colorHex: '#EA580C', // Orange-600
    colorClass: 'text-[#B43C00] bg-[#FFF1EB] border-[#EA580C]/30',
    generalPublicAdvice: 'Wear a well-fitted N95 mask during prolonged outdoor commutes. Avoid strenuous outdoor runs.',
    sensitiveGroupsAdvice: 'Asthmatics and cardiac patients must avoid outdoor exercise and keep relief medication accessible.',
    indoorGuidance: 'Close all external doors and windows tightly. Operate HEPA filtration on medium-high speed.',
  },
  VERY_POOR: {
    shortStatement: 'Respiratory illness on prolonged exposure',
    description: 'Heavy winter smog conditions. Causes respiratory illness to people on prolonged exposure; severely impacts lung/heart disease patients.',
    colorHex: '#DC2626', // Red-600
    colorClass: 'text-[#A81E1E] bg-[#FDF2F2] border-[#DC2626]/30',
    generalPublicAdvice: 'Avoid outdoor exercise completely. Wear certified N95/FFP2 respirators when stepping outdoors.',
    sensitiveGroupsAdvice: 'Vulnerable individuals, pregnant women, and infants must remain indoors in purified air.',
    indoorGuidance: 'Continuous HEPA filtration required. Seal window cracks and draft points to prevent infiltration.',
  },
  SEVERE: {
    shortStatement: 'Affects healthy people and seriously impacts those with existing diseases',
    description: 'Emergency public health condition. Hazardous particulate concentration triggering acute symptoms even during brief exposure.',
    colorHex: '#7F1D1D', // Maroon / Dark Red
    colorClass: 'text-[#641414] bg-[#FEE2E2] border-[#7F1D1D]/40',
    generalPublicAdvice: 'Strictly remain indoors. Physical outdoor activity must be completely avoided.',
    sensitiveGroupsAdvice: 'High alert for asthmatic and cardiac exacerbations. Medical attention if wheezing or chest tightness occurs.',
    indoorGuidance: 'Create a designated clean room. Run HEPA air purifiers at maximum CADR continuous delivery.',
  },
  INSUFFICIENT_DATA: {
    shortStatement: 'Insufficient sensor parameters to compute CPCB AQI',
    description: 'Per CPCB guidelines, at least 3 parameters (including PM2.5 or PM10) must be reported to compute overall AQI.',
    colorHex: '#68766C', // Slate gray
    colorClass: 'text-[#48534C] bg-[#F0F2EF] border-[#68766C]/30',
    generalPublicAdvice: 'Refer to individual pollutant concentrations below rather than a composite index.',
    sensitiveGroupsAdvice: 'Check individual PM2.5 readings if available before outdoor exposure.',
    indoorGuidance: 'Maintain standard air quality hygiene based on seasonal smog expectations.',
  },
  UNAVAILABLE: {
    shortStatement: 'CPCB National AQI unavailable',
    description: 'CPCB National AQI combines 24-hour averages (PM2.5, PM10, NO2, SO2, NH3, Pb) and 8-hour running averages (CO, O3). Requires at least 16 hours of valid data in the 24-hour cycle per MoEFCC protocol.',
    colorHex: '#68766C',
    colorClass: 'text-[#48534C] bg-[#F0F2EF] border-[#68766C]/30',
    generalPublicAdvice: 'Refer to the short-term 1-hour acute indicator for immediate exposure guidance.',
    sensitiveGroupsAdvice: 'Consult real-time PM2.5 measurements to inform immediate outdoor decisions.',
    indoorGuidance: 'Maintain continuous filtration based on real-time atmospheric readings.',
  },
};

/**
 * Normalizes pollutant raw values into CPCB expected units:
 * - CO must be in mg/m³
 * - All other 7 pollutants must be in µg/m³
 */
export function normalizeConcentration(
  pollutant: PollutantCode,
  value: number,
  unit: string
): { normalizedValue: number; normalizedUnit: 'µg/m³' | 'mg/m³' } {
  const cleanUnit = unit.toLowerCase().trim();

  if (pollutant === 'CO') {
    // Expected unit: mg/m³
    if (cleanUnit.includes('ppm')) {
      // 1 ppm CO = 1.145 mg/m³ at 25°C, 1 atm
      return {
        normalizedValue: Math.round(value * 1.145 * 100) / 100,
        normalizedUnit: 'mg/m³',
      };
    }
    if (cleanUnit.includes('µg/m³') || cleanUnit.includes('ug/m3')) {
      return {
        normalizedValue: Math.round((value / 1000) * 100) / 100,
        normalizedUnit: 'mg/m³',
      };
    }
    return {
      normalizedValue: Math.round(value * 100) / 100,
      normalizedUnit: 'mg/m³',
    };
  }

  // All other pollutants: expected unit is µg/m³
  if (cleanUnit.includes('ppm')) {
    // Generic standard gas conversions at 25°C 1 atm:
    let factor = 1000;
    if (pollutant === 'NO2') factor = 1880;
    else if (pollutant === 'SO2') factor = 2620;
    else if (pollutant === 'O3') factor = 1960;
    else if (pollutant === 'NH3') factor = 696;
    return {
      normalizedValue: Math.round(value * factor * 10) / 10,
      normalizedUnit: 'µg/m³',
    };
  }
  if (cleanUnit.includes('mg/m³') || cleanUnit.includes('mg/m3')) {
    return {
      normalizedValue: Math.round(value * 1000 * 10) / 10,
      normalizedUnit: 'µg/m³',
    };
  }

  return {
    normalizedValue: Math.round(value * 10) / 10,
    normalizedUnit: 'µg/m³',
  };
}

/**
 * Calculates the CPCB Sub-Index for a single pollutant
 * using the official piecewise linear interpolation formula.
 */
export function calculateCpcbSubIndex(
  pollutant: PollutantCode,
  concentration: number
): { subIndex: number | null; category: CpcbCategory | null } {
  if (concentration < 0 || isNaN(concentration) || !isFinite(concentration)) {
    return { subIndex: null, category: null };
  }

  const breakpoints = CPCB_BREAKPOINTS[pollutant];
  if (!breakpoints || breakpoints.length === 0) {
    return { subIndex: null, category: null };
  }

  // Round concentration appropriately:
  // CO and Pb allow 1 decimal place; others are integers in CPCB standard tables
  let cp = concentration;
  if (pollutant === 'CO' || pollutant === 'Pb') {
    cp = Math.round(concentration * 10) / 10;
  } else {
    cp = Math.round(concentration);
  }

  for (let i = 0; i < breakpoints.length; i++) {
    const bp = breakpoints[i];
    // Check if within current bracket
    if (cp <= bp.bph) {
      // Linear interpolation:
      // Ip = [ (I_high - I_low) / (BPH - BPL) ] * (Cp - BPL) + I_low
      const iRange = bp.iHigh - bp.iLow;
      const bpRange = bp.bph - bp.bpl;
      if (bpRange === 0) return { subIndex: bp.iLow, category: bp.category };

      const subIndex = Math.round(((iRange / bpRange) * (cp - bp.bpl)) + bp.iLow);
      return {
        subIndex: Math.max(0, subIndex),
        category: bp.category,
      };
    }
  }

  // If concentration exceeds highest bracket high breakpoint, clamp to Severe range
  const highestBp = breakpoints[breakpoints.length - 1];
  const severeIndex = Math.min(500, Math.round(
    ((highestBp.iHigh - highestBp.iLow) / (highestBp.bph - highestBp.bpl)) *
      (cp - highestBp.bpl) +
      highestBp.iLow
  ));

  return {
    subIndex: Math.max(401, severeIndex),
    category: 'SEVERE',
  };
}

/**
 * Maps any numeric AQI value (0 to 500+) to its CPCB category
 */
export function getCpcbCategory(aqi: number): CpcbCategory {
  if (aqi <= 50) return 'GOOD';
  if (aqi <= 100) return 'SATISFACTORY';
  if (aqi <= 200) return 'MODERATELY_POLLUTED';
  if (aqi <= 300) return 'POOR';
  if (aqi <= 400) return 'VERY_POOR';
  return 'SEVERE';
}

/**
 * Validates CPCB Data Sufficiency Rule:
 * Requirement 1: At least 3 criteria pollutants must be present.
 * Requirement 2: At least one of PM2.5 or PM10 must be present.
 */
export function checkCpcbDataSufficiency(
  validPollutants: PollutantCode[]
): CpcbDataSufficiency {
  const pollutantCount = validPollutants.length;
  const hasPM25 = validPollutants.includes('PM2.5');
  const hasPM10 = validPollutants.includes('PM10');
  const hasParticulate = hasPM25 || hasPM10;

  let missingParticulateReason: string | undefined = undefined;
  if (!hasParticulate) {
    missingParticulateReason = 'CPCB mandates monitoring of PM2.5 or PM10 to calculate a valid regional AQI.';
  }

  const isSufficient = pollutantCount >= 3 && hasParticulate;

  let details = 'Satisfies CPCB data sufficiency requirements.';
  if (pollutantCount < 3) {
    details = `Only ${pollutantCount} pollutant(s) monitored. CPCB requires at least 3 parameters.`;
  } else if (!hasParticulate) {
    details = 'At least 3 gases monitored, but neither PM2.5 nor PM10 particulate is measured.';
  }

  return {
    isSufficient,
    pollutantCount,
    hasParticulate,
    monitoredPollutants: validPollutants,
    missingParticulateReason,
    details,
  };
}

export interface RawPollutantInput {
  pollutant: PollutantCode;
  value: number;
  unit: string;
  averagingPeriod?: AveragingPeriod;
  measurementTimestampUtc?: string;
  rawParameterName?: string;
}

export interface HourlySampleInput {
  pollutant: PollutantCode;
  value: number;
  unit: string;
  measurementTimestamp: Date | string;
  stationId?: string;
}

/**
 * Calculates Official CPCB National Air Quality Index (Regulatory 24-Hour Average)
 * 
 * Strict Scientific Rules per CPCB / MoEFCC 2014-2015 Protocol:
 * 1. Requires minimum 16 hours of valid data in the 24-hour monitoring cycle for sub-index eligibility.
 *    (Continuity is NOT required: non-continuous hourly samples with >= 16 distinct valid hours satisfy criteria).
 * 2. 24-hour arithmetic average for PM2.5, PM10, NO2, SO2, NH3, Pb.
 * 3. 8-hour running average for CO and O3 across readings within the active 8-hour window [asOfTime - 8h, asOfTime],
 *    provided the station meets the official 16-hour completeness rule in the 24-hour cycle.
 * 4. Sample deduplication: multiple readings within the same hourly bucket are averaged into 1 hourly bin
 *    and count as exactly 1 valid observation hour.
 * 5. Station isolation: if targetStationId is specified, samples with a differing stationId are rejected.
 * 6. Plausibility & future time defense: negative readings, values exceeding physical plausibility ceilings,
 *    and future timestamps (> 5 min clock drift) are strictly rejected.
 * 7. CPCB Sufficiency: At least 3 parameters meeting completeness must be present, including PM2.5 or PM10.
 * 8. If completeness is < 16 hours or sufficiency is not met, official AQI is explicitly UNAVAILABLE (null).
 */
export function calculateOfficialCpcbAqi(
  hourlySamples: HourlySampleInput[],
  asOfTime = new Date(),
  targetStationId?: string
): OfficialCpcbAqiResult {
  const emptySubIndices: Record<PollutantCode, number | null> = {
    'PM2.5': null,
    'PM10': null,
    'NO2': null,
    'SO2': null,
    'CO': null,
    'O3': null,
    'NH3': null,
    'Pb': null,
  };

  const asOfMs = asOfTime.getTime();
  const window24hMs = 24 * 60 * 60 * 1000;
  const window8hMs = 8 * 60 * 60 * 1000;
  const maxFutureDriftMs = 5 * 60 * 1000; // 5 min future clock skew tolerance

  // Sort samples chronologically
  const sortedSamples = [...hourlySamples].sort((a, b) => {
    const tA = new Date(a.measurementTimestamp).getTime();
    const tB = new Date(b.measurementTimestamp).getTime();
    return tA - tB;
  });

  // Group valid samples by pollutant into hourly bins:
  // hourKey -> array of normalized concentration values in that hour
  const hourlyBins: Record<PollutantCode, Map<number, number[]>> = {
    'PM2.5': new Map(),
    'PM10': new Map(),
    'NO2': new Map(),
    'SO2': new Map(),
    'CO': new Map(),
    'O3': new Map(),
    'NH3': new Map(),
    'Pb': new Map(),
  };

  const rawObservationCounts: Record<PollutantCode, number> = {
    'PM2.5': 0,
    'PM10': 0,
    'NO2': 0,
    'SO2': 0,
    'CO': 0,
    'O3': 0,
    'NH3': 0,
    'Pb': 0,
  };

  for (const s of sortedSamples) {
    // 1. Station isolation check
    if (targetStationId && s.stationId && s.stationId !== targetStationId) {
      continue;
    }

    // 2. Numeric & non-negative check
    if (s.value === null || s.value === undefined || isNaN(s.value) || !isFinite(s.value) || s.value < 0) {
      continue;
    }

    // 3. Timestamp sanity: reject future timestamps exceeding 5-min tolerance
    const tMs = new Date(s.measurementTimestamp).getTime();
    if (isNaN(tMs) || tMs > asOfMs + maxFutureDriftMs) {
      continue;
    }

    // 4. Must fall within the 24-hour observation window [asOfMs - 24h, asOfMs]
    if (tMs < asOfMs - window24hMs || tMs > asOfMs) {
      continue;
    }

    // 5. Physical concentration ceiling check
    const physicalLimit = PHYSICAL_CONCENTRATION_LIMITS[s.pollutant];
    if (physicalLimit) {
      let checkVal = s.value;
      const unitLower = (s.unit || '').toLowerCase();
      if (s.pollutant !== 'CO' && (unitLower.includes('mg/m') || unitLower.includes('mg/m3'))) {
        checkVal = s.value * 1000;
      }
      if (s.pollutant === 'CO' && (unitLower.includes('µg/m') || unitLower.includes('ug/m3'))) {
        checkVal = s.value / 1000;
      }
      if (checkVal > physicalLimit.max) {
        continue; // Exceeds physical ceiling, reject corrupt outlier
      }
    }

    // Normalize value
    const { normalizedValue } = normalizeConcentration(s.pollutant, s.value, s.unit);

    rawObservationCounts[s.pollutant] = (rawObservationCounts[s.pollutant] || 0) + 1;

    // Hourly bin bucket (floor timestamp to hour)
    const hourKey = Math.floor(tMs / (60 * 60 * 1000));
    if (!hourlyBins[s.pollutant].has(hourKey)) {
      hourlyBins[s.pollutant].set(hourKey, []);
    }
    hourlyBins[s.pollutant].get(hourKey)!.push(normalizedValue);
  }

  // Calculate per-pollutant hourly averages and completeness audit
  const pollutantAudits: Partial<Record<PollutantCode, PollutantCompletenessAudit>> = {};
  const validPollutants: PollutantCode[] = [];
  const subIndices = { ...emptySubIndices };
  let maxCompletenessHours = 0;

  const allCodes: PollutantCode[] = ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3', 'Pb'];

  for (const code of allCodes) {
    const hourMap = hourlyBins[code];
    const validObservationHours = hourMap.size;
    const validObservationCount = rawObservationCounts[code];

    if (validObservationHours > maxCompletenessHours) {
      maxCompletenessHours = validObservationHours;
    }

    // If no samples were received for this pollutant, skip creating an audit
    if (validObservationCount === 0) {
      continue;
    }

    const is8HourPollutant = code === 'CO' || code === 'O3';
    const averagingPeriodHours: 24 | 8 = is8HourPollutant ? 8 : 24;
    const activeWindowHours: 24 | 8 = averagingPeriodHours;
    const activeWindowThresholdHours = is8HourPollutant ? 6 : 16; // 6h (75%) engineering safeguard for 8h window; 16h for 24h cycle

    // CPCB Statutory Rule: Minimum 16 hours of data in the 24-hour cycle required for sub-index calculation
    const satisfiesCpcbCycleCompleteness = validObservationHours >= 16;

    let finalConcentration: number | null = null;
    let subIndex: number | null = null;
    let rejectionReason: string | undefined = undefined;
    let activeWindowObservationHours = 0;
    let engineeringSafeguardSatisfied = false;

    if (is8HourPollutant) {
      // 8-hour running average: average of distinct hourly bins within the active 8-hour window [asOfHourKey - 7, asOfHourKey]
      const asOfHourKey = Math.floor(asOfMs / (60 * 60 * 1000));
      const min8hHourKey = asOfHourKey - 7;
      
      let sum8h = 0;
      let count8h = 0;

      for (const [hKey, valuesInHour] of hourMap.entries()) {
        if (hKey >= min8hHourKey && hKey <= asOfHourKey) {
          const hourAvg = valuesInHour.reduce((a, b) => a + b, 0) / valuesInHour.length;
          sum8h += hourAvg;
          count8h += 1;
        }
      }

      activeWindowObservationHours = count8h;
      engineeringSafeguardSatisfied = count8h >= activeWindowThresholdHours;

      if (!satisfiesCpcbCycleCompleteness) {
        rejectionReason = `Insufficient valid observation hours in 24-hour cycle (${validObservationHours}/24 hrs). CPCB protocol requires at least 16 valid observation hours.`;
      } else if (!engineeringSafeguardSatisfied) {
        // CPCB 24h threshold was met, but active 8h running window has insufficient observations (< 6 hours / 75%)
        rejectionReason = `Engineering safeguard: Active 8-hour window contains only ${count8h}/8 valid hourly observations (minimum 6 hours / 75% data completeness required for representative running average). Note: CPCB requires 16h in 24h cycle; 6h in 8h window is an engineering data-quality safeguard.`;
      } else {
        finalConcentration = sum8h / count8h;
      }
    } else {
      // 24-hour arithmetic average across distinct hourly bin means
      activeWindowObservationHours = validObservationHours;
      engineeringSafeguardSatisfied = satisfiesCpcbCycleCompleteness;

      if (!satisfiesCpcbCycleCompleteness) {
        rejectionReason = `Insufficient valid observation hours (${validObservationHours}/24 hrs). CPCB protocol requires at least 16 valid observation hours in the 24-hour cycle.`;
      } else {
        let sum24h = 0;
        for (const valuesInHour of hourMap.values()) {
          const hourAvg = valuesInHour.reduce((a, b) => a + b, 0) / valuesInHour.length;
          sum24h += hourAvg;
        }
        finalConcentration = sum24h / validObservationHours;
      }
    }

    const isSubIndexEligible = satisfiesCpcbCycleCompleteness && engineeringSafeguardSatisfied;

    if (isSubIndexEligible && finalConcentration !== null) {
      finalConcentration = Math.round(finalConcentration * 100) / 100;
      const res = calculateCpcbSubIndex(code, finalConcentration);
      subIndex = res.subIndex;
      if (subIndex !== null) {
        subIndices[code] = subIndex;
        validPollutants.push(code);
      }
    }

    pollutantAudits[code] = {
      pollutant: code,
      averagingPeriodHours,
      observationWindowHours: 24,
      validObservationCount,
      validObservationHours,
      dataCoverageHours: validObservationHours,
      completenessThresholdHours: 16,
      isSubIndexEligible,
      activeWindowHours,
      activeWindowObservationHours,
      activeWindowThresholdHours,
      engineeringSafeguardSatisfied,
      concentration: isSubIndexEligible ? finalConcentration : null,
      unit: code === 'CO' ? 'mg/m³' : 'µg/m³',
      subIndex: isSubIndexEligible ? subIndex : null,
      rejectionReason,
    };
  }

  // Check CPCB data sufficiency rule (>= 3 parameters including PM2.5 or PM10)
  const sufficiency = checkCpcbDataSufficiency(validPollutants);
  const hasParticulate = sufficiency.hasParticulate;
  const isOverallAqiEligible = sufficiency.isSufficient;

  if (!isOverallAqiEligible) {
    const reason = maxCompletenessHours < 16
      ? `Insufficient valid observation data (${maxCompletenessHours}/24 hours). CPCB National AQI mandates at least 16 hours of valid data in the 24-hour monitoring cycle (non-continuous data accepted).`
      : `Insufficient parameters with 16-hour valid data completeness (${validPollutants.length} valid). CPCB National AQI requires at least 3 eligible parameters with mandatory PM2.5 or PM10.`;

    return {
      status: maxCompletenessHours < 16 ? 'INSUFFICIENT_COMPLETENESS' : 'INSUFFICIENT_POLLUTANTS',
      aqi: null,
      category: 'UNAVAILABLE',
      dominantPollutant: null,
      dominantSubIndex: null,
      completenessHours: maxCompletenessHours,
      minRequiredHours: 16,
      completenessThresholdHours: 16,
      validPollutantCount: validPollutants.length,
      hasParticulate,
      isOverallAqiEligible: false,
      isRegulatoryCompliant: false,
      averagingPeriod: '24_HOUR',
      subIndices,
      pollutantAudits,
      healthGuidance: CPCB_HEALTH_STATEMENTS.UNAVAILABLE,
      methodology: 'CPCB_NAQI_INDIA_2014',
      reason,
    };
  }

  // Determine dominant pollutant and overall AQI
  const priorityOrder: PollutantCode[] = ['PM2.5', 'PM10', 'NO2', 'O3', 'SO2', 'CO', 'NH3', 'Pb'];
  let maxSubIndex = -1;
  let dominant: PollutantCode | null = null;

  for (const p of priorityOrder) {
    const s = subIndices[p];
    if (s !== null && s > maxSubIndex) {
      maxSubIndex = s;
      dominant = p;
    }
  }

  const overallAqi = maxSubIndex >= 0 ? maxSubIndex : null;
  const category = overallAqi !== null ? getCpcbCategory(overallAqi) : 'UNAVAILABLE';
  const healthGuidance = overallAqi !== null ? CPCB_HEALTH_STATEMENTS[category] : CPCB_HEALTH_STATEMENTS.UNAVAILABLE;

  return {
    status: 'AVAILABLE',
    aqi: overallAqi,
    category,
    dominantPollutant: dominant,
    dominantSubIndex: maxSubIndex >= 0 ? maxSubIndex : null,
    completenessHours: maxCompletenessHours,
    minRequiredHours: 16,
    completenessThresholdHours: 16,
    validPollutantCount: validPollutants.length,
    hasParticulate,
    isOverallAqiEligible: true,
    isRegulatoryCompliant: true,
    averagingPeriod: '24_HOUR',
    subIndices,
    pollutantAudits,
    healthGuidance,
    methodology: 'CPCB_NAQI_INDIA_2014',
    reason: 'Satisfies CPCB National AQI data completeness (>= 16 valid observation hours in 24h cycle, 8h running mean for CO/O3) and parameter sufficiency standards.',
  };
}

/**
 * Calculates Short-Term Air Quality Indicator (1-Hour Acute Sensor Proxy)
 * Formulated from instantaneous/hourly sensor readings evaluated against CPCB breakpoints
 * strictly for immediate exposure advisory.
 */
export function calculateShortTermIndicator(
  inputs: RawPollutantInput[]
): ShortTermAirQualityIndicator {
  const subIndices: Record<PollutantCode, number | null> = {
    'PM2.5': null,
    'PM10': null,
    'NO2': null,
    'SO2': null,
    'CO': null,
    'O3': null,
    'NH3': null,
    'Pb': null,
  };

  const validPollutants: PollutantCode[] = [];

  for (const input of inputs) {
    if (input.value === null || input.value === undefined || isNaN(input.value) || input.value < 0) {
      continue;
    }

    const { normalizedValue } = normalizeConcentration(input.pollutant, input.value, input.unit);
    const { subIndex } = calculateCpcbSubIndex(input.pollutant, normalizedValue);

    if (subIndex !== null) {
      subIndices[input.pollutant] = subIndex;
      validPollutants.push(input.pollutant);
    }
  }

  const sufficiency = checkCpcbDataSufficiency(validPollutants);
  const averagingNotice =
    'Short-Term Air Quality Indicator (1-Hour Acute Proxy): Acute 1-hour sensor concentrations evaluated against CPCB breakpoints for immediate exposure mitigation. Does not represent certified 24-hour CPCB regulatory compliance.';

  if (!sufficiency.isSufficient) {
    return {
      status: 'INSUFFICIENT_DATA',
      indicatorValue: null,
      category: 'INSUFFICIENT_DATA',
      dominantPollutant: null,
      dominantSubIndex: null,
      observationPeriod: '1_HOUR',
      label: 'Short-Term Air Quality Indicator (1-Hour Acute Proxy)',
      subIndices,
      healthGuidance: CPCB_HEALTH_STATEMENTS.INSUFFICIENT_DATA,
      averagingNotice,
    };
  }

  const priorityOrder: PollutantCode[] = ['PM2.5', 'PM10', 'NO2', 'O3', 'SO2', 'CO', 'NH3', 'Pb'];
  let maxSubIndex = -1;
  let dominant: PollutantCode | null = null;

  for (const p of priorityOrder) {
    const s = subIndices[p];
    if (s !== null && s > maxSubIndex) {
      maxSubIndex = s;
      dominant = p;
    }
  }

  const overallIndicator = maxSubIndex >= 0 ? maxSubIndex : null;
  const category = overallIndicator !== null ? getCpcbCategory(overallIndicator) : 'INSUFFICIENT_DATA';
  const healthGuidance = CPCB_HEALTH_STATEMENTS[category];

  return {
    status: 'AVAILABLE',
    indicatorValue: overallIndicator,
    category,
    dominantPollutant: dominant,
    dominantSubIndex: maxSubIndex >= 0 ? maxSubIndex : null,
    observationPeriod: '1_HOUR',
    label: 'Short-Term Air Quality Indicator (1-Hour Acute Proxy)',
    subIndices,
    healthGuidance,
    averagingNotice,
  };
}

/**
 * Master CPCB Indian National AQI Calculator (Backwards Compatible)
 * Produces canonical measurements, official CPCB result, and short-term indicator.
 */
export function calculateCpcbAqi(inputs: RawPollutantInput[]): {
  measurements: Record<PollutantCode, CanonicalPollutantMeasurement | null>;
  aqiResult: CpcbAqiResult;
  officialCpcbAqi: OfficialCpcbAqiResult;
  shortTermIndicator: ShortTermAirQualityIndicator;
} {
  const measurements: Record<PollutantCode, CanonicalPollutantMeasurement | null> = {
    'PM2.5': null,
    'PM10': null,
    'NO2': null,
    'SO2': null,
    'CO': null,
    'O3': null,
    'NH3': null,
    'Pb': null,
  };

  for (const input of inputs) {
    if (input.value === null || input.value === undefined || isNaN(input.value) || input.value < 0) {
      continue;
    }

    const { normalizedValue, normalizedUnit } = normalizeConcentration(
      input.pollutant,
      input.value,
      input.unit
    );

    const { subIndex, category } = calculateCpcbSubIndex(input.pollutant, normalizedValue);
    const naaqs = CPCB_NAAQS_LIMITS[input.pollutant];
    const isExceededNAAQS = naaqs ? normalizedValue > naaqs.limit : false;
    const is1Hour = (input.averagingPeriod || '1_HOUR') === '1_HOUR';

    measurements[input.pollutant] = {
      pollutant: input.pollutant,
      value: input.value,
      originalUnit: input.unit,
      normalizedUnit,
      normalizedValue,
      averagingPeriod: input.averagingPeriod || '1_HOUR',
      isInstantaneousProxy: is1Hour,
      subIndex,
      cpcbCategory: category,
      observationTimestampUtc: input.measurementTimestampUtc || new Date().toISOString(),
      ingestionTimestampUtc: new Date().toISOString(),
      isExceededNAAQS,
      rawParameterName: input.rawParameterName,
    };
  }

  // Calculate Short-Term Indicator (from real-time sensor observations)
  const shortTermIndicator = calculateShortTermIndicator(inputs);

  // Single-snapshot inputs have completeness = 1 hour, so official CPCB AQI is insufficient
  const officialCpcbAqi: OfficialCpcbAqiResult = {
    status: 'INSUFFICIENT_COMPLETENESS',
    aqi: null,
    category: 'UNAVAILABLE',
    dominantPollutant: null,
    dominantSubIndex: null,
    completenessHours: 1.0,
    minRequiredHours: 16.0,
    completenessThresholdHours: 16.0,
    validPollutantCount: 0,
    hasParticulate: false,
    isOverallAqiEligible: false,
    isRegulatoryCompliant: false,
    averagingPeriod: '24_HOUR',
    subIndices: shortTermIndicator.subIndices,
    healthGuidance: CPCB_HEALTH_STATEMENTS.UNAVAILABLE,
    methodology: 'CPCB_NAQI_INDIA_2014',
    reason: 'Single hourly sensor observation does not meet the minimum 16 hours of valid data required for CPCB National AQI (non-continuous data accepted).',
  };

  // Construct backward-compatible aqiResult
  const aqiResult: CpcbAqiResult = {
    aqi: shortTermIndicator.indicatorValue,
    category: shortTermIndicator.category,
    dominantPollutant: shortTermIndicator.dominantPollutant,
    dominantSubIndex: shortTermIndicator.dominantSubIndex,
    healthGuidance: shortTermIndicator.healthGuidance,
    subIndices: shortTermIndicator.subIndices,
    dataSufficiency: checkCpcbDataSufficiency(
      (Object.keys(shortTermIndicator.subIndices) as PollutantCode[]).filter(
        (p) => shortTermIndicator.subIndices[p] !== null
      )
    ),
    methodology: 'CPCB_NAQI_INDIA_2014',
    averagingNotice: shortTermIndicator.averagingNotice,
    isInstantaneousProxy: true,
  };

  return {
    measurements,
    aqiResult,
    officialCpcbAqi,
    shortTermIndicator,
  };
}
