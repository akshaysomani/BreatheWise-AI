import prisma from '@/lib/db';
import { CreateCommunityReportInput } from '@/lib/validations/community.schema';

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
        status: true,
        createdAt: true,
      },
    });
  },

  async getFiltered(options: {
    fuzzedLatitude?: number;
    fuzzedLongitude?: number;
    reportType?: string;
    severity?: string;
    radiusKm?: number;
    limit?: number;
    offset?: number;
    status?: string;
  }) {
    const where: any = {
      status: options.status || 'ACTIVE',
    };

    if (options.reportType) {
      where.reportType = options.reportType;
    }

    if (options.severity) {
      where.severity = options.severity;
    }

    // Spatial filter: 1 degree ≈ 111 km. radiusKm / 111 gives degrees delta.
    if (options.fuzzedLatitude !== undefined && options.fuzzedLongitude !== undefined) {
      const radiusKm = options.radiusKm || 30;
      const degDelta = Math.max(0.05, Math.min(1.0, radiusKm / 111));
      where.fuzzedLatitude = {
        gte: options.fuzzedLatitude - degDelta,
        lte: options.fuzzedLatitude + degDelta,
      };
      where.fuzzedLongitude = {
        gte: options.fuzzedLongitude - degDelta,
        lte: options.fuzzedLongitude + degDelta,
      };
    }

    const limit = Math.min(options.limit || 30, 100);
    const offset = Math.max(options.offset || 0, 0);

    const [reports, totalCount] = await Promise.all([
      prisma.communityReport.findMany({
        where,
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
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.communityReport.count({ where }),
    ]);

    return { reports, totalCount };
  },

  async getNearby(fuzzedLatitude: number, fuzzedLongitude: number, limit = 20) {
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

  async getById(id: string) {
    return prisma.communityReport.findUnique({
      where: { id },
    });
  },

  async upvote(reportId: string, userId?: string) {
    if (userId) {
      return prisma.$transaction(async (tx) => {
        const report = await tx.communityReport.findUnique({
          where: { id: reportId },
          select: { id: true, status: true },
        });

        if (!report) {
          throw new Error('Report not found');
        }
        if (report.status !== 'ACTIVE') {
          throw new Error('Cannot upvote quarantined or non-active observation');
        }

        const existing = await tx.communityUpvote.findUnique({
          where: {
            reportId_userId: {
              reportId,
              userId,
            },
          },
        });

        if (existing) {
          const err: any = new Error('You have already upvoted this community observation.');
          err.code = 'ALREADY_UPVOTED';
          throw err;
        }

        await tx.communityUpvote.create({
          data: {
            reportId,
            userId,
          },
        });

        return tx.communityReport.update({
          where: { id: reportId },
          data: {
            upvotes: { increment: 1 },
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
            status: true,
            createdAt: true,
          },
        });
      });
    }

    return prisma.communityReport.update({
      where: { id: reportId },
      data: {
        upvotes: { increment: 1 },
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
        status: true,
        createdAt: true,
      },
    });
  },

  async flag(reportId: string, _reason: string, _details?: string) {
    return prisma.communityReport.update({
      where: { id: reportId },
      data: {
        status: 'FLAGGED',
      },
      select: {
        id: true,
        status: true,
      },
    });
  },

  async delete(reportId: string, userId: string) {
    const existing = await prisma.communityReport.findFirst({
      where: { id: reportId, userId },
    });
    if (!existing) return false;

    await prisma.communityReport.delete({
      where: { id: reportId },
    });
    return true;
  },
};
