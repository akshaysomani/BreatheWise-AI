import { z } from 'zod';
import { sanitizedStringSchema } from './common.schema';

export const transitModeEnum = z.enum([
  'SOLO_CAR',
  'DIESEL_CAR',
  'MOTORCYCLE',
  'BUS',
  'METRO',
  'BICYCLE',
  'WALK',
  'CARPOOL',
] as const);

export const createRoutineSchema = z
  .object({
    title: sanitizedStringSchema(120),
    origin: sanitizedStringSchema(150),
    destination: sanitizedStringSchema(150),
    distanceKm: z
      .number()
      .min(0.1, { message: 'Distance must be at least 0.1 km.' })
      .max(500, { message: 'Distance cannot exceed 500 km.' })
      .refine((v) => Number.isFinite(v), { message: 'Distance must be finite.' }),
    departureTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Departure time must be in HH:mm 24-hour format.' }),
    returnTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Return time must be in HH:mm 24-hour format.' })
      .optional()
      .nullable(),
    baselineMode: transitModeEnum,
    optimizedMode: transitModeEnum.optional().nullable(),
    estimatedDoseReduction: z.number().min(0).max(100).optional().nullable(),
    estimatedCO2SavingsKg: z.number().min(0).max(500).optional().nullable(),
  })
  .strict();

export const updateRoutineSchema = createRoutineSchema.partial();
