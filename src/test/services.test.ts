import { describe, it, expect } from 'vitest';
import { householdService } from '@/services/household.service';
import { impactService } from '@/services/impact.service';
import { communityService } from '@/services/community.service';
import { routineService } from '@/services/routine.service';
import { airQualityService } from '@/services/air-quality.service';

describe('Business Services & Calculations (M2 Phase 6)', () => {
  describe('Household CADR Calculation Service', () => {
    it('calculates correct Clean Air Delivery Rate (CADR) for 5.0 ACH', () => {
      // 200 sq ft room with 9 ft ceiling = 1,800 cu ft volume
      // Target CADR = (1,800 * 5) / 60 = 150 CFM
      const cadr = householdService.calculateCadrRequirements(200, 9.0, null, 5.0);

      expect(cadr.roomVolumeCuFt).toBe(1800);
      expect(cadr.targetACH).toBe(5.0);
      expect(cadr.requiredCADR_CFM).toBe(150);
      expect(cadr.requiredCADR_M3H).toBe(Math.round(150 * 1.699));
      expect(cadr.isCurrentPurifierAdequate).toBe(false);
      expect(cadr.deficitCADR_CFM).toBe(150);
      expect(cadr.scientificPlantNotice).toContain('negligible Clean Air Delivery Rates');
    });

    it('correctly assesses whether existing purifier is adequate', () => {
      // Current purifier has 200 CFM; required is 150 CFM -> Adequate!
      const cadr = householdService.calculateCadrRequirements(200, 9.0, 200, 5.0);
      expect(cadr.isCurrentPurifierAdequate).toBe(true);
      expect(cadr.deficitCADR_CFM).toBe(0);
      expect(cadr.actualACHWithCurrentPurifier).toBeGreaterThanOrEqual(5.0);
    });

    it('correctly assesses vulnerability tiers based on family health profiles', () => {
      const asthmaticFamily = [
        { ageGroup: 'CHILD', hasAsthma: true, hasHeartCondition: false, isPregnant: false },
        { ageGroup: 'ADULT', hasAsthma: false, hasHeartCondition: false, isPregnant: false },
      ];
      const tier1 = householdService.evaluateVulnerabilityTier(asthmaticFamily);
      expect(tier1.tier).toBe('CRITICAL_RESPIRATORY');
      expect(tier1.targetACH).toBe(5.5);

      const infantFamily = [
        { ageGroup: 'INFANT', hasAsthma: false, hasHeartCondition: false, isPregnant: false },
        { ageGroup: 'ADULT', hasAsthma: false, hasHeartCondition: false, isPregnant: false },
      ];
      const tier2 = householdService.evaluateVulnerabilityTier(infantFamily);
      expect(tier2.tier).toBe('PEDIATRIC_VULNERABILITY');

      const seniorFamily = [
        { ageGroup: 'SENIOR', hasAsthma: false, hasHeartCondition: false, isPregnant: false },
      ];
      const tier3 = householdService.evaluateVulnerabilityTier(seniorFamily);
      expect(tier3.tier).toBe('SENIOR_CARE');
    });
  });

  describe('Impact Savings Service', () => {
    it('calculates formulaic CO2e avoidance using DEFRA constants with zero PM2.5 fabrication', () => {
      // Shift 14.2 km from SOLO_CAR (0.171 kg/km) to METRO (0.035 kg/km)
      // Delta = 14.2 * (0.171 - 0.035) = 14.2 * 0.136 = 1.9312 kg CO2e -> rounded to 1.93 kg
      const savings = impactService.calculateTransitSavings(14.2, 'SOLO_CAR', 'METRO');

      expect(savings.co2AvoidedKg).toBe(1.93);
      expect(savings.pm25AvoidedGrams).toBe(0);
      expect(savings.pm25Status).toBe('NOT_QUANTIFIED');
      expect(savings.calculationFormula).toContain('14.2 km * (0.171 kg/km [SOLO_CAR] - 0.035 kg/km [METRO])');
      expect(savings.uncertaintyMargin).toBe(0.15);
    });

    it('returns zero savings if optimized mode is more polluting than baseline', () => {
      const savings = impactService.calculateTransitSavings(10, 'WALK', 'SOLO_CAR');
      expect(savings.co2AvoidedKg).toBe(0);
      expect(savings.pm25AvoidedGrams).toBe(0);
    });
  });

  describe('Community Geolocation Fuzzing', () => {
    it('fuzzes precise GPS coordinates to 2 decimal places (~1.1 km precision)', () => {
      const fuzzed = communityService.fuzzCoordinates(28.628475, 77.364912);
      expect(fuzzed.fuzzedLatitude).toBe(28.63);
      expect(fuzzed.fuzzedLongitude).toBe(77.36);
    });
  });

  describe('Commute Safety-First Principle', () => {
    it('warns against active transit (cycling/walking) during severe smog (AQI > 150)', () => {
      const checkHazardous = routineService.evaluateCommuteSafety('BICYCLE', 210);
      expect(checkHazardous.isSafe).toBe(false);
      expect(checkHazardous.warning).toContain('minute-volume');
      expect(checkHazardous.recommendedAlternative).toBe('METRO');

      const checkClean = routineService.evaluateCommuteSafety('BICYCLE', 45);
      expect(checkClean.isSafe).toBe(true);
      expect(checkClean.warning).toBeNull();
    });
  });

  describe('Air Quality Service & Breakpoint Calculation', () => {
    it('correctly maps PM2.5 concentrations to US EPA AQI values and categories', () => {
      // 0 to 12.0 = Good
      expect(airQualityService.calculateAqiFromPm25(8.0).category).toBe('GOOD');

      // 12.1 to 35.4 = Moderate
      expect(airQualityService.calculateAqiFromPm25(25.0).category).toBe('MODERATE');

      // 35.5 to 55.4 = Unhealthy for Sensitive Groups
      expect(airQualityService.calculateAqiFromPm25(45.0).category).toBe('UNHEALTHY_SENSITIVE');

      // 55.5 to 150.4 = Unhealthy
      expect(airQualityService.calculateAqiFromPm25(100.0).category).toBe('UNHEALTHY');

      // 150.5 to 250.4 = Very Unhealthy
      expect(airQualityService.calculateAqiFromPm25(180.0).category).toBe('VERY_UNHEALTHY');

      // > 250.5 = Hazardous
      expect(airQualityService.calculateAqiFromPm25(300.0).category).toBe('HAZARDOUS');
    });

    it('correctly flags stale readings older than 180 minutes', () => {
      const freshTimestamp = new Date(Date.now() - 30 * 60 * 1000); // 30m ago
      const staleTimestamp = new Date(Date.now() - 240 * 60 * 1000); // 4 hours ago

      expect(airQualityService.isReadingStale(freshTimestamp)).toBe(false);
      expect(airQualityService.isReadingStale(staleTimestamp)).toBe(true);
    });
  });
});
