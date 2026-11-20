import { airQualityRepository, AqiSnapshotInput } from '@/repositories/air-quality.repository';

// EPA Piecewise linear breakpoints for PM2.5 (µg/m³ to AQI)
const PM25_BREAKPOINTS = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50, category: 'GOOD' },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100, category: 'MODERATE' },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150, category: 'UNHEALTHY_SENSITIVE' },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200, category: 'UNHEALTHY' },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300, category: 'VERY_UNHEALTHY' },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500, category: 'HAZARDOUS' },
];

export const airQualityService = {
  calculateAqiFromPm25(pm25: number): { aqi: number; category: string } {
    if (pm25 < 0) return { aqi: 0, category: 'GOOD' };

    for (const bp of PM25_BREAKPOINTS) {
      if (pm25 >= bp.cLow && pm25 <= bp.cHigh) {
        const aqi = Math.round(
          ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow
        );
        return { aqi, category: bp.category };
      }
    }

    // Extended severe range (>500 µg/m³)
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
