import { z } from 'zod';
import { sanitizedStringSchema } from './common.schema';
import { recommendationCategoryEnum } from './recommendation.schema';

// ---------------------------------------------------------------------------
// 1. Chat Message Input Schema
// ---------------------------------------------------------------------------

export const chatMessageInputSchema = z
  .object({
    message: sanitizedStringSchema(2000),
    conversationId: z.string().uuid().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .strict();

export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>;

// ---------------------------------------------------------------------------
// 2. Daily Routine Generation Input Schema
// ---------------------------------------------------------------------------

export const routineGenerateInputSchema = z
  .object({
    schedulePreferences: sanitizedStringSchema(500).optional(),
    outdoorActivities: sanitizedStringSchema(500).optional(),
    commuteMode: sanitizedStringSchema(100).optional(),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  })
  .strict();

export type RoutineGenerateInput = z.infer<typeof routineGenerateInputSchema>;

// ---------------------------------------------------------------------------
// 3. Indoor Advice Input Schema
// ---------------------------------------------------------------------------

export const roomTypeEnum = z.enum([
  'BEDROOM',
  'LIVING_ROOM',
  'KITCHEN',
  'HOME_OFFICE',
  'CHILD_ROOM',
  'STUDY',
]);

export const cookingSourceEnum = z.enum([
  'LPG_GAS',
  'ELECTRIC_INDUCTION',
  'BIOMASS',
  'ELECTRIC_COIL',
  'KEROSENE',
  'OTHER',
]);

export const indoorAdviceInputSchema = z
  .object({
    roomType: roomTypeEnum,
    roomSizeSqFt: z.number().min(20).max(5000).default(200),
    ceilingHeightFt: z.number().min(7).max(18).default(9),
    occupancy: z.number().min(1).max(20).default(2),
    hasPurifier: z.boolean().default(false),
    purifierCADR: z.number().min(0).max(2000).optional().nullable(),
    filterType: z.enum(['TRUE_HEPA_H13', 'HEPA_TYPE', 'IONIZER', 'CARBON_ONLY', 'UNKNOWN']).default('TRUE_HEPA_H13'),
    ventilationHabits: sanitizedStringSchema(300).optional(),
    cookingSource: cookingSourceEnum.default('LPG_GAS'),
    hasSmoker: z.boolean().default(false),
    hasIncenseBurning: z.boolean().default(false),
  })
  .strict();

export type IndoorAdviceInput = z.infer<typeof indoorAdviceInputSchema>;

// ---------------------------------------------------------------------------
// 4. Recommendation Feedback Input Schema
// ---------------------------------------------------------------------------

export const recommendationFeedbackInputSchema = z
  .object({
    recommendationId: z.string().uuid().optional().nullable(),
    isHelpful: z.boolean(),
    feedbackReason: sanitizedStringSchema(500).optional().nullable(),
  })
  .strict();

export type RecommendationFeedbackInput = z.infer<typeof recommendationFeedbackInputSchema>;

// ---------------------------------------------------------------------------
// 5. 6-Field Explainability Contract Schema (Structured AI Output)
// ---------------------------------------------------------------------------

export const evidenceStrengthEnum = z.enum([
  'MEASURED_OBSERVATION',
  'ESTIMATED_MODEL',
  'PRECAUTIONARY_GUIDELINE',
]);

export const timeOfDayEnum = z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'ALL_DAY']);
export const priorityEnum = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const structuredRecommendationSchema = z
  .object({
    // Standard 6-field explainability contract
    action: sanitizedStringSchema(300),
    reason: sanitizedStringSchema(2000),
    expectedBenefit: sanitizedStringSchema(1000),
    measurableImpact: z.string().trim().max(500).optional().nullable(),
    assumptions: sanitizedStringSchema(1000),
    uncertainty: sanitizedStringSchema(1000),

    // Metadata
    category: recommendationCategoryEnum,
    priority: priorityEnum.default('MEDIUM'),
    timeOfDay: timeOfDayEnum.default('ALL_DAY'),
    implementationSteps: z
      .array(sanitizedStringSchema(300))
      .min(1, 'At least one practical implementation step is required')
      .max(6),
    disclaimer: sanitizedStringSchema(500),
    evidenceStrength: evidenceStrengthEnum.default('PRECAUTIONARY_GUIDELINE'),
    provenance: z.string().default('AI_GENERATED'),
  })
  .strict();

export type StructuredRecommendation = z.infer<typeof structuredRecommendationSchema>;

// ---------------------------------------------------------------------------
// 6. Assistant Chat Structured Response Schema
// ---------------------------------------------------------------------------

export const assistantChatResponseSchema = z
  .object({
    reply: sanitizedStringSchema(5000),
    recommendations: z.array(structuredRecommendationSchema).max(4).default([]),
    contextSummary: z.object({
      aqiStatus: z.string(),
      aqiValue: z.number().nullable(),
      aqiCategory: z.string(),
      dominantPollutant: z.string().nullable(),
      provenance: z.string(),
      isLive: z.boolean(),
      observationTimeUtc: z.string().nullable(),
      coarseLocation: z.string().nullable(),
      vulnerabilityTier: z.string().nullable(),
    }),
    evidenceCitations: z.array(z.string().max(300)).max(6).default([]),
    disclaimer: z.string().default(
      'BreatheWise AI recommendations are environmental and exposure-reduction guidance, not clinical medical advice. Consult healthcare providers for individual diagnosis or treatment.'
    ),
  })
  .strict();

export type AssistantChatResponse = z.infer<typeof assistantChatResponseSchema>;
