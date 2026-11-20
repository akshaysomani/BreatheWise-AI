import prisma from '@/lib/db';
import { z } from 'zod';
import { aqiSnapshotSchema } from '@/lib/validations';

export type AqiSnapshotInput = z.infer<typeof aqiSnapshotSchema>;

export const airQualityRepository = {
  async saveSnapshot(data: AqiSnapshotInput) {
    return prisma.airQualitySnapshot.create({
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        stationId: data.stationId,
        stationName: data.stationName,
        sourceProvider: data.sourceProvider,
        aqiValue: data.aqiValue ?? 0,
        aqiCategory: data.aqiCategory,
        dominantPollutant: data.dominantPollutant ?? 'PM2.5',
        pm25: data.pm25,
        pm10: data.pm10,
        no2: data.no2,
        o3: data.o3,
        so2: data.so2,
        co: data.co,
        nh3: data.nh3,
        pb: data.pb,
        distanceKm: data.distanceKm,
        rawBreakdownJson: data.rawBreakdownJson,
        measurementTimestamp: data.measurementTimestamp,
        isStale: data.isStale,
      },
    });
  },

  async getLatestByLocation(latitude: number, longitude: number, maxAgeMinutes = 180) {
    // Check for snapshots in the nearby vicinity (~0.05 degrees ~ 5.5 km)
    const minLat = latitude - 0.05;
    const maxLat = latitude + 0.05;
    const minLon = longitude - 0.05;
    const maxLon = longitude + 0.05;

    const threshold = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    return prisma.airQualitySnapshot.findFirst({
      where: {
        latitude: { gte: minLat, lte: maxLat },
        longitude: { gte: minLon, lte: maxLon },
        measurementTimestamp: { gte: threshold },
      },
      orderBy: {
        measurementTimestamp: 'desc',
      },
    });
  },

  async getRecentHistory(latitude: number, longitude: number, limit = 24) {
    return prisma.airQualitySnapshot.findMany({
      where: {
        latitude: { gte: latitude - 0.35, lte: latitude + 0.35 },
        longitude: { gte: longitude - 0.35, lte: longitude + 0.35 },
      },
      orderBy: {
        measurementTimestamp: 'desc',
      },
      take: Math.min(limit, 72),
    });
  },
};
