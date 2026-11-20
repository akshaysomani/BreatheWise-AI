import { z } from 'zod';
import {
  coordinateLatitudeSchema,
  coordinateLongitudeSchema,
  sanitizedStringSchema,
} from './common.schema';

export const aqiCategoryEnum = z.enum([
  'GOOD',
  'MODERATE',
  'UNHEALTHY_SENSITIVE',
  'UNHEALTHY',
  'VERY_UNHEALTHY',
  'HAZARDOUS',
]);

export const sourceProviderEnum = z.enum(['OPENAQ', 'OPEN_METEO', 'CPCB']);

export const aqiSnapshotSchema = z.object({
  latitude: coordinateLatitudeSchema,
  longitude: coordinateLongitudeSchema,
  stationId: z.string().trim().max(100).optional().nullable(),
  stationName: sanitizedStringSchema(150).optional().nullable(),
  sourceProvider: sourceProviderEnum,
  aqiValue: z
    .number()
    .int()
    .min(0, { message: 'AQI value cannot be negative.' })
    .max(1000, { message: 'AQI value cannot exceed 1000.' }),
  aqiCategory: aqiCategoryEnum,
  dominantPollutant: z.enum(['PM2.5', 'PM10', 'NO2', 'O3', 'SO2', 'CO']),
  pm25: z.number().min(0).max(2000).nullable().optional(),
  pm10: z.number().min(0).max(3000).nullable().optional(),
  no2: z.number().min(0).max(1000).nullable().optional(),
  o3: z.number().min(0).max(1000).nullable().optional(),
  measurementTimestamp: z.coerce.date(),
  isStale: z.boolean().default(false),
});
