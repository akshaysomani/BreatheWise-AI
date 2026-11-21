import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { POST as postChat } from '@/app/api/assistant/chat/route';
import { GET as getConversations } from '@/app/api/assistant/conversations/route';
import { GET as getConversationById, DELETE as deleteConversation } from '@/app/api/assistant/conversations/[id]/route';
import { POST as postRoutine } from '@/app/api/assistant/routine/route';
import { POST as postIndoorAdvice } from '@/app/api/assistant/indoor-advice/route';
import { POST as postFeedback } from '@/app/api/assistant/feedback/route';
import { createTestAuthHeader } from '@/lib/auth-guard';
import { resetRateLimits } from '@/lib/rate-limiter';
import { buildAssistantContext, formatEnvironmentXml, formatUserContextXml } from '@/lib/ai/context-builder';
import { deterministicFallbackEngine } from '@/lib/ai/deterministic-fallback';
import { generateAssistantResponse, DEFAULT_GEMINI_MODEL } from '@/lib/ai/gemini-client';
import { structuredRecommendationSchema, assistantChatResponseSchema } from '@/lib/validations/assistant.schema';
import { airQualityRepository } from '@/repositories/air-quality.repository';
import { recommendationRepository } from '@/repositories/recommendation.repository';
import { householdService } from '@/services/household.service';

