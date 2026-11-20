import { airQualityRepository, AqiSnapshotInput } from '@/repositories/air-quality.repository';

/**
 * US EPA Revised (February 2024) PM2.5 Air Quality Index (AQI) Breakpoints
 * 
 * SCIENTIFIC STANDARDS AUDIT (M2.1):
 * - REVISED STANDARD: In Feb 2024, the US EPA finalized revisions to the National Ambient Air Quality
 *   Standards (NAAQS) for PM2.5, revising the annual standard from 12.0 to 9.0 µg/m³ and updating AQI breakpoints:
 *   - Good (0–50): 0.0 to 9.0 µg/m³
 *   - Moderate (51–100): 9.1 to 35.4 µg/m³
 *   - Unhealthy for Sensitive Groups (101–150): 35.5 to 55.4 µg/m³
 *   - Unhealthy (151–200): 55.5 to 125.4 µg/m³ (formerly 150.4)
 *   - Very Unhealthy (201–300): 125.5 to 225.4 µg/m³ (formerly 250.4)
 *   - Hazardous (301–500): 225.5 to 325.4 µg/m³ (and extended up to 500.4)
 * - TRUNCATION REQUIREMENT: Per EPA 40 CFR Part 58 Appendix G, concentrations must be truncated
 *   to 0.1 µg/m³ (1 decimal place) before applying the linear interpolation formula.
 * - AVERAGING PERIOD NOTICE: Regulatory AQI requires a 24-hour rolling average or EPA NowCast algorithm.
 *   Instantaneous or 1-hour snapshots serve as an acute real-time proxy with higher temporal variance.
 */
const PM25_BREAKPOINTS = [
  { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50, category: 'GOOD' },
  { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100, category: 'MODERATE' },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150, category: 'UNHEALTHY_SENSITIVE' },
  { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200, category: 'UNHEALTHY' },
  { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300, category: 'VERY_UNHEALTHY' },
  { cLow: 225.5, cHigh: 325.4, iLow: 301, iHigh: 400, category: 'HAZARDOUS' },
  { cLow: 325.5, cHigh: 500.4, iLow: 401, iHigh: 500, category: 'HAZARDOUS' },
];

export const airQualityService = {
  calculateAqiFromPm25(pm25: number): { aqi: number; category: string } {
    if (pm25 < 0) return { aqi: 0, category: 'GOOD' };

    // Strict EPA concentration truncation to 0.1 µg/m³
    const truncatedPm25 = Math.floor(pm25 * 10) / 10;

    for (const bp of PM25_BREAKPOINTS) {
      if (truncatedPm25 >= bp.cLow && truncatedPm25 <= bp.cHigh) {
        const aqi = Math.round(
          ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (truncatedPm25 - bp.cLow) + bp.iLow
        );
        return { aqi, category: bp.category };
      }
    }

    // Extended severe range (>500.4 µg/m³)
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
