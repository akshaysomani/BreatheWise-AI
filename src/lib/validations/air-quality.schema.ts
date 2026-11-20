import { z } from 'zod';
import {
  coordinateLatitudeSchema,
  coordinateLongitudeSchema,
  sanitizedStringSchema,
} from './common.schema';

export const aqiCategoryEnum = z.enum([
  // CPCB Categories (India NAQI)
  'GOOD',
  'SATISFACTORY',
  'MODERATELY_POLLUTED',
  'POOR',
  'VERY_POOR',
  'SEVERE',
  'INSUFFICIENT_DATA',
  // Backward compatibility EPA categories
  'MODERATE',
  'UNHEALTHY_SENSITIVE',
  'UNHEALTHY',
  'VERY_UNHEALTHY',
  'HAZARDOUS',
]);

export const sourceProviderEnum = z.enum([
  'OPENAQ',
  'OPEN_METEO',
  'CPCB',
  'CPCB_CAAQMS',
  'DATA_GOV_IN',
]);

export const provenanceTypeEnum = z.enum([
  'VERIFIED_EXTERNAL_OBSERVATION',
  'HISTORICAL_IMPORTED',
  'DEVELOPMENT_SEED',
  'SYNTHETIC_FIXTURE',
  'UNKNOWN_PROVENANCE',
]);

export const aqiSnapshotSchema = z.object({
  latitude: coordinateLatitudeSchema,
  longitude: coordinateLongitudeSchema,
  stationId: z.string().trim().max(100).optional().nullable(),
  stationName: sanitizedStringSchema(150).optional().nullable(),
  sourceProvider: z.string().max(50),
  aqiValue: z
    .number()
    .int()
    .min(0, { message: 'AQI value cannot be negative.' })
    .max(1000, { message: 'AQI value cannot exceed 1000.' })
    .nullable(),
  aqiCategory: aqiCategoryEnum,
  dominantPollutant: z.string().nullable().optional(),
  pm25: z.number().min(0).max(2000).nullable().optional(),
  pm10: z.number().min(0).max(3000).nullable().optional(),
  no2: z.number().min(0).max(1000).nullable().optional(),
  o3: z.number().min(0).max(1000).nullable().optional(),
  so2: z.number().min(0).max(3000).nullable().optional(),
  co: z.number().min(0).max(200).nullable().optional(), // in mg/m³
  nh3: z.number().min(0).max(3000).nullable().optional(),
  pb: z.number().min(0).max(50).nullable().optional(),
  distanceKm: z.number().min(0).max(500).nullable().optional(),
  rawBreakdownJson: z.string().nullable().optional(),
  measurementTimestamp: z.date(),
  isStale: z.boolean().optional().default(false),
  provenanceType: provenanceTypeEnum.optional().default('UNKNOWN_PROVENANCE'),
  averagingPeriod: z.enum(['1_HOUR', '8_HOUR', '24_HOUR']).optional().default('1_HOUR'),
  completenessHours: z.number().min(0).max(24).optional().default(1.0),
});
