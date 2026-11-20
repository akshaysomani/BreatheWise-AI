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

/**
 * Physical upper concentration plausibility ceilings.
 * 
 * SCIENTIFIC JUSTIFICATION & EPIDEMIOLOGICAL BASIS:
 * These ceilings represent physical upper plausibility bounds to reject corrupt instrumentation noise,
 * stuck-at-ADC-max faults (e.g. 9999 readings), and communications framing errors, while strictly
 * preserving even the most extreme documented atmospheric episodes in Indian and global environmental history:
 * 
 * 1. PM2.5 (2000 µg/m³):
 *    - CPCB Severe breakpoint: > 250 µg/m³ (AQI 500 ceiling at 380 µg/m³).
 *    - Historical extreme: Delhi severe post-Diwali smog peaks (Nov 2016, Nov 2019) reached 800-1200 µg/m³.
 *    - Global record: Canadian/Australian mega-wildfire dense smoke plumes documented at 1500-1800 µg/m³.
 *    - Ceiling of 2000 µg/m³ is > 5x the AQI 500 boundary, accommodating any real-world emergency while rejecting sensor faults.
 * 
 * 2. PM10 (3000 µg/m³):
 *    - CPCB Severe breakpoint: > 430 µg/m³ (AQI 500 ceiling at 550 µg/m³).
 *    - Historical extreme: Thar desert dust storms impacting Indo-Gangetic Plains (June 2018) reached 1800-2200 µg/m³.
 *    - Ceiling of 3000 µg/m³ is > 5x the AQI 500 boundary, safely accepting intense particulate storms.
 * 
 * 3. NO2 (1500 µg/m³):
 *    - CPCB Severe breakpoint: > 400 µg/m³ (AQI 500 ceiling at 600 µg/m³).
 *    - Historical extreme: Dense traffic canyon curbside peaks rarely exceed 400-500 µg/m³.
 *    - 1500 µg/m³ (~0.80 ppm at 25°C 1 atm) represents a massive 2.5x margin over AQI 500.
 * 
 * 4. SO2 (3000 µg/m³):
 *    - CPCB Severe breakpoint: > 1600 µg/m³ (AQI 500 ceiling at 2400 µg/m³).
 *    - Historical extreme: Severe industrial plume / volcanic ash scenarios.
 *    - 3000 µg/m³ (~1.15 ppm at 25°C 1 atm) provides safe headroom over the 2400 µg/m³ ceiling.
 * 
 * 5. CO (150 mg/m³):
 *    - CPCB Severe breakpoint: > 34 mg/m³ (AQI 500 ceiling at 50 mg/m³ = ~43.7 ppm).
 *    - Urban ambient CO levels rarely exceed 10-25 mg/m³; confined tunnel peaks reach 40-60 mg/m³.
 *    - 150 mg/m³ (~131 ppm) is 3x the CPCB AQI 500 limit and well below NIOSH IDLH (1200 ppm), rejecting sensor failure.
 * 
 * 6. O3 (1500 µg/m³):
 *    - CPCB Severe breakpoint: > 748 µg/m³ (AQI 500 ceiling at 1000 µg/m³ = ~0.51 ppm).
 *    - Photochemical smog peak in global mega-cities (e.g. Mexico City 1980s) peaked around 800-1000 µg/m³.
 *    - 1500 µg/m³ (~0.76 ppm) provides 1.5x buffer over maximum possible ambient tropospheric ozone.
 * 
 * 7. NH3 (3000 µg/m³):
 *    - CPCB Severe breakpoint: > 1800 µg/m³ (AQI 500 ceiling at 2400 µg/m³).
 *    - Landfill and intensive agricultural plume buffer up to 3000 µg/m³ (~4.3 ppm).
 * 
 * 8. Pb (50 µg/m³):
 *    - CPCB Severe breakpoint: > 3.5 µg/m³ (AQI 500 ceiling at 5.0 µg/m³).
 *    - Ambient urban lead concentrations are < 1.0 µg/m³; battery smelting industrial vicinities peak < 15-20 µg/m³.
 *    - 50 µg/m³ is 10x the CPCB AQI 500 ceiling.
 */
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

/**
 * Future clock drift tolerance: 5 minutes (300,000 ms) default, configurable.
 * 
 * SCIENTIFIC & TECHNICAL TELEMETRY BASIS (ENGINEERING POLICY):
 * In ambient air quality monitoring networks (CPCB CAAQMS, State PCBs, and OpenAQ telemetry streams):
 * 1. Station Data Acquisition Systems (DAS) and data loggers (e.g., Campbell Scientific, Envea, Teledyne)
 *    poll physical analyzers and log hourly averages.
 * 2. Edge loggers synchronize clocks periodically via cellular/broadband NTP daemons. Network jitter,
 *    temporary cellular lag, and uncompensated crystal oscillator drift can cause edge timestamps to lead
 *    or lag server ingestion clocks by seconds.
 * 3. This 5-minute window is an explicit BREATHEWISE ENGINEERING POLICY (not a statutory CPCB rule, as CPCB
 *    does not specify clock skew tolerances for public consumer APIs).
 * 4. Any observation timestamp exceeding this tolerance is rejected from official AQI calculations
 *    (preventing future-dated records from polluting rolling windows), while preserving the raw reading
 *    and rejection reason for transparent auditability.
 */
export const FUTURE_TOLERANCE_MS = (typeof process !== 'undefined' && process.env?.FUTURE_TIMESTAMP_TOLERANCE_MS)
  ? parseInt(process.env.FUTURE_TIMESTAMP_TOLERANCE_MS, 10)
  : 5 * 60 * 1000;

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
