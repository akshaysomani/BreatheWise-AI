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
 * 5. Overall AQI = max(subIndices of monitored pollutants).
 * 6. Official CPCB 6-category classification & health statements.
 */

import {
  PollutantCode,
  CpcbCategory,
  CpcbHealthGuidance,
  CpcbDataSufficiency,
  CpcbAqiResult,
  CanonicalPollutantMeasurement,
  AveragingPeriod,
} from './types';

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
export const CPCB_HEALTH_STATEMENTS: Record<CpcbCategory | 'INSUFFICIENT_DATA', CpcbHealthGuidance> = {
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
    // For the first bracket, bpl is 0
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

/**
 * Master CPCB Indian National AQI Calculator
 * Accepts raw pollutant inputs, normalizes units, calculates individual sub-indices,
 * verifies the CPCB data sufficiency rule, and determines dominant pollutant and overall AQI.
 */
export function calculateCpcbAqi(inputs: RawPollutantInput[]): {
  measurements: Record<PollutantCode, CanonicalPollutantMeasurement | null>;
  aqiResult: CpcbAqiResult;
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

    const { normalizedValue, normalizedUnit } = normalizeConcentration(
      input.pollutant,
      input.value,
      input.unit
    );

    const { subIndex, category } = calculateCpcbSubIndex(input.pollutant, normalizedValue);

    const naaqs = CPCB_NAAQS_LIMITS[input.pollutant];
    const isExceededNAAQS = naaqs ? normalizedValue > naaqs.limit : false;

    measurements[input.pollutant] = {
      pollutant: input.pollutant,
      value: input.value,
      originalUnit: input.unit,
      normalizedUnit,
      normalizedValue,
      averagingPeriod: input.averagingPeriod || '24_HOUR',
      subIndex,
      cpcbCategory: category,
      measurementTimestampUtc: input.measurementTimestampUtc || new Date().toISOString(),
      isExceededNAAQS,
      rawParameterName: input.rawParameterName,
    };

    if (subIndex !== null) {
      subIndices[input.pollutant] = subIndex;
      validPollutants.push(input.pollutant);
    }
  }

  const sufficiency = checkCpcbDataSufficiency(validPollutants);

  if (!sufficiency.isSufficient) {
    // Insufficient data per CPCB: overall AQI cannot be formulated
    return {
      measurements,
      aqiResult: {
        aqi: null,
        category: 'INSUFFICIENT_DATA',
        dominantPollutant: null,
        dominantSubIndex: null,
        healthGuidance: CPCB_HEALTH_STATEMENTS.INSUFFICIENT_DATA,
        subIndices,
        dataSufficiency: sufficiency,
        methodology: 'CPCB_NAQI_INDIA_2014',
      },
    };
  }

  // Find dominant pollutant (maximum subIndex)
  // Tie-breaker priority: PM2.5 > PM10 > NO2 > O3 > others
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
  const category = overallAqi !== null ? getCpcbCategory(overallAqi) : 'INSUFFICIENT_DATA';
  const healthGuidance = CPCB_HEALTH_STATEMENTS[category];

  return {
    measurements,
    aqiResult: {
      aqi: overallAqi,
      category,
      dominantPollutant: dominant,
      dominantSubIndex: maxSubIndex >= 0 ? maxSubIndex : null,
      healthGuidance,
      subIndices,
      dataSufficiency: sufficiency,
      methodology: 'CPCB_NAQI_INDIA_2014',
    },
  };
}
