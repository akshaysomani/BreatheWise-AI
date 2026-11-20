import prisma from '@/lib/db';
import { z } from 'zod';
import { createImpactLogSchema } from '@/lib/validations';

export type CreateImpactLogInput = z.infer<typeof createImpactLogSchema>;

export const impactRepository = {
  async getByUserId(userId: string, limit = 50) {
    return prisma.impactLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: Math.min(limit, 100),
    });
  },

  async create(userId: string, data: CreateImpactLogInput) {
    return prisma.impactLog.create({
      data: {
        userId,
        ...data,
      },
    });
  },

  async getAggregates(userId: string) {
    const logs = await prisma.impactLog.findMany({
      where: { userId },
      select: {
        co2AvoidedKg: true,
        pm25AvoidedGrams: true,
        distanceShiftedKm: true,
      },
    });

    const totalCO2 = logs.reduce((acc, l) => acc + l.co2AvoidedKg, 0);
    const totalPM25 = logs.reduce((acc, l) => acc + l.pm25AvoidedGrams, 0);
    const totalDistance = logs.reduce((acc, l) => acc + (l.distanceShiftedKm || 0), 0);

    return {
      totalCO2AvoidedKg: Math.round(totalCO2 * 100) / 100,
      totalPM25AvoidedGrams: Math.round(totalPM25 * 100) / 100,
      totalDistanceShiftedKm: Math.round(totalDistance * 100) / 100,
      totalLogsCount: logs.length,
    };
  },
};
