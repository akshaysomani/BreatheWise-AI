import { z } from 'zod';
import { sanitizedStringSchema } from './common.schema';

export const impactActionTypeEnum = z.enum([
  'COMMUTE_SHIFT',
  'HEPA_PURIFICATION',
  'VENTILATION_WINDOW',
  'COOKING_SWITCH',
  'ERRAND_CHAINING',
  'WASTE_DIVERSION',
  'ENERGY_SAVING',
  'GREEN_SPACE_IMPROVEMENT',
  'COMMUNITY_RECOMMENDATION',
] as const);

export const createImpactLogSchema = z
  .object({
    actionType: impactActionTypeEnum,
    title: sanitizedStringSchema(140),
    date: z.coerce.date().default(() => new Date()),
    co2AvoidedKg: z
      .number()
      .min(0, { message: 'co2AvoidedKg cannot be negative.' })
      .max(10000, { message: 'co2AvoidedKg exceeds realistic bounds.' })
      .refine((v) => Number.isFinite(v), { message: 'co2AvoidedKg must be finite.' }),
    pm25AvoidedGrams: z
      .number()
      .min(0, { message: 'pm25AvoidedGrams cannot be negative.' })
      .max(5000, { message: 'pm25AvoidedGrams exceeds realistic bounds.' })
      .refine((v) => Number.isFinite(v), { message: 'pm25AvoidedGrams must be finite.' }),
    distanceShiftedKm: z.number().min(0).max(1000).optional().nullable(),
    calculationFormula: sanitizedStringSchema(255),
    uncertaintyMargin: z
      .number()
      .min(0.01, { message: 'Uncertainty cannot be zero.' })
      .max(1.0, { message: 'Uncertainty cannot exceed 100%.' })
      .default(0.15),
  })
  .strict();

export const updateImpactLogSchema = z
  .object({
    title: sanitizedStringSchema(140).optional(),
    date: z.coerce.date().optional(),
    co2AvoidedKg: z.number().min(0).max(10000).optional(),
    pm25AvoidedGrams: z.number().min(0).max(5000).optional(),
    distanceShiftedKm: z.number().min(0).max(1000).optional().nullable(),
    calculationFormula: sanitizedStringSchema(255).optional(),
    uncertaintyMargin: z.number().min(0.01).max(1.0).optional(),
  })
  .strict();

export const impactQueryFilterSchema = z.object({
  category: impactActionTypeEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
  format: z.enum(['json', 'csv']).default('json'),
});

export const liveCalculateSchema = z.discriminatedUnion('domain', [
  z.object({
    domain: z.literal('TRANSPORT'),
    distanceKm: z.number().positive().max(1000),
    baselineMode: z.string(),
    optimizedMode: z.string(),
    customOccupancy: z.number().positive().max(80).optional(),
  }),
  z.object({
    domain: z.literal('WASTE'),
    wasteType: z.string(),
    quantityKg: z.number().positive().max(5000),
  }),
  z.object({
    domain: z.literal('ENERGY'),
    kwhSaved: z.number().positive().max(10000),
    gridRegion: z.string().optional(),
    actionType: z.string().optional(),
  }),
]);

export type CreateImpactLogInput = z.infer<typeof createImpactLogSchema>;
export type UpdateImpactLogInput = z.infer<typeof updateImpactLogSchema>;
export type ImpactQueryFilter = z.infer<typeof impactQueryFilterSchema>;
export type LiveCalculateInput = z.infer<typeof liveCalculateSchema>;
