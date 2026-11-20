import { z } from 'zod';
import { sanitizedStringSchema } from './common.schema';

export const impactActionTypeEnum = z.enum([
  'COMMUTE_SHIFT',
  'HEPA_PURIFICATION',
  'VENTILATION_WINDOW',
  'COOKING_SWITCH',
  'ERRAND_CHAINING',
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
