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
import { structuredRecommendationSchema, assistantChatResponseSchema } from '@/lib/validations/assistant.schema';
import { airQualityRepository } from '@/repositories/air-quality.repository';
import { recommendationRepository } from '@/repositories/recommendation.repository';

describe('BreatheWise AI — Module 5 Assistant & Recommendations Suite', () => {
  const userA = { id: 'usr_m5_test_a_001', email: 'userA_m5@breathewise.test', role: 'USER' };
  const userB = { id: 'usr_m5_test_b_002', email: 'userB_m5@breathewise.test', role: 'USER' };

  beforeEach(async () => {
    resetRateLimits();

    // Clean up test user records
    await prisma.householdProfile.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.conversation.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.recommendationRecord.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });

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
});
