import { z } from 'zod';
import {
  coordinateLatitudeSchema,
  coordinateLongitudeSchema,
  sanitizedStringSchema,
} from './common.schema';

export const communityReportTypeEnum = z.enum([
  'VISIBLE_SMOG',
  'ACRID_ODOR',
  'OPEN_BURNING',
  'DUST_CONSTRUCTION',
  'INDUSTRIAL_PLUME',
]);

export const communityReportSeverityEnum = z.enum(['MILD', 'MODERATE', 'SEVERE']);

export const createCommunityReportSchema = z
  .object({
    reportType: communityReportTypeEnum,
    severity: communityReportSeverityEnum,
    description: sanitizedStringSchema(1000),
    latitude: coordinateLatitudeSchema,
    longitude: coordinateLongitudeSchema,
    neighborhood: sanitizedStringSchema(100),
  })
  .strict();
