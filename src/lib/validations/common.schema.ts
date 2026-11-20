import { z } from 'zod';

/**
 * Common Zod validation primitives for BreatheWise AI.
 * Enforces finite numbers, rejects NaN/Infinity, bounds coordinates, and prevents injection.
 */

export const uuidSchema = z
  .string()
  .uuid({ message: 'Must be a valid UUIDv4 string.' });

export const coordinateLatitudeSchema = z
  .number()
  .min(-90.0, { message: 'Latitude cannot be less than -90.0 degrees.' })
  .max(90.0, { message: 'Latitude cannot exceed 90.0 degrees.' })
  .refine((val) => Number.isFinite(val), { message: 'Latitude must be a finite number.' });

export const coordinateLongitudeSchema = z
  .number()
  .min(-180.0, { message: 'Longitude cannot be less than -180.0 degrees.' })
  .max(180.0, { message: 'Longitude cannot exceed 180.0 degrees.' })
  .refine((val) => Number.isFinite(val), { message: 'Longitude must be a finite number.' });

export const coordinatesQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).refine((v) => Number.isFinite(v)),
  lon: z.coerce.number().min(-180).max(180).refine((v) => Number.isFinite(v)),
  city: z.string().trim().max(100).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sanitizedStringSchema = (maxLength = 255) =>
  z
    .string()
    .trim()
    .min(1, { message: 'Field cannot be empty.' })
    .max(maxLength, { message: `Field cannot exceed ${maxLength} characters.` })
    .refine((val) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(val), {
      message: 'HTML/Script injection tags are strictly prohibited.',
    });