describe('BreatheWise AI — Module 5 Assistant & Recommendations Suite', () => {
  const userA = { id: 'usr_m5_test_a_001', email: 'userA_m5@breathewise.test', role: 'USER' };
  const userB = { id: 'usr_m5_test_b_002', email: 'userB_m5@breathewise.test', role: 'USER' };

  beforeEach(async () => {
    resetRateLimits();

    // Clean up test user records and test station snapshots
    await prisma.householdProfile.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.conversation.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.recommendationRecord.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.airQualitySnapshot.deleteMany({ where: { stationId: { startsWith: 'TEST_' } } });

    // Ensure test users exist
    await prisma.user.upsert({
      where: { id: userA.id },
      create: {
        id: userA.id,
        email: userA.email,
        passwordHash: 'dummy_hash',
        role: userA.role,
      },
      update: {},
    });

    await prisma.user.upsert({
      where: { id: userB.id },
      create: {
        id: userB.id,
        email: userB.email,
        passwordHash: 'dummy_hash',
        role: userB.role,
      },
      update: {},
    });
  });

  // =========================================================================
  // 1. Context Assembly & Grounding Isolation
  // =========================================================================
  describe('1. Context Assembly & Environmental Grounding', () => {
    it('assembles unconfigured location as honest NO_DATA without simulating an AQI', async () => {
      const context = await buildAssistantContext(userA.id);

      expect(context.userId).toBe(userA.id);
      expect(context.environment.status).toBe('NO_DATA');
      expect(context.environment.aqi).toBeNull();
      expect(context.environment.category).toBe('UNAVAILABLE');
      expect(context.environment.provenance).toBe('UNKNOWN_PROVENANCE');
      expect(context.environment.isLive).toBe(false);
      expect(context.environment.averagingNotice).toContain('No location coordinates provided');
    });

    it('quantizes user coordinates to 2 decimal places to preserve home location privacy', async () => {
      // Create profile with precise coordinates
      await prisma.householdProfile.upsert({
        where: { userId: userA.id },
        create: {
          userId: userA.id,
          city: 'Delhi',
          latitude: 28.613928, // High precision
          longitude: 77.209021,
          homeType: 'APARTMENT',
          floorAreaSqFt: 1000,
          ceilingHeightFt: 9.0,
          hasHEPAFilter: true,
          hepaCADR: 250,
          primaryCookingFuel: 'LPG_GAS',
        },
        update: {},
      });

      const context = await buildAssistantContext(userA.id);

      // Quantized to ~1.1 km precision
      expect(context.household.coarseLocation).toBe('28.61°N, 77.21°E');
      expect(context.household.coarseLocation).not.toContain('28.613928');
    });

    it('anonymizes context XML: never passes user email or personal names into model prompt', async () => {
      const context = await buildAssistantContext(userA.id);
      const userXml = formatUserContextXml(context);

      expect(userXml).not.toContain(userA.email);
      expect(userXml).not.toContain('userA');
      expect(userXml).toContain('<household');
      expect(userXml).toContain('<vulnerability_tier>');
    });

    it('correctly maps fresh vs stale telemetry snapshots into freshness states', async () => {
      // Create a stale snapshot (>4 hours old) in an isolated coordinate location (Mumbai)
      const staleDate = new Date(Date.now() - 5 * 60 * 60 * 1000);
      await prisma.airQualitySnapshot.create({
        data: {
          latitude: 19.076,
          longitude: 72.877,
          stationId: 'TEST_STALE_MUMBAI_STATION',
          stationName: 'Test Stale Mumbai Station',
          sourceProvider: 'CPCB',
          aqiValue: 245,
          aqiCategory: 'POOR',
          dominantPollutant: 'PM2.5',
          pm25: 145,
          measurementTimestamp: staleDate,
          provenanceType: 'HISTORICAL_IMPORTED',
          completenessHours: 24,
        },
      });

      const context = await buildAssistantContext(userA.id, { lat: 19.076, lon: 72.877 });

      expect(context.environment.status).toBe('AVAILABLE');
      expect(context.environment.aqi).toBe(245);
      expect(context.environment.freshnessState).toBe('STALE');
      expect(context.environment.isLive).toBe(false);
      expect(context.environment.provenance).toBe('STALE');
      expect(context.environment.provenanceType).toBe('HISTORICAL_IMPORTED');
      expect(context.environment.sourceProvider).toBe('CPCB');
    });

    it('enforces SQLite snapshot invariant: reading database records is NEVER classified as live', async () => {
      // Create fresh snapshot (10 mins old)
      const freshDate = new Date(Date.now() - 10 * 60 * 1000);
      await prisma.airQualitySnapshot.create({
        data: {
          latitude: 28.535,
          longitude: 77.391,
          stationId: 'TEST_NOIDA_FRESH_STATION',
          stationName: 'Noida Sector 62',
          sourceProvider: 'CPCB',
          aqiValue: 180,
          aqiCategory: 'MODERATE',
          dominantPollutant: 'PM2.5',
          pm25: 75,
          measurementTimestamp: freshDate,
          provenanceType: 'VERIFIED_EXTERNAL_OBSERVATION',
          completenessHours: 24,
        },
      });

      const context = await buildAssistantContext(userA.id, { lat: 28.535, lon: 77.391 });

      // Core invariant: SQLite record is NEVER a live external observation
      expect(context.environment.isLive).toBe(false);
      expect(context.environment.provenance).toBe('CACHED');
      expect(context.environment.provenanceType).toBe('VERIFIED_EXTERNAL_OBSERVATION');
      expect(context.environment.sourceProvider).toBe('CPCB');
      expect(context.environment.freshnessState).toBe('FRESH');
      expect(context.environment.observationTimeUtc).toBe(freshDate.toISOString());
      expect(context.environment.retrievalTimeUtc).toBeTruthy();
      expect(context.environment.cacheTimeUtc).toBeTruthy();
      expect(context.environment.averagingNotice).toContain('Cached database snapshot; not a live external measurement');
    });

    it('fails closed to UNKNOWN_PROVENANCE and NO_DATA when provider cannot be identified', async () => {
      const freshDate = new Date(Date.now() - 15 * 60 * 1000);
      await prisma.airQualitySnapshot.create({
        data: {
          latitude: 12.971,
          longitude: 77.594,
          stationId: 'TEST_BLR_UNKNOWN_PROVIDER',
          stationName: 'Unknown Source Station',
          sourceProvider: 'UNKNOWN', // Invalid/unverified provider
          aqiValue: 88,
          aqiCategory: 'SATISFACTORY',
          dominantPollutant: 'PM2.5',
          measurementTimestamp: freshDate,
          provenanceType: 'UNKNOWN_PROVENANCE',
          completenessHours: 24,
        },
      });

      const context = await buildAssistantContext(userA.id, { lat: 12.971, lon: 77.594 });

      // Fail-closed guarantee
      expect(context.environment.status).toBe('NO_DATA');
      expect(context.environment.aqi).toBeNull();
      expect(context.environment.provenance).toBe('UNKNOWN_PROVENANCE');
      expect(context.environment.provenanceType).toBe('UNKNOWN_PROVENANCE');
      expect(context.environment.sourceProvider).toBeNull();
      expect(context.environment.isLive).toBe(false);
      expect(context.environment.averagingNotice).toContain('unverified provenance');
    });

    it('fails closed to UNKNOWN_PROVENANCE when measurementTimestamp has invalid future clock skew', async () => {
      // Measurement timestamp 10 minutes in the future (> 5 min future clock skew tolerance)
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.airQualitySnapshot.create({
        data: {
          latitude: 13.082,
          longitude: 80.270,
          stationId: 'TEST_FUTURE_CLOCK_STATION',
          stationName: 'Future Clock Station',
          sourceProvider: 'CPCB',
          aqiValue: 120,
          aqiCategory: 'MODERATE',
          dominantPollutant: 'PM2.5',
          measurementTimestamp: futureDate,
          provenanceType: 'VERIFIED_EXTERNAL_OBSERVATION',
          completenessHours: 24,
        },
      });

      const context = await buildAssistantContext(userA.id, { lat: 13.082, lon: 80.270 });

      // Clock skew violation -> fail closed
      expect(context.environment.status).toBe('NO_DATA');
      expect(context.environment.aqi).toBeNull();
      expect(context.environment.provenance).toBe('UNKNOWN_PROVENANCE');
      expect(context.environment.isLive).toBe(false);
      expect(context.environment.observationTimeUtc).toBeNull();
    });

    it('distinguishes FRESH (<2h), CACHED (2-4h), and STALE (>4h) boundary conditions', async () => {
      // 2.5 hours old -> CACHED
      const agingDate = new Date(Date.now() - 2.5 * 60 * 60 * 1000);
      await prisma.airQualitySnapshot.create({
        data: {
          latitude: 26.846,
          longitude: 80.946,
          stationId: 'TEST_LKO_AGING_STATION',
          stationName: 'Lucknow Central',
          sourceProvider: 'CPCB',
          aqiValue: 310,
          aqiCategory: 'VERY_POOR',
          dominantPollutant: 'PM2.5',
          pm25: 190,
          measurementTimestamp: agingDate,
          provenanceType: 'VERIFIED_EXTERNAL_OBSERVATION',
          completenessHours: 24,
        },
      });

      const cachedContext = await buildAssistantContext(userA.id, { lat: 26.846, lon: 80.946 });

      expect(cachedContext.environment.status).toBe('AVAILABLE');
      expect(cachedContext.environment.aqi).toBe(310);
      expect(cachedContext.environment.freshnessState).toBe('CACHED');
      expect(cachedContext.environment.provenance).toBe('CACHED');
      expect(cachedContext.environment.isLive).toBe(false);

      // 5 hours old -> STALE
      const staleDate = new Date(Date.now() - 5 * 60 * 60 * 1000);
      await prisma.airQualitySnapshot.create({
        data: {
          latitude: 25.317,
          longitude: 82.973,
          stationId: 'TEST_VNS_STALE_STATION',
          stationName: 'Varanasi Sigra',
          sourceProvider: 'CPCB',
          aqiValue: 280,
          aqiCategory: 'POOR',
          dominantPollutant: 'PM2.5',
          pm25: 160,
          measurementTimestamp: staleDate,
          provenanceType: 'VERIFIED_EXTERNAL_OBSERVATION',
          completenessHours: 24,
        },
      });

      const staleContext = await buildAssistantContext(userA.id, { lat: 25.317, lon: 82.973 });

      expect(staleContext.environment.status).toBe('AVAILABLE');
      expect(staleContext.environment.aqi).toBe(280);
      expect(staleContext.environment.freshnessState).toBe('STALE');
      expect(staleContext.environment.provenance).toBe('STALE');
      expect(staleContext.environment.isLive).toBe(false);
    });

    it('preserves complete provenance metadata and distinct timestamps in formatEnvironmentXml', () => {
      const xml = formatEnvironmentXml({
        aqi: 220,
        standard: 'CPCB_NAQI',
        category: 'POOR',
        status: 'AVAILABLE',
        provenance: 'CACHED',
        provenanceType: 'VERIFIED_EXTERNAL_OBSERVATION',
        sourceProvider: 'CPCB',
        isLive: false,
        stationName: 'Anand Vihar',
        dominantPollutant: 'PM2.5',
        pollutants: {
          'PM2.5': { concentration: 135, unit: 'µg/m³', subIndex: null, averagingPeriodHours: 24 },
        },
        observationTimeUtc: '2026-11-20T10:00:00.000Z',
        retrievalTimeUtc: '2026-11-20T10:05:00.000Z',
        cacheTimeUtc: '2026-11-20T10:30:00.000Z',
        freshnessState: 'FRESH',
        averagingNotice: 'Certified 24h average',
      });

      expect(xml).toContain('<source_provider>CPCB</source_provider>');
      expect(xml).toContain('<provenance>CACHED</provenance>');
      expect(xml).toContain('<provenance_type>VERIFIED_EXTERNAL_OBSERVATION</provenance_type>');
      expect(xml).toContain('<is_live>false</is_live>');
      expect(xml).toContain('<observation_time>2026-11-20T10:00:00.000Z</observation_time>');
      expect(xml).toContain('<retrieval_time>2026-11-20T10:05:00.000Z</retrieval_time>');
      expect(xml).toContain('<cache_time>2026-11-20T10:30:00.000Z</cache_time>');
    });
  });

  // =========================================================================
  // 2. 6-Field Explainability Contract Validation
  // =========================================================================
  describe('2. 6-Field Explainability Contract Validation', () => {
    it('validates a conformant recommendation matching the 6-field contract', () => {
      const validRec = {
        action: 'Close windows and engage HEPA air cleaner at 5.0 ACH',
        reason: 'Ambient PM2.5 concentration exceeds the 24-hour national ambient air quality standard (60 µg/m³).',
        expectedBenefit: 'Lowers indoor fine particulate concentration by 85-90% within 45 minutes.',
        measurableImpact: '150 CFM clean air delivery reduces indoor PM2.5 to <15 µg/m³.',
        assumptions: 'Room volume of 1,800 cu ft; sealed window gaskets with minimal infiltration.',
        uncertainty: 'Infiltration rate varies between 0.3 and 0.8 air changes per hour depending on wind speed.',
        category: 'INDOOR_PURIFICATION' as const,
        priority: 'HIGH' as const,
        timeOfDay: 'EVENING' as const,
        implementationSteps: [
          'Inspect window latches to ensure rubber weatherstripping is compressed.',
          'Position HEPA purifier in the center of the room.',
        ],
        disclaimer: 'ASHRAE 62.2 / EPA residential guidance.',
        evidenceStrength: 'ESTIMATED_MODEL' as const,
        provenance: 'CALCULATED_ESTIMATE',
      };

      const result = structuredRecommendationSchema.safeParse(validRec);
      expect(result.success).toBe(true);
    });

    it('rejects a recommendation missing required explainability fields', () => {
      const invalidRec = {
        action: 'Stay indoors',
        // Missing reason, expectedBenefit, assumptions, uncertainty
        category: 'DAILY_ROUTINE',
        implementationSteps: ['Close door'],
        disclaimer: 'Standard notice',
      };

      const result = structuredRecommendationSchema.safeParse(invalidRec);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. Indoor Air Quality Advisor & CADR Equations
  // =========================================================================
  describe('3. Indoor Air Quality Advisor & CADR Calculations', () => {
    it('calculates exact Clean Air Delivery Rate (CADR) for 5.0 ACH and flags deficit', () => {
      const context = {
        userId: userA.id,
        environment: {
          aqi: 220,
          standard: 'CPCB_NAQI' as const,
          category: 'POOR',
          status: 'AVAILABLE' as const,
          provenance: 'VERIFIED_EXTERNAL_OBSERVATION' as const,
          isLive: true,
          stationName: 'Central Delhi',
          dominantPollutant: 'PM2.5',
          pollutants: {},
          observationTimeUtc: new Date().toISOString(),
          freshnessState: 'FRESH' as const,
          averagingNotice: 'Certified 24h average',
        },
        household: {
          hasProfile: true,
          city: 'Delhi',
          coarseLocation: '28.61°N, 77.21°E',
          homeType: 'APARTMENT',
          roomVolumeCuFt: 1800,
          targetACH: 5.0,
          requiredCADR_CFM: 150,
          hasHEPAFilter: true,
          currentPurifierCADR: 100,
          purifierCapacityStatus: 'DEFICIT' as const,
          cadrDeficitCFM: 50,
          primaryCookingFuel: 'LPG_GAS',
          vulnerabilityTier: 'STANDARD_HOUSEHOLD',
          vulnerabilityLabel: 'Standard Living',
          indoorPM25Target: 20.0,
          vulnerableMemberCount: 1,
          hasAsthmaOrRespiratory: false,
          hasInfantOrPediatric: false,
          hasSeniorMember: false,
        },
        routine: { savedRoutinesCount: 0, routes: [] },
        timestampUtc: new Date().toISOString(),
      };

      // Room: 200 sq ft, 9 ft ceiling = 1,800 cu ft
      // Target 5.0 ACH -> (1800 * 5) / 60 = 150 CFM required
      // Current purifier: 100 CFM -> Deficit = 50 CFM
      const advice = deterministicFallbackEngine.generateIndoorAdvice(
        {
          roomType: 'BEDROOM',
          roomSizeSqFt: 200,
          ceilingHeightFt: 9,
          occupancy: 2,
          hasPurifier: true,
          purifierCADR: 100,
          filterType: 'TRUE_HEPA_H13',
          cookingSource: 'LPG_GAS',
          hasSmoker: false,
          hasIncenseBurning: false,
        },
        context
      );

      expect(advice.cadrAnalysis.roomVolumeCuFt).toBe(1800);
      expect(advice.cadrAnalysis.requiredCADR_CFM).toBe(150);
      expect(advice.cadrAnalysis.isPurifierAdequate).toBe(false);
      expect(advice.cadrAnalysis.deficitCADR_CFM).toBe(50);
      expect(advice.scientificNotices.plantMythDebunked).toContain('produce negligible Clean Air Delivery Rates');
      expect(advice.recommendations.length).toBeGreaterThan(0);
    });

    it('enforces physical bounds with explicit validation errors on zero, negative, and extreme dimensions', () => {
      // Zero dimensions should throw explicit validation errors
      expect(() => householdService.calculateCadrRequirements(0, 9, null, 5.0)).toThrow('Invalid room floor area');
      expect(() => householdService.calculateCadrRequirements(200, 0, null, 5.0)).toThrow('Invalid ceiling height');

      // Negative dimensions should throw explicit validation errors
      expect(() => householdService.calculateCadrRequirements(-200, 9, null, 5.0)).toThrow('Invalid room floor area');
      expect(() => householdService.calculateCadrRequirements(200, -9, null, 5.0)).toThrow('Invalid ceiling height');

      // Extreme dimensions outside acceptable range (20-5000 sq ft, 7-18 ft height) should throw
      expect(() => householdService.calculateCadrRequirements(15, 9, null, 5.0)).toThrow('Invalid room floor area');
      expect(() => householdService.calculateCadrRequirements(6000, 9, null, 5.0)).toThrow('Invalid room floor area');
      expect(() => householdService.calculateCadrRequirements(200, 5, null, 5.0)).toThrow('Invalid ceiling height');
      expect(() => householdService.calculateCadrRequirements(200, 25, null, 5.0)).toThrow('Invalid ceiling height');
    });

    it('correctly calculates CADR in both CFM and m³/h with exact conversion ratio', () => {
      // 200 sq ft, 9 ft height, 5.0 ACH:
      // Volume = 1800 cu ft
      // Target CADR CFM = 1800 * 5 / 60 = 150 CFM
      // Target CADR m3/h = 150 * 1.69901 = 254.85 -> 255 m3/h
      const result = householdService.calculateCadrRequirements(200, 9, 100, 5.0);
      expect(result.roomVolumeCuFt).toBe(1800);
      expect(result.requiredCADR_CFM).toBe(150);
      expect(result.requiredCADR_M3H).toBe(255);
      expect(result.standardsNote).toContain('engineering design target');
      expect(result.standardsNote).toContain('not a universal legal mandate');
    });
  });

  // =========================================================================
  // 4. Daily Routine Generation & Diurnal Windows
  // =========================================================================
  describe('4. Daily Routine Generation & Diurnal Windows', () => {
    it('generates a 3-period plan with 7 structured elements per period', async () => {
      const context = await buildAssistantContext(userA.id);
      const plan = deterministicFallbackEngine.generateDailyRoutine(context);

      expect(plan.periods.length).toBe(3);
      const periods = plan.periods.map((p) => p.period);
      expect(periods).toContain('MORNING');
      expect(periods).toContain('AFTERNOON');
      expect(periods).toContain('EVENING');

      // Verify 7 elements per period
      for (const p of plan.periods) {
        expect(p.action).toBeTruthy();
        expect(p.reason).toBeTruthy();
        expect(p.environmentalEvidence).toBeTruthy();
        expect(p.expectedBenefit).toBeTruthy();
        expect(p.implementationSteps.length).toBeGreaterThanOrEqual(1);
        expect(p.assumptions).toBeTruthy();
        expect(p.uncertainty).toBeTruthy();
        expect(p.freshnessAndSource).toBeTruthy();
      }
    });

    it('recommends closed windows when afternoon AQI is elevated (>100)', async () => {
      const context = await buildAssistantContext(userA.id);
      context.environment.status = 'AVAILABLE';
      context.environment.aqi = 180;
      context.environment.category = 'MODERATE';

      const plan = deterministicFallbackEngine.generateDailyRoutine(context);
      const afternoon = plan.periods.find((p) => p.period === 'AFTERNOON');
      expect(afternoon?.action).toContain('Maintain Closed Windows');
    });

    it('recommends conditional cross-ventilation only when afternoon AQI is verified clean (<=100)', async () => {
      const context = await buildAssistantContext(userA.id);
      context.environment.status = 'AVAILABLE';
      context.environment.aqi = 45;
      context.environment.category = 'GOOD';

      const plan = deterministicFallbackEngine.generateDailyRoutine(context);
      const afternoon = plan.periods.find((p) => p.period === 'AFTERNOON');
      expect(afternoon?.action).toContain('Conditional Midday Cross-Ventilation');
    });
  });

  // =========================================================================
  // 5. Environmental Safety Rules & Medical Triage
  // =========================================================================
  describe('5. Environmental Safety Rules & Medical Triage', () => {
    it('detects emergency symptoms and directs immediately to clinical emergency care (112)', async () => {
      const context = await buildAssistantContext(userA.id);
      const response = deterministicFallbackEngine.generateChatResponse(
        'My mother has severe chest pain and cannot breathe in this smog',
        context
      );

      expect(response.reply).toContain('CRITICAL HEALTH ALERT');
      expect(response.reply).toContain('112');
      expect(response.recommendations[0].action).toContain('Emergency Medical Attention');
      expect(response.disclaimer).toContain('Consult emergency medical professionals');
    });

    it('strongly discourages outdoor jogging when ambient AQI is severe (>250)', async () => {
      const context = await buildAssistantContext(userA.id);
      context.environment.status = 'AVAILABLE';
      context.environment.aqi = 320;
      context.environment.category = 'VERY_POOR';

      const response = deterministicFallbackEngine.generateChatResponse(
        'Can I go for a 5km run outdoors right now?',
        context
      );

      expect(response.reply).toContain('strongly discouraged');
      expect(response.recommendations[0].action).toContain('Cancel Outdoor Exercise');
      expect(response.recommendations[0].assumptions).toContain('Ve = 45 L/min');
    });

    it('recommends underground metro over open roadway travel to minimize inhaled particulate dose', async () => {
      const context = await buildAssistantContext(userA.id);
      const response = deterministicFallbackEngine.generateChatResponse(
        'Should I take my motorcycle or the metro to work today?',
        context
      );

      expect(response.recommendations[0].action).toContain('Metro');
      expect(response.recommendations[0].expectedBenefit).toContain('64%');
      expect(response.recommendations[0].measurableImpact).toContain('0.136 kg CO2e');
    });

    it('does not advise emergency 112 medical triage merely because AQI is severe (>400) without symptoms', async () => {
      const context = await buildAssistantContext(userA.id);
      context.environment.status = 'AVAILABLE';
      context.environment.aqi = 425;
      context.environment.category = 'SEVERE';

      const response = deterministicFallbackEngine.generateChatResponse(
        'Can I go for a walk outside right now?',
        context
      );

      // Should advise canceling outdoor exercise and remaining indoors
      expect(response.recommendations[0].action).toContain('Cancel Outdoor Exercise');
      // Should NOT make primary action calling 112 emergency medical triage unless acute symptoms occur
      expect(response.recommendations[0].action).not.toContain('Seek Immediate Emergency Medical Attention');
      expect(response.reply).not.toContain('CRITICAL HEALTH ALERT');
    });

    it('discloses respirator particulate filtration vs gaseous pollutant limitations', async () => {
      const context = await buildAssistantContext(userA.id);
      context.environment.status = 'AVAILABLE';
      context.environment.aqi = 340;
      context.environment.category = 'VERY_POOR';

      const response = deterministicFallbackEngine.generateChatResponse(
        'Should I go jogging or stay outside?',
        context
      );

      const steps = response.recommendations[0].implementationSteps.join(' ');
      expect(steps).toContain('N95');
      expect(steps).toContain('airtight facial seal');
      expect(steps).toContain('DO NOT protect against toxic combustion gases');
      expect(steps).toContain('Thin consumer carbon layers do not provide certified chemical gas protection');
    });
  });

  // =========================================================================
  // 6. Integration API Endpoints & Authentication Guards
  // =========================================================================
  describe('6. Integration API Endpoints & Authentication Guards', () => {
    it('POST /api/assistant/chat: rejects unauthenticated request with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello assistant' }),
      });

      const res = await postChat(req);
      expect(res.status).toBe(401);
    });

    it('POST /api/assistant/chat: processes authenticated query and returns structured response', async () => {
      const authHeader = await createTestAuthHeader(userA.id);
      const req = new NextRequest('http://localhost:3000/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: authHeader,
        },
        body: JSON.stringify({ message: 'When should I ventilate my living room?' }),
      });

      const res = await postChat(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.reply).toBeTruthy();
      expect(json.data.conversationId).toBeTruthy();
      expect(json.data.recommendations.length).toBeGreaterThan(0);

      // Verify recommendations were persisted to database
      const saved = await recommendationRepository.getByUser(userA.id);
      expect(saved.length).toBeGreaterThan(0);
    });

    it('GET & DELETE /api/assistant/conversations/[id]: enforces strict ownership (no cross-user access)', async () => {
      // User A creates conversation
      const authHeaderA = await createTestAuthHeader(userA.id);
      const chatReq = new NextRequest('http://localhost:3000/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: authHeaderA },
        body: JSON.stringify({ message: 'Private conversation for User A' }),
      });

      const chatRes = await postChat(chatReq);
      const chatJson = await chatRes.json();
      const conversationId = chatJson.data.conversationId;

      // User B attempts to access User A's conversation -> HTTP 404 (Not Found / Access Denied)
      const authHeaderB = await createTestAuthHeader(userB.id);
      const getReqB = new NextRequest(`http://localhost:3000/api/assistant/conversations/${conversationId}`, {
        headers: { authorization: authHeaderB },
      });

      const getResB = await getConversationById(getReqB, { params: Promise.resolve({ id: conversationId }) });
      expect(getResB.status).toBe(404);

      // User B attempts to delete User A's conversation -> HTTP 404
      const delReqB = new NextRequest(`http://localhost:3000/api/assistant/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { authorization: authHeaderB },
      });

      const delResB = await deleteConversation(delReqB, { params: Promise.resolve({ id: conversationId }) });
      expect(delResB.status).toBe(404);

      // User A successfully deletes own conversation
      const delReqA = new NextRequest(`http://localhost:3000/api/assistant/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { authorization: authHeaderA },
      });

      const delResA = await deleteConversation(delReqA, { params: Promise.resolve({ id: conversationId }) });
      expect(delResA.status).toBe(200);
    });

    it('POST /api/assistant/routine: generates and persists daily routine', async () => {
      const authHeader = await createTestAuthHeader(userA.id);
      const req = new NextRequest('http://localhost:3000/api/assistant/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: authHeader },
        body: JSON.stringify({}),
      });

      const res = await postRoutine(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.periods.length).toBe(3);
    });

    it('POST /api/assistant/indoor-advice: returns CADR analysis and recommendations', async () => {
      const authHeader = await createTestAuthHeader(userA.id);
      const req = new NextRequest('http://localhost:3000/api/assistant/indoor-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: authHeader },
        body: JSON.stringify({
          roomType: 'BEDROOM',
          roomSizeSqFt: 300,
          ceilingHeightFt: 10,
          hasPurifier: true,
          purifierCADR: 200,
        }),
      });

      const res = await postIndoorAdvice(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.cadrAnalysis.roomVolumeCuFt).toBe(3000);
      expect(json.data.cadrAnalysis.requiredCADR_CFM).toBe(250); // (3000 * 5) / 60
    });

    it('POST /api/assistant/feedback: records helpful rating', async () => {
      const authHeader = await createTestAuthHeader(userA.id);
      const req = new NextRequest('http://localhost:3000/api/assistant/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: authHeader },
        body: JSON.stringify({
          isHelpful: true,
          feedbackReason: 'Clear CADR calculation',
        }),
      });

      const res = await postFeedback(req);
      expect(res.status).toBe(201);
    });
  });

  // =========================================================================
  // 7. Model Lifecycle & Error Resilience
  // =========================================================================
  describe('7. Model Lifecycle & Error Resilience', () => {
    it('gracefully falls back to deterministic engine when GEMINI_API_KEY is missing', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      try {
        const context = await buildAssistantContext(userA.id);
        const res = await generateAssistantResponse(
          { message: 'Should I open windows today?' },
          context
        );
        expect(res.reply).toBeTruthy();
        expect(res.recommendations.length).toBeGreaterThan(0);
        expect(res.recommendations[0].provenance).toBe('PRE_REVIEWED_RULE');
      } finally {
        process.env.GEMINI_API_KEY = origKey;
      }
    });

    it('handles retired or not found model (HTTP 404 / 400) by falling back to deterministic engine', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      const origFetch = globalThis.fetch;
      process.env.GEMINI_API_KEY = 'test-mock-key';

      // Mock 404 Not Found (e.g. retired model endpoint)
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 404,
              message: 'models/gemini-1.5-flash is not found for API version v1beta, or is not supported.',
              status: 'NOT_FOUND',
            },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )) as any;

      try {
        const context = await buildAssistantContext(userA.id);
        const res = await generateAssistantResponse(
          { message: 'Can I go for a jog outside?' },
          context
        );
        expect(res.reply).toBeTruthy();
        expect(res.recommendations.length).toBeGreaterThan(0);
        expect(res.recommendations[0].provenance).toBe('PRE_REVIEWED_RULE');
      } finally {
        process.env.GEMINI_API_KEY = origKey;
        globalThis.fetch = origFetch;
      }
    });

    it('verifies gemini-3-flash-preview as production default model', () => {
      expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3-flash-preview');
    });

    it('retries transient HTTP 503 and succeeds on retry', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      const origFetch = globalThis.fetch;
      process.env.GEMINI_API_KEY = 'test-mock-key';

      let callCount = 0;
      globalThis.fetch = (async () => {
        callCount++;
        if (callCount === 1) {
          return new Response(
            JSON.stringify({
              error: { code: 503, message: 'High demand spike', status: 'UNAVAILABLE' },
            }),
            { status: 503, headers: { 'Content-Type': 'application/json', 'retry-after': '1' } }
          );
        }
        // Second call succeeds with valid JSON
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        reply: 'Outdoor air is currently moderate; exercise is acceptable.',
                        recommendations: [
                          {
                            action: 'Proceed with light exercise',
                            reason: 'PM2.5 within acceptable range.',
                            expectedBenefit: 'Cardiovascular fitness maintained.',
                            measurableImpact: 'Low inhaled particulate exposure.',
                            assumptions: 'Urban park environment.',
                            uncertainty: 'Microclimates may vary.',
                            category: 'DAILY_ROUTINE',
                            priority: 'MEDIUM',
                            timeOfDay: 'ALL_DAY',
                            implementationSteps: ['Warm up', 'Maintain hydration'],
                            disclaimer: 'General guidance',
                            evidenceStrength: 'MEASURED_OBSERVATION',
                            provenance: 'AI_GENERATED',
                          },
                        ],
                        contextSummary: {
                          aqiStatus: 'AVAILABLE',
                          aqiValue: 80,
                          aqiCategory: 'SATISFACTORY',
                          dominantPollutant: 'PM2.5',
                          provenance: 'CACHED',
                          isLive: false,
                          observationTimeUtc: new Date().toISOString(),
                          coarseLocation: 'Delhi',
                          vulnerabilityTier: 'STANDARD',
                        },
                        evidenceCitations: ['CPCB NAQI'],
                        disclaimer: 'General environmental guidance',
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }) as any;

      try {
        const context = await buildAssistantContext(userA.id);
        const res = await generateAssistantResponse(
          { message: 'Can I exercise outdoors?' },
          context,
          { timeoutMs: 15000 }
        );
        expect(callCount).toBe(2); // Succeeded on retry attempt 2
        expect(res.reply).toBeTruthy();
        expect(res.recommendations[0].provenance).toBe('AI_GENERATED');
      } finally {
        process.env.GEMINI_API_KEY = origKey;
        globalThis.fetch = origFetch;
      }
    });

    it('exhausts retries on persistent HTTP 503 and cleanly falls back to deterministic rules engine', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      const origFetch = globalThis.fetch;
      process.env.GEMINI_API_KEY = 'test-mock-key';

      let callCount = 0;
      globalThis.fetch = (async () => {
        callCount++;
        return new Response(
          JSON.stringify({
            error: { code: 503, message: 'Continuous upstream capacity exhaustion', status: 'UNAVAILABLE' },
          }),
          { status: 503, headers: { 'Content-Type': 'application/json', 'retry-after': '1' } }
        );
      }) as any;

      try {
        const context = await buildAssistantContext(userA.id);
        const res = await generateAssistantResponse(
          { message: 'Can I go for a run?' },
          context,
          { timeoutMs: 15000 }
        );
        expect(callCount).toBe(3); // 1 initial + 2 retries = 3 total attempts
        expect(res.reply).toBeTruthy();
        expect(res.recommendations[0].provenance).toBe('PRE_REVIEWED_RULE');
      } finally {
        process.env.GEMINI_API_KEY = origKey;
        globalThis.fetch = origFetch;
      }
    });

    it('does NOT retry permanent errors (HTTP 401 Unauthorized)', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      const origFetch = globalThis.fetch;
      process.env.GEMINI_API_KEY = 'invalid-api-key';

      let callCount = 0;
      globalThis.fetch = (async () => {
        callCount++;
        return new Response(
          JSON.stringify({
            error: { code: 401, message: 'API key not valid. Please pass a valid API key.', status: 'UNAUTHENTICATED' },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }) as any;

      try {
        const context = await buildAssistantContext(userA.id);
        const res = await generateAssistantResponse(
          { message: 'How is the air quality?' },
          context
        );
        expect(callCount).toBe(1); // Permanent failure: MUST NOT retry
        expect(res.reply).toBeTruthy();
        expect(res.recommendations[0].provenance).toBe('PRE_REVIEWED_RULE');
      } finally {
        process.env.GEMINI_API_KEY = origKey;
        globalThis.fetch = origFetch;
      }
    });

    it('terminates retry loop when timeout budget is exhausted', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      const origFetch = globalThis.fetch;
      process.env.GEMINI_API_KEY = 'test-mock-key';

      let callCount = 0;
      globalThis.fetch = (async () => {
        callCount++;
        return new Response(
          JSON.stringify({
            error: { code: 503, message: 'Capacity spike', status: 'UNAVAILABLE' },
          }),
          { status: 503, headers: { 'Content-Type': 'application/json', 'retry-after': '10' } }
        );
      }) as any;

      try {
        const context = await buildAssistantContext(userA.id);
        // Timeout 1200ms: retry delay of 10s or even 2s exceeds remaining budget, so loop aborts after attempt 1
        const res = await generateAssistantResponse(
          { message: 'Can I open windows?' },
          context,
          { timeoutMs: 1200 }
        );
        expect(callCount).toBe(1);
        expect(res.recommendations[0].provenance).toBe('PRE_REVIEWED_RULE');
      } finally {
        process.env.GEMINI_API_KEY = origKey;
        globalThis.fetch = origFetch;
      }
    });

    it('programmatically locks contextSummary.isLive and provenance to payload ground truth preventing AI fabrication', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      const origFetch = globalThis.fetch;
      process.env.GEMINI_API_KEY = 'test-mock-key';

      // Mock LLM returning fabricated live telemetry
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        reply: 'Here is your guidance.',
                        recommendations: [
                          {
                            action: 'Keep windows closed',
                            reason: 'High ambient particulate load.',
                            expectedBenefit: 'Lower indoor PM2.5.',
                            measurableImpact: 'Scrubbed indoor air.',
                            assumptions: 'Standard residential home.',
                            uncertainty: 'Microclimates.',
                            category: 'INDOOR_PURIFICATION',
                            priority: 'HIGH',
                            timeOfDay: 'ALL_DAY',
                            implementationSteps: ['Close windows', 'Run purifier'],
                            disclaimer: 'General guidance',
                            evidenceStrength: 'MEASURED_OBSERVATION',
                            provenance: 'AI_GENERATED',
                          },
                        ],
                        contextSummary: {
                          aqiStatus: 'AVAILABLE',
                          aqiValue: 200,
                          aqiCategory: 'POOR',
                          dominantPollutant: 'PM2.5',
                          provenance: 'LIVE_MEASUREMENT', // Model attempts to claim LIVE_MEASUREMENT
                          isLive: true,                   // Model attempts to claim isLive: true
                          observationTimeUtc: '2026-11-20T12:00:00Z',
                          coarseLocation: 'Delhi',
                          vulnerabilityTier: 'STANDARD',
                        },
                        evidenceCitations: ['CPCB NAQI'],
                        disclaimer: 'General environmental guidance',
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )) as any;

      try {
        const context = await buildAssistantContext(userA.id);
        // context.environment.isLive is strictly false for database snapshot
        expect(context.environment.isLive).toBe(false);

        const res = await generateAssistantResponse(
          { message: 'Should I open windows?' },
          context
        );

        // Core safeguard: Programmatic ground truth invariant locks contextSummary
        expect(res.contextSummary.isLive).toBe(false);
        expect(res.contextSummary.provenance).toBe(context.environment.provenance);
        expect(res.contextSummary.aqiStatus).toBe(context.environment.status);
      } finally {
        process.env.GEMINI_API_KEY = origKey;
        globalThis.fetch = origFetch;
      }
    });
  });
});
