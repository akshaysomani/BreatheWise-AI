import prisma from '@/lib/db';
import { z } from 'zod';
import { explainableRecommendationSchema } from '@/lib/validations';

export type RecommendationRecordInput = z.infer<typeof explainableRecommendationSchema>;

export const recommendationRepository = {
  async save(userId: string | null, data: RecommendationRecordInput) {
    return prisma.recommendationRecord.create({
      data: {
        userId,
        category: data.category,
        recommendedAction: data.recommendedAction,
        scientificReason: data.scientificReason,
        expectedBenefit: data.expectedBenefit,
        quantifiedImpact: data.quantifiedImpact,
        assumptionsAndUncertainty: data.assumptionsAndUncertainty,
        implementationSteps: JSON.stringify(data.implementationSteps),
        disclaimer: data.disclaimer,
      },
    });
  },

  async getByUser(userId: string, category?: string, limit = 20) {
    return prisma.recommendationRecord.findMany({
      where: {
        userId,
        ...(category && { category }),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    });
  },
};
