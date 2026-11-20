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
  'WASTE_DUMPING',
  'GREEN_SPACE_IMPROVEMENT',
  'GENERAL_OBSERVATION',
  'COMMUNITY_RECOMMENDATION',
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

export const flagCommunityReportSchema = z
  .object({
    reason: z.enum([
      'SPAM_OR_ADVERTISING',
      'INCORRECT_LOCATION',
      'OFFENSIVE_LANGUAGE',
      'MISLEADING_OFFICIAL_CLAIM',
      'OTHER',
    ]),
    details: sanitizedStringSchema(500).optional(),
  })
  .strict();

export const communityQueryFilterSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional().default(28.61),
  lon: z.coerce.number().min(-180).max(180).optional().default(77.20),
  reportType: communityReportTypeEnum.optional(),
  severity: communityReportSeverityEnum.optional(),
  radiusKm: z.coerce.number().min(1).max(100).default(25),
  limit: z.coerce.number().min(1).max(100).default(30),
  offset: z.coerce.number().min(0).default(0),
});

export type CreateCommunityReportInput = z.infer<typeof createCommunityReportSchema>;
export type FlagCommunityReportInput = z.infer<typeof flagCommunityReportSchema>;
export type CommunityQueryFilter = z.infer<typeof communityQueryFilterSchema>;
