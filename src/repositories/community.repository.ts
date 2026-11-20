import prisma from '@/lib/db';
import { z } from 'zod';
import { createCommunityReportSchema } from '@/lib/validations';

export type CreateCommunityReportInput = z.infer<typeof createCommunityReportSchema>;

export const communityRepository = {
  async create(userId: string, data: CreateCommunityReportInput & { fuzzedLatitude: number; fuzzedLongitude: number }) {
    return prisma.communityReport.create({
      data: {
        userId,
        reportType: data.reportType,
        severity: data.severity,
        description: data.description,
        fuzzedLatitude: data.fuzzedLatitude,
        fuzzedLongitude: data.fuzzedLongitude,
        neighborhood: data.neighborhood,
        isOfficialData: false, // Architectural invariant: NEVER true
        status: 'ACTIVE',
      },
    });
  },

  async getNearby(fuzzedLatitude: number, fuzzedLongitude: number, limit = 20) {
    // Search within ~0.25 degrees (~27 km) of fuzzed centroid
    return prisma.communityReport.findMany({
      where: {
        fuzzedLatitude: { gte: fuzzedLatitude - 0.25, lte: fuzzedLatitude + 0.25 },
        fuzzedLongitude: { gte: fuzzedLongitude - 0.25, lte: fuzzedLongitude + 0.25 },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        reportType: true,
        severity: true,
        description: true,
        fuzzedLatitude: true,
        fuzzedLongitude: true,
        neighborhood: true,
        isOfficialData: true,
        upvotes: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 50),
    });
  },

  async upvote(reportId: string) {
    return prisma.communityReport.update({
      where: { id: reportId },
      data: {
        upvotes: { increment: 1 },
      },
    });
  },
};
