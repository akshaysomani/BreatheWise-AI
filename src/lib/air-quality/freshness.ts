/**
 * BreatheWise AI — Atmospheric Telemetry Freshness & Timezone Engine
 * Module M4.1: Four-Timestamp Architecture & Indian Standard Time (IST) Formatting
 */

import { FreshnessState, TelemetryTimestamps } from './types';

export interface FreshnessEvaluation {
  state: FreshnessState;
  ageMinutes: number;
  isStale: boolean;
  measurementTimestampUtc: string;
  measurementLocalTime: string;
}

/**
 * Evaluates telemetry freshness against strict operational thresholds:
 * - CURRENT: < 2 hours old (< 120 min)
 * - AGING: 2 to 4 hours old (120 to 240 min)
 * - STALE: 4 to 24 hours old (240 to 1440 min)
 * - MISSING: > 24 hours old or invalid
 */
export function evaluateFreshness(measurementDate: Date | string | null | undefined): FreshnessEvaluation {
  if (!measurementDate) {
    return {
      state: 'MISSING',
      ageMinutes: Infinity,
      isStale: true,
      measurementTimestampUtc: '',
      measurementLocalTime: 'No timestamp reported',
    };
  }

  const d = new Date(measurementDate);
  const timeMs = d.getTime();

  if (isNaN(timeMs)) {
    return {
      state: 'INVALID',
      ageMinutes: Infinity,
      isStale: true,
      measurementTimestampUtc: '',
      measurementLocalTime: 'Invalid timestamp',
    };
  }

  const nowMs = Date.now();
  const ageMs = Math.max(0, nowMs - timeMs);
  const ageMinutes = Math.round(ageMs / (60 * 1000));

  let state: FreshnessState = 'CURRENT';
  if (ageMinutes < 120) {
    state = 'CURRENT';
  } else if (ageMinutes < 240) {
    state = 'AGING';
  } else if (ageMinutes < 1440) {
    state = 'STALE';
  } else {
    state = 'MISSING';
  }

  const isStale = ageMinutes >= 240; // Stale if older than 4 hours

  const measurementTimestampUtc = d.toISOString();
  const measurementLocalTime = formatToIndianStandardTime(d);

  return {
    state,
    ageMinutes,
    isStale,
    measurementTimestampUtc,
    measurementLocalTime,
  };
}

/**
 * Builds the complete 4-timestamp telemetry model preserving exact provenance:
 * 1. Observation Time: When the physical sensor took the measurement
 * 2. Ingestion Time: When BreatheWise ingested it from the upstream provider
 * 3. Retrieval Time: When the client requested this telemetry
 * 4. Cache Time: When the local database snapshot was written/updated
 */
export function buildTelemetryTimestamps(
  observationDate: Date | string,
  ingestionDate?: Date | string,
  cacheDate?: Date | string
): TelemetryTimestamps {
  const obs = typeof observationDate === 'string' ? new Date(observationDate) : observationDate;
  const ing = ingestionDate ? (typeof ingestionDate === 'string' ? new Date(ingestionDate) : ingestionDate) : new Date();
  const now = new Date();
  const cache = cacheDate ? (typeof cacheDate === 'string' ? new Date(cacheDate) : cacheDate) : undefined;

  return {
    observationTimeUtc: isNaN(obs.getTime()) ? now.toISOString() : obs.toISOString(),
    ingestionTimeUtc: isNaN(ing.getTime()) ? now.toISOString() : ing.toISOString(),
    retrievalTimeUtc: now.toISOString(),
    cacheTimeUtc: cache && !isNaN(cache.getTime()) ? cache.toISOString() : undefined,
    observationLocalTime: formatToIndianStandardTime(obs),
    retrievalLocalTime: formatToIndianStandardTime(now),
  };
}

/**
 * Formats a UTC timestamp into human-readable Indian Standard Time (IST / UTC+05:30)
 * Example: "20 Nov 2026, 05:45 PM IST"
 */
export function formatToIndianStandardTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid date';

  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return `${formatted.replace(/\s?am/i, ' AM').replace(/\s?pm/i, ' PM').trim()} IST`;
}
