import prisma from '@/lib/db';
import { CreateImpactLogInput, UpdateImpactLogInput, ImpactQueryFilter } from '@/lib/validations/impact.schema';

export const impactRepository = {
  async getByUserId(userId: string, limit = 50) {
    return prisma.impactLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: Math.min(limit, 100),
    });
  },

  async getFiltered(userId: string, options: Partial<ImpactQueryFilter> = {}) {
    const where: any = { userId };

    if (options.category) {
      where.actionType = options.category;
    }

    if (options.startDate || options.endDate) {
      where.date = {};
      if (options.startDate) {
        where.date.gte = options.startDate;
      }
      if (options.endDate) {
        where.date.lte = options.endDate;
      }
    }

    const limit = Math.min(options.limit || 50, 200);
    const offset = Math.max(options.offset || 0, 0);

    const [logs, totalCount] = await Promise.all([
      prisma.impactLog.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.impactLog.count({ where }),
    ]);

    return { logs, totalCount };
  },

  async getById(id: string, userId: string) {
    return prisma.impactLog.findFirst({
      where: { id, userId },
    });
  },

  async create(userId: string, data: CreateImpactLogInput) {
    return prisma.impactLog.create({
      data: {
        userId,
        actionType: data.actionType,
        title: data.title,
        date: data.date,
        co2AvoidedKg: data.co2AvoidedKg,
        pm25AvoidedGrams: data.pm25AvoidedGrams,
        distanceShiftedKm: data.distanceShiftedKm ?? null,
        calculationFormula: data.calculationFormula,
        uncertaintyMargin: data.uncertaintyMargin ?? 0.15,
      },
    });
  },

  async update(id: string, userId: string, data: UpdateImpactLogInput) {
    // Verify ownership first
    const existing = await prisma.impactLog.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return null;
    }

    return prisma.impactLog.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.date !== undefined && { date: data.date }),
        ...(data.co2AvoidedKg !== undefined && { co2AvoidedKg: data.co2AvoidedKg }),
        ...(data.pm25AvoidedGrams !== undefined && { pm25AvoidedGrams: data.pm25AvoidedGrams }),
        ...(data.distanceShiftedKm !== undefined && { distanceShiftedKm: data.distanceShiftedKm }),
        ...(data.calculationFormula !== undefined && { calculationFormula: data.calculationFormula }),
        ...(data.uncertaintyMargin !== undefined && { uncertaintyMargin: data.uncertaintyMargin }),
      },
    });
  },

  async delete(id: string, userId: string) {
    const existing = await prisma.impactLog.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return false;
    }

    await prisma.impactLog.delete({
      where: { id },
    });
    return true;
  },

  async getAggregates(userId: string) {
    const logs = await prisma.impactLog.findMany({
      where: { userId },
      select: {
        actionType: true,
        co2AvoidedKg: true,
        pm25AvoidedGrams: true,
        distanceShiftedKm: true,
      },
    });

    const totalCO2 = logs.reduce((acc, l) => acc + l.co2AvoidedKg, 0);
    const totalPM25 = logs.reduce((acc, l) => acc + l.pm25AvoidedGrams, 0);
    const totalDistance = logs.reduce((acc, l) => acc + (l.distanceShiftedKm || 0), 0);

    // Compute category breakdown
    const categoryBreakdown: Record<string, { count: number; co2Kg: number; pm25Grams: number }> = {};
    for (const log of logs) {
      if (!categoryBreakdown[log.actionType]) {
        categoryBreakdown[log.actionType] = { count: 0, co2Kg: 0, pm25Grams: 0 };
      }
      categoryBreakdown[log.actionType].count += 1;
      categoryBreakdown[log.actionType].co2Kg += log.co2AvoidedKg;
      categoryBreakdown[log.actionType].pm25Grams += log.pm25AvoidedGrams;
    }

    // Round breakdown values
    for (const cat of Object.keys(categoryBreakdown)) {
      categoryBreakdown[cat].co2Kg = Math.round(categoryBreakdown[cat].co2Kg * 100) / 100;
      categoryBreakdown[cat].pm25Grams = Math.round(categoryBreakdown[cat].pm25Grams * 100) / 100;
    }

    return {
      totalCO2AvoidedKg: Math.round(totalCO2 * 100) / 100,
      totalPM25AvoidedGrams: Math.round(totalPM25 * 100) / 100,
      totalDistanceShiftedKm: Math.round(totalDistance * 100) / 100,
      totalLogsCount: logs.length,
      categoryBreakdown,
    };
  },
};
