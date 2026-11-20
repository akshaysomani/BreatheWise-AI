import { z } from 'zod';
import {
  coordinateLatitudeSchema,
  coordinateLongitudeSchema,
  sanitizedStringSchema,
} from './common.schema';

export const ageGroupEnum = z.enum(['INFANT', 'CHILD', 'ADULT', 'SENIOR'] as const);

export const homeTypeEnum = z.enum(['APARTMENT', 'STANDALONE_HOUSE', 'MULTI_STORY'] as const);

export const windowSealingEnum = z.enum(['POOR', 'MODERATE', 'TIGHT'] as const);

export const cookingFuelEnum = z.enum(['LPG_GAS', 'ELECTRIC_INDUCTION', 'BIOMASS'] as const);

export const householdMemberSchema = z.object({
  nameOrAlias: sanitizedStringSchema(100),
  ageGroup: ageGroupEnum,
  hasAsthma: z.boolean().default(false),
  hasHeartCondition: z.boolean().default(false),
  isPregnant: z.boolean().default(false),
  outdoorHoursPerDay: z.number().min(0).max(24).default(1.0),
});

export const createHouseholdProfileSchema = z
  .object({
    city: sanitizedStringSchema(100),
    neighborhood: sanitizedStringSchema(150).optional(),
    latitude: coordinateLatitudeSchema,
    longitude: coordinateLongitudeSchema,
    homeType: homeTypeEnum.default('APARTMENT'),
    floorAreaSqFt: z
      .number()
      .min(50, { message: 'Floor area must be at least 50 sq ft.' })
      .max(50000, { message: 'Floor area cannot exceed 50,000 sq ft.' })
      .refine((v) => Number.isFinite(v), { message: 'Floor area must be a finite number.' }),
    ceilingHeightFt: z
      .number()
      .min(6.0, { message: 'Ceiling height must be at least 6 ft.' })
      .max(30.0, { message: 'Ceiling height cannot exceed 30 ft.' })
      .default(9.0),
    hasHEPAFilter: z.boolean().default(false),
    hepaCADR: z.number().min(0).max(2000).nullable().optional(),
    windowSealing: windowSealingEnum.default('MODERATE'),
    primaryCookingFuel: cookingFuelEnum.default('LPG_GAS'),
    members: z.array(householdMemberSchema).max(20).optional().default([]),
  })
  .strict();

export const updateHouseholdProfileSchema = createHouseholdProfileSchema.partial();
