/**
 * BreatheWise AI — Atmospheric Measurement Validator & Data Integrity Guard
 * Module M4.1: Strict Physical Plausibility, Range Checking & Future Time Defense
 */

import { PollutantCode } from './types';

export interface ValidatedMeasurement {
  pollutant: PollutantCode;
  value: number;
  unit: string;
  observationTimestampUtc: string;
  isValid: boolean;
  rejectionReason?: string;
  reason?: string; // Backwards-compatible alias
  qualityFlags: string[];
}

// Physical upper limits based on maximum atmospheric concentrations ever recorded
export const PHYSICAL_CONCENTRATION_LIMITS: Record<PollutantCode, { max: number; unit: string }> = {
  'PM2.5': { max: 2000, unit: 'µg/m³' },
  'PM10': { max: 3000, unit: 'µg/m³' },
  'NO2': { max: 1500, unit: 'µg/m³' },
  'SO2': { max: 3000, unit: 'µg/m³' },
  'CO': { max: 150, unit: 'mg/m³' }, // in mg/m³
  'O3': { max: 1500, unit: 'µg/m³' },
  'NH3': { max: 3000, unit: 'µg/m³' },
  'Pb': { max: 50, unit: 'µg/m³' },
};

export const PHYSICAL_CONCENTRATION_CEILINGS = PHYSICAL_CONCENTRATION_LIMITS;

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes max clock drift allowed

/**
 * Validates a single incoming pollutant measurement from an upstream provider.
 * Enforces non-negative, finite numbers, physical boundary limits, and valid non-future timestamps.
 */
export function validateMeasurement(
  pollutant: PollutantCode,
  value: unknown,
  unit: string,
  timestampInput?: string | null | Date
): ValidatedMeasurement {
  const flags: string[] = [];

  // Convert Date input if supplied
  const timestampStr = timestampInput instanceof Date ? timestampInput.toISOString() : timestampInput;

  // 1. Numeric & Finite check
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    const reason = `Non-numeric or non-finite concentration value: ${String(value)}`;
    return {
      pollutant,
      value: 0,
      unit,
      observationTimestampUtc: new Date().toISOString(),
      isValid: false,
      rejectionReason: reason,
      reason,
      qualityFlags: ['REJECTED_NON_NUMERIC'],
    };
  }

  // 2. Non-negative check
  if (value < 0) {
    const reason = `Negative concentration reading is physically invalid: ${value}`;
    return {
      pollutant,
      value,
      unit,
      observationTimestampUtc: new Date().toISOString(),
      isValid: false,
      rejectionReason: reason,
      reason,
      qualityFlags: ['REJECTED_NEGATIVE_VALUE'],
    };
  }

  // 3. Physical plausibility ceiling check
  const physicalLimit = PHYSICAL_CONCENTRATION_LIMITS[pollutant];
  if (physicalLimit) {
    // If unit is mg/m³ for gas other than CO, convert roughly for limit check
    let checkVal = value;
    if (pollutant !== 'CO' && (unit.toLowerCase().includes('mg/m') || unit.toLowerCase().includes('mg/m3'))) {
      checkVal = value * 1000;
    }
    if (pollutant === 'CO' && (unit.toLowerCase().includes('µg/m') || unit.toLowerCase().includes('ug/m3'))) {
      checkVal = value / 1000;
    }

    if (checkVal > physicalLimit.max) {
      const reason = `Concentration ${value} ${unit} exceeds physical plausibility ceiling (${physicalLimit.max} ${physicalLimit.unit})`;
      return {
        pollutant,
        value,
        unit,
        observationTimestampUtc: new Date().toISOString(),
        isValid: false,
        rejectionReason: reason,
        reason,
        qualityFlags: ['REJECTED_EXCEEDS_PHYSICAL_LIMIT'],
      };
    }
  }

  // 4. Timestamp validation
  let obsTime = Date.now();
  let observationTimestampUtc = new Date().toISOString();

  if (timestampStr) {
    const parsedTime = new Date(timestampStr).getTime();
    if (isNaN(parsedTime)) {
      flags.push('SUSPICIOUS_MALFORMED_TIMESTAMP');
    } else {
      obsTime = parsedTime;
      observationTimestampUtc = new Date(parsedTime).toISOString();

      // Check future timestamp
      const now = Date.now();
      if (obsTime > now + FUTURE_TOLERANCE_MS) {
        const reason = `Future timestamp rejected: observation timestamp ${observationTimestampUtc} is in the future (>5 min clock skew)`;
        return {
          pollutant,
          value,
          unit,
          observationTimestampUtc,
          isValid: false,
          rejectionReason: reason,
          reason,
          qualityFlags: ['REJECTED_FUTURE_TIMESTAMP'],
        };
      }
    }
  } else {
    flags.push('MISSING_UPSTREAM_TIMESTAMP');
  }

  return {
    pollutant,
    value,
    unit,
    observationTimestampUtc,
    isValid: true,
    qualityFlags: flags,
  };
}

/**
 * Validates and sanitizes a complete collection of pollutant readings.
 * Rejects invalid readings and removes duplicate parameters (favoring newer observations).
 */
export function sanitizeMeasurementBatch(
  readings: Array<{
    pollutant: PollutantCode;
    value: unknown;
    unit: string;
    timestamp?: string | null | Date;
  }>
): ValidatedMeasurement[] {
  const validatedList: ValidatedMeasurement[] = [];
  const latestByPollutant = new Map<PollutantCode, ValidatedMeasurement>();

  for (const r of readings) {
    const v = validateMeasurement(r.pollutant, r.value, r.unit, r.timestamp);
    if (!v.isValid) {
      continue;
    }

    // Deduplication check: Keep newest observation if multiple readings exist
    const existing = latestByPollutant.get(r.pollutant);
    if (!existing) {
      latestByPollutant.set(r.pollutant, v);
    } else {
      const existingTime = new Date(existing.observationTimestampUtc).getTime();
      const newTime = new Date(v.observationTimestampUtc).getTime();
      if (newTime > existingTime) {
        latestByPollutant.set(r.pollutant, v);
      }
    }
  }

  return Array.from(latestByPollutant.values());
}
