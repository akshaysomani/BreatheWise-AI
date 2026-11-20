import { describe, it, expect } from 'vitest';
import {
  coordinateLatitudeSchema,
  coordinateLongitudeSchema,
  coordinatesQuerySchema,
  createHouseholdProfileSchema,
  createImpactLogSchema,
  createCommunityReportSchema,
  createRoutineSchema,
  explainableRecommendationSchema,
  sanitizedStringSchema,
} from '@/lib/validations';

describe('Data Validation Schemas (M2 Phase 4)', () => {
  describe('Coordinate Validation', () => {
    it('accepts valid latitude and longitude coordinates', () => {
      expect(coordinateLatitudeSchema.parse(28.6139)).toBe(28.6139);
      expect(coordinateLongitudeSchema.parse(77.209)).toBe(77.209);
      expect(coordinateLatitudeSchema.parse(-90.0)).toBe(-90.0);
      expect(coordinateLongitudeSchema.parse(180.0)).toBe(180.0);
    });

    it('rejects out-of-bounds, NaN, and Infinity coordinates', () => {
      expect(() => coordinateLatitudeSchema.parse(90.1)).toThrow();
      expect(() => coordinateLatitudeSchema.parse(-91.0)).toThrow();
      expect(() => coordinateLongitudeSchema.parse(180.5)).toThrow();
      expect(() => coordinateLongitudeSchema.parse(-181.0)).toThrow();
      expect(() => coordinateLatitudeSchema.parse(NaN)).toThrow();
      expect(() => coordinateLatitudeSchema.parse(Infinity)).toThrow();
      expect(() => coordinateLatitudeSchema.parse('invalid' as any)).toThrow();
    });

    it('validates coordinates query parameters', () => {
      const valid = coordinatesQuerySchema.parse({ lat: '28.61', lon: '77.20', city: 'Delhi' });
      expect(valid.lat).toBe(28.61);
      expect(valid.lon).toBe(77.2);
      expect(valid.city).toBe('Delhi');

      expect(() => coordinatesQuerySchema.parse({ lat: '120.0', lon: '0' })).toThrow();
    });
  });

  describe('Sanitized String & XSS Protection', () => {
    it('rejects raw HTML script tags in input strings', () => {
      const schema = sanitizedStringSchema(100);
      expect(() => schema.parse('<script>alert("xss")</script>')).toThrow(/injection/i);
      expect(schema.parse('Clean household address, Flat 402')).toBe('Clean household address, Flat 402');
    });

    it('trims whitespace and enforces maximum length', () => {
      const schema = sanitizedStringSchema(10);
      expect(schema.parse('  hello  ')).toBe('hello');
      expect(() => schema.parse('12345678901')).toThrow(/cannot exceed 10 characters/i);
    });
  });

  describe('Household Profile Schema', () => {
    it('validates complete household profile with members', () => {
      const payload = {
        city: 'Delhi NCR',
        neighborhood: 'Sector 62',
        latitude: 28.62,
        longitude: 77.36,
        homeType: 'APARTMENT',
        floorAreaSqFt: 1200,
        ceilingHeightFt: 9.0,
        hasHEPAFilter: true,
        hepaCADR: 250,
        windowSealing: 'MODERATE',
        primaryCookingFuel: 'LPG_GAS',
        members: [
          {
            nameOrAlias: 'Aarav',
            ageGroup: 'CHILD',
            hasAsthma: true,
            hasHeartCondition: false,
            isPregnant: false,
            outdoorHoursPerDay: 1.5,
          },
        ],
      };

      const result = createHouseholdProfileSchema.parse(payload);
      expect(result.city).toBe('Delhi NCR');
      expect(result.floorAreaSqFt).toBe(1200);
      expect(result.members).toHaveLength(1);
    });

    it('rejects negative or impossible floor area and height', () => {
      expect(() =>
        createHouseholdProfileSchema.parse({
          city: 'Noida',
          latitude: 28.62,
          longitude: 77.36,
          floorAreaSqFt: 10, // Minimum is 50
        })
      ).toThrow();

      expect(() =>
        createHouseholdProfileSchema.parse({
          city: 'Noida',
          latitude: 28.62,
          longitude: 77.36,
          floorAreaSqFt: 1000,
          ceilingHeightFt: 2.0, // Minimum is 6 ft
        })
      ).toThrow();
    });

    it('rejects unexpected / mass-assignment fields via .strict()', () => {
      expect(() =>
        createHouseholdProfileSchema.parse({
          city: 'Delhi',
          latitude: 28.6,
          longitude: 77.2,
          floorAreaSqFt: 500,
          isAdmin: true, // Malicious unexpected field
        })
      ).toThrow();
    });
  });

  describe('Impact Log Schema', () => {
    it('validates formula-backed impact records', () => {
      const valid = createImpactLogSchema.parse({
        actionType: 'COMMUTE_SHIFT',
        title: '14 km Metro Commute Shift',
        co2AvoidedKg: 2.08,
        pm25AvoidedGrams: 0.21,
        distanceShiftedKm: 14.0,
        calculationFormula: '14 km * (0.171 - 0.035)',
        uncertaintyMargin: 0.15,
      });

      expect(valid.co2AvoidedKg).toBe(2.08);
      expect(valid.uncertaintyMargin).toBe(0.15);
    });

    it('rejects negative savings values', () => {
      expect(() =>
        createImpactLogSchema.parse({
          actionType: 'COMMUTE_SHIFT',
          title: 'Invalid',
          co2AvoidedKg: -5.0,
          pm25AvoidedGrams: 0.1,
          calculationFormula: 'invalid',
        })
      ).toThrow();
    });
  });

  describe('Community Report Schema', () => {
    it('validates report with allowed enum types and bounds', () => {
      const report = createCommunityReportSchema.parse({
        reportType: 'VISIBLE_SMOG',
        severity: 'SEVERE',
        description: 'Dense agricultural smoke plume visible along north highway corridor.',
        latitude: 28.63,
        longitude: 77.37,
        neighborhood: 'Sector 62 Centroid',
      });

      expect(report.reportType).toBe('VISIBLE_SMOG');
      expect(report.severity).toBe('SEVERE');
    });

    it('rejects invalid enum severity', () => {
      expect(() =>
        createCommunityReportSchema.parse({
          reportType: 'VISIBLE_SMOG',
          severity: 'CRITICAL_EXTREME', // Unsupported enum
          description: 'test',
          latitude: 28.6,
          longitude: 77.2,
          neighborhood: 'test',
        })
      ).toThrow();
    });
  });

  describe('Recommendation Schema (6-Field Contract)', () => {
    it('enforces all 6 required explainability fields', () => {
      const recommendation = explainableRecommendationSchema.parse({
        category: 'INDOOR_PURIFICATION',
        recommendedAction: 'Operate bedroom HEPA at 180 CFM continuous',
        scientificReason: 'Infiltration rate continuously leaks PM2.5 indoors.',
        expectedBenefit: 'Reduces bronchial irritation by 78%.',
        quantifiedImpact: '82% indoor particulate drop.',
        assumptionsAndUncertainty: 'Assumes closed windows and standard seals (±10%).',
        implementationSteps: ['Place purifier 3ft from walls', 'Close bedroom door'],
        disclaimer: 'Environmental guidance only.',
      });

      expect(recommendation.category).toBe('INDOOR_PURIFICATION');
      expect(recommendation.implementationSteps).toHaveLength(2);
    });
  });
});
