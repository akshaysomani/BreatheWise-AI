import { z } from 'zod';
import { sanitizedStringSchema } from './common.schema';

export const recommendationCategoryEnum = z.enum([
  'DAILY_ROUTINE',
  'INDOOR_PURIFICATION',
  'COMMUTE_PLAN',
  'SUSTAINABLE_ALTERNATIVE',
]);

export const explainableRecommendationSchema = z
  .object({
    category: recommendationCategoryEnum,
    recommendedAction: sanitizedStringSchema(255),
    scientificReason: sanitizedStringSchema(2000),
    expectedBenefit: sanitizedStringSchema(1000),
    quantifiedImpact: z.string().trim().max(500).optional().nullable(),
    assumptionsAndUncertainty: sanitizedStringSchema(1000),
    implementationSteps: z
      .array(sanitizedStringSchema(300))
      .min(1, { message: 'At least one implementation step is required.' })
      .max(10),
    disclaimer: sanitizedStringSchema(500),
  })
  .strict();
