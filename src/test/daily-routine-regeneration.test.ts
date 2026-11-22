import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { deterministicFallbackEngine } from '@/lib/ai/deterministic-fallback';
import { AiContextPayload } from '@/lib/ai/types';
import { POST as postRoutine } from '@/app/api/assistant/routine/route';
import { createTestAuthHeader } from '@/lib/auth-guard';
import prisma from '@/lib/db';
import { resetRateLimits } from '@/lib/rate-limiter';

describe('Personalized Air-Quality Daily Action Plan & Regeneration Suite', () => {
  let baseContext: AiContextPayload;

  beforeEach(() => {
    baseContext = {
      userId: 'test-user-context-id',
      timestampUtc: '2026-11-22T08:00:00.000Z',
      environment: {
        status: 'AVAILABLE',
        aqi: 220,
        standard: 'CPCB_NAQI',
        category: 'VERY_POOR',
        provenance: 'CACHED',
        provenanceType: 'HISTORICAL_IMPORTED',
        sourceProvider: 'CPCB_CAAQMS',
        isLive: false,
        stationName: 'Anand Vihar, New Delhi — DPCC',
        dominantPollutant: 'PM2.5',
        pollutants: {
          'PM2.5': { concentration: 165.4, unit: 'µg/m³', subIndex: 335, averagingPeriodHours: 24 },
          'PM10': { concentration: 280.0, unit: 'µg/m³', subIndex: 230, averagingPeriodHours: 24 },
        },
        observationTimeUtc: '2026-11-22T06:00:00.000Z',
        retrievalTimeUtc: '2026-11-22T07:00:00.000Z',
        cacheTimeUtc: '2026-11-22T07:00:00.000Z',
        freshnessState: 'CACHED',
        averagingNotice: 'Short-term acute 1-hour sensor proxy evaluated against CPCB breakpoints.',
      },
      household: {
        hasProfile: true,
        city: 'Delhi',
        coarseLocation: '28.65°N, 77.32°E',
        homeType: 'APARTMENT',
        roomVolumeCuFt: 2400,
        targetACH: 5.0,
        requiredCADR_CFM: 200,
        hasHEPAFilter: true,
        currentPurifierCADR: 250,
        purifierCapacityStatus: 'ADEQUATE',
        cadrDeficitCFM: 0,
        primaryCookingFuel: 'LPG',
        vulnerabilityTier: 'CHRONIC_RESPIRATORY_OR_CARDIAC',
        vulnerabilityLabel: 'Vulnerable Household (Asthma / Respiratory)',
        indoorPM25Target: 15.0,
        vulnerableMemberCount: 1,
        hasAsthmaOrRespiratory: true,
        hasInfantOrPediatric: false,
        hasSeniorMember: false,
      },
      routine: {
        savedRoutinesCount: 1,
        routes: [],
      },
    };
  });

  // 1. Meaningful Regeneration Variation
  describe('1. Meaningful Regeneration Variation (Non-Static Cards)', () => {
    it('generates distinctly different actions across consecutive regeneration clicks', () => {
      const plan0 = deterministicFallbackEngine.generateDailyRoutine(baseContext, { variationIndex: 0 });
      const plan1 = deterministicFallbackEngine.generateDailyRoutine(baseContext, { variationIndex: 1 });
      const plan2 = deterministicFallbackEngine.generateDailyRoutine(baseContext, { variationIndex: 2 });

      // Morning actions must vary meaningfully across regenerations
      const morningActions = [
        plan0.periods.find((p) => p.period === 'MORNING')?.action,
        plan1.periods.find((p) => p.period === 'MORNING')?.action,
        plan2.periods.find((p) => p.period === 'MORNING')?.action,
      ];
      const uniqueMorningActions = new Set(morningActions);
      expect(uniqueMorningActions.size).toBe(3);

      // Afternoon actions must vary meaningfully
      const afternoonActions = [
        plan0.periods.find((p) => p.period === 'AFTERNOON')?.action,
        plan1.periods.find((p) => p.period === 'AFTERNOON')?.action,
        plan2.periods.find((p) => p.period === 'AFTERNOON')?.action,
      ];
      const uniqueAfternoonActions = new Set(afternoonActions);
      expect(uniqueAfternoonActions.size).toBe(3);

      // Evening actions must vary meaningfully
      const eveningActions = [
        plan0.periods.find((p) => p.period === 'EVENING')?.action,
        plan1.periods.find((p) => p.period === 'EVENING')?.action,
        plan2.periods.find((p) => p.period === 'EVENING')?.action,
      ];
      const uniqueEveningActions = new Set(eveningActions);
      expect(uniqueEveningActions.size).toBe(3);
    });

    it('updates generation timestamp and maintains plan structure on each regeneration', () => {
      const plan = deterministicFallbackEngine.generateDailyRoutine(baseContext, { variationIndex: 1 });

      expect(plan.generatedAt).toBeDefined();
      expect(plan.periods.length).toBe(3);
      for (const p of plan.periods) {
        expect(p.action).toBeTruthy();
        expect(p.reason).toBeTruthy();
        expect(p.environmentalEvidence).toBeTruthy();
        expect(p.expectedBenefit).toBeTruthy();
        expect(p.implementationSteps.length).toBeGreaterThanOrEqual(2);
        expect(p.assumptions).toBeTruthy();
        expect(p.uncertainty).toBeTruthy();
        expect(p.freshnessAndSource).toBeTruthy();
      }
    });
  });

  // 2. Pollutant-Specific Adaptations
  describe('2. Pollutant-Specific Adaptations', () => {
    it('tailors afternoon guidance specifically to peak solar UV radiation when Ozone is dominant', () => {
      baseContext.environment.dominantPollutant = 'O3';
      baseContext.environment.aqi = 160;

      const plan = deterministicFallbackEngine.generateDailyRoutine(baseContext, { variationIndex: 1 });
      const afternoon = plan.periods.find((p) => p.period === 'AFTERNOON');

      expect(afternoon?.action).toContain('Ozone');
      expect(afternoon?.reason).toContain('photochemical ozone');
      expect(afternoon?.reason).toContain('ultraviolet');
    });

    it('tailors morning guidance to particulate deposition and masking when PM2.5 is dominant', () => {
      baseContext.environment.dominantPollutant = 'PM2.5';
      baseContext.environment.aqi = 250;

      const plan = deterministicFallbackEngine.generateDailyRoutine(baseContext, { variationIndex: 1 });
      const morning = plan.periods.find((p) => p.period === 'MORNING');

      expect(morning?.action).toContain('Respiratory Protection');
      expect(morning?.implementationSteps.some((s) => s.includes('N95') || s.includes('FFP2'))).toBe(true);
    });
  });

  // 3. Equipment & Household Personalization
  describe('3. Equipment & Household Personalization', () => {
    it('does NOT instruct users without a HEPA filter to engage a HEPA purifier', () => {
      baseContext.household.hasHEPAFilter = false;
      baseContext.household.requiredCADR_CFM = null;

      const plan = deterministicFallbackEngine.generateDailyRoutine(baseContext, { variationIndex: 0 });
      const evening = plan.periods.find((p) => p.period === 'EVENING');

      expect(evening?.action).not.toContain('Engage HEPA Purifier');
      expect(evening?.action).toContain('Suppress Indoor Particulate');
      expect(evening?.implementationSteps.some((s) => s.includes('rolled towel') || s.includes('draft-stopper'))).toBe(true);
    });

    it('provides CADR-calibrated purifier instructions when HEPA filter is available', () => {
      baseContext.household.hasHEPAFilter = true;
      baseContext.household.requiredCADR_CFM = 240;

      const plan = deterministicFallbackEngine.generateDailyRoutine(baseContext, { variationIndex: 0 });
      const evening = plan.periods.find((p) => p.period === 'EVENING');

      expect(evening?.action).toContain('HEPA Purifier');
      expect(evening?.implementationSteps.some((s) => s.includes('240 CFM'))).toBe(true);
    });

    it('adds specific respiratory precautions when household member has asthma', () => {
      baseContext.household.hasAsthmaOrRespiratory = true;

      const plan = deterministicFallbackEngine.generateDailyRoutine(baseContext, { variationIndex: 1 });
      const morning = plan.periods.find((p) => p.period === 'MORNING');

      expect(morning?.implementationSteps.some((s) => s.includes('inhaler') || s.includes('bronchodilator'))).toBe(true);
    });
  });

  // 4. Provenance & Scientific Truthfulness
  describe('4. Provenance & Scientific Truthfulness', () => {
    it('labels plan as LIVE_OBSERVATION_ADAPTED when genuine live feed is available', () => {
      baseContext.environment.isLive = true;
      baseContext.environment.provenance = 'LIVE';
      baseContext.environment.freshnessState = 'FRESH';

      const plan = deterministicFallbackEngine.generateDailyRoutine(baseContext);

      expect(plan.provenance).toBe('LIVE_OBSERVATION_ADAPTED');
      expect(plan.periods[0].environmentalEvidence).toContain('Live monitoring observation');
    });

    it('labels plan as HISTORICAL_BASELINE_ADAPTED when served from station archive', () => {
      baseContext.environment.isLive = false;
      baseContext.environment.provenance = 'CACHED';
      baseContext.environment.freshnessState = 'CACHED';

      const plan = deterministicFallbackEngine.generateDailyRoutine(baseContext);

      expect(plan.provenance).toBe('HISTORICAL_BASELINE_ADAPTED');
      expect(plan.periods[0].environmentalEvidence).toContain('Historical station record');
      expect(plan.periods[0].environmentalEvidence).toContain('Live updates temporarily inactive');
    });

    it('labels plan as PRECAUTIONARY_GUIDANCE when telemetry is unavailable', () => {
      baseContext.environment.status = 'NO_DATA';
      baseContext.environment.aqi = null;

      const plan = deterministicFallbackEngine.generateDailyRoutine(baseContext);

      expect(plan.provenance).toBe('PRECAUTIONARY_GUIDANCE');
      expect(plan.periods[0].environmentalEvidence).toContain('Air-quality monitoring data currently unavailable');
    });
  });

  // 5. Environmental Safety & Ventilation Constraints
  describe('5. Environmental Safety & Ventilation Constraints', () => {
    it('includes explicit CO2 ventilation safety caveats rather than advising permanent sealing', () => {
      const plan = deterministicFallbackEngine.generateDailyRoutine(baseContext, { variationIndex: 0 });

      for (const period of plan.periods) {
        expect(
          period.implementationSteps.some(
            (s) => s.includes('Safety Note') && s.includes('1,000 ppm')
          )
        ).toBe(true);
      }
    });

    it('contains non-medical disclaimer clarifying guidance is for environmental exposure reduction', () => {
      const plan = deterministicFallbackEngine.generateDailyRoutine(baseContext);

      expect(plan.disclaimer).toContain('Not medical advice');
      expect(plan.disclaimer).toContain('Air filtration and exposure timing mitigate risk');
    });
  });

  // 6. End-to-End API Route Regeneration Workflow (3 Consecutive Requests)
  describe('6. End-to-End API Route Regeneration Workflow (3 Consecutive Requests)', () => {
    const testUser = {
      id: 'usr_regeneration_e2e_001',
      email: 'regen_e2e@breathewise.test',
      role: 'USER',
    };

    beforeEach(async () => {
      resetRateLimits();
      await prisma.user.upsert({
        where: { id: testUser.id },
        create: {
          id: testUser.id,
          email: testUser.email,
          passwordHash: 'test_hash',
          role: testUser.role,
        },
        update: {},
      });
      await prisma.householdProfile.upsert({
        where: { userId: testUser.id },
        create: {
          userId: testUser.id,
          city: 'Delhi',
          neighborhood: 'Anand Vihar',
          latitude: 28.6469,
          longitude: 77.3160,
          homeType: 'APARTMENT',
          floorAreaSqFt: 1200,
          ceilingHeightFt: 9.0,
          hasHEPAFilter: true,
          hepaCADR: 250,
        },
        update: {},
      });
    });

    it('generates meaningfully distinct recommendations across 3 consecutive regeneration requests', async () => {
      const authHeader = await createTestAuthHeader(testUser.id);

      // Request 1: Initial Plan (variationIndex = 0)
      const req1 = new NextRequest('http://localhost:3000/api/assistant/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: authHeader },
        body: JSON.stringify({
          latitude: 28.6469,
          longitude: 77.3160,
          locationName: 'Delhi (Anand Vihar)',
          variationIndex: 0,
          isRegeneration: false,
        }),
      });
      const res1 = await postRoutine(req1);
      const json1 = await res1.json();
      expect(res1.status).toBe(200);
      expect(json1.success).toBe(true);
      const plan1 = json1.data;

      // Request 2: Click 1 "Regenerate Daily Plan" (variationIndex = 1)
      const req2 = new NextRequest('http://localhost:3000/api/assistant/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: authHeader },
        body: JSON.stringify({
          latitude: 28.6469,
          longitude: 77.3160,
          locationName: 'Delhi (Anand Vihar)',
          variationIndex: 1,
          isRegeneration: true,
        }),
      });
      const res2 = await postRoutine(req2);
      const json2 = await res2.json();
      expect(res2.status).toBe(200);
      expect(json2.success).toBe(true);
      const plan2 = json2.data;

      // Request 3: Click 2 "Regenerate Daily Plan" (variationIndex = 2)
      const req3 = new NextRequest('http://localhost:3000/api/assistant/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: authHeader },
        body: JSON.stringify({
          latitude: 28.6469,
          longitude: 77.3160,
          locationName: 'Delhi (Anand Vihar)',
          variationIndex: 2,
          isRegeneration: true,
        }),
      });
      const res3 = await postRoutine(req3);
      const json3 = await res3.json();
      expect(res3.status).toBe(200);
      expect(json3.success).toBe(true);
      const plan3 = json3.data;

      // 1. Actions across Morning, Afternoon, Evening are meaningfully varied
      const morning1 = plan1.periods.find((p: any) => p.period === 'MORNING')?.action;
      const morning2 = plan2.periods.find((p: any) => p.period === 'MORNING')?.action;
      const morning3 = plan3.periods.find((p: any) => p.period === 'MORNING')?.action;

      expect(morning1).toBeDefined();
      expect(morning2).toBeDefined();
      expect(morning3).toBeDefined();
      expect(morning1).not.toBe(morning2);
      expect(morning2).not.toBe(morning3);

      const afternoon1 = plan1.periods.find((p: any) => p.period === 'AFTERNOON')?.action;
      const afternoon2 = plan2.periods.find((p: any) => p.period === 'AFTERNOON')?.action;
      const afternoon3 = plan3.periods.find((p: any) => p.period === 'AFTERNOON')?.action;

      expect(afternoon1).not.toBe(afternoon2);
      expect(afternoon2).not.toBe(afternoon3);

      // 2. Implementation steps are distinct
      const steps1 = plan1.periods[0].implementationSteps.join(' ');
      const steps2 = plan2.periods[0].implementationSteps.join(' ');
      const steps3 = plan3.periods[0].implementationSteps.join(' ');

      expect(steps1).not.toBe(steps2);
      expect(steps2).not.toBe(steps3);

      // 3. Environmental telemetry context reaches generation engine
      expect(plan1.periods[0].environmentalEvidence).toContain('Anand Vihar');
      expect(plan2.periods[0].environmentalEvidence).toContain('Anand Vihar');
      expect(plan3.periods[0].environmentalEvidence).toContain('Anand Vihar');

      // 4. CO2 safety notice is present across all variations
      for (const plan of [plan1, plan2, plan3]) {
        for (const p of plan.periods) {
          expect(
            p.implementationSteps.some((s: string) => s.includes('Safety Note') && s.includes('1,000 ppm'))
          ).toBe(true);
        }
        expect(plan.disclaimer).toContain('Not medical advice');
      }
    }, 25_000);

    it('rejects invalid coordinates with HTTP 422', async () => {
      const authHeader = await createTestAuthHeader(testUser.id);
      const req = new NextRequest('http://localhost:3000/api/assistant/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: authHeader },
        body: JSON.stringify({
          latitude: 999, // Invalid latitude
          longitude: 77.3160,
        }),
      });
      const res = await postRoutine(req);
      expect(res.status).toBe(422);
    });

    it('rejects unauthenticated requests with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/assistant/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await postRoutine(req);
      expect(res.status).toBe(401);
    });
  });
});
