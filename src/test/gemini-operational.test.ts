import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateAssistantResponse,
  getGeminiProviderStatus,
  DEFAULT_GEMINI_MODEL,
} from '@/lib/ai/gemini-client';
import { assistantService } from '@/services/assistant.service';
import { AiContextPayload } from '@/lib/ai/types';

describe('Gemini AI Provider Operational Readiness & Resilience (M7-007 / M8.8)', () => {
  const originalEnv = process.env;

  const mockPayload: AiContextPayload = {
    userId: 'usr_test_123',
    environment: {
      aqi: 285,
      standard: 'CPCB_NAQI',
      category: 'POOR',
      status: 'AVAILABLE',
      provenance: 'HISTORICAL_SQLITE_SNAPSHOT',
      isLive: false,
      stationName: 'Anand Vihar Snapshot',
      dominantPollutant: 'PM2.5',
      pollutants: {
        'PM2.5': {
          concentration: 185.4,
          unit: 'µg/m³',
          subIndex: 285,
          averagingPeriodHours: 24,
        },
      },
      observationTimeUtc: '2026-11-20T10:00:00.000Z',
      freshnessState: 'FRESH',
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
      purifierCapacityStatus: 'DEFICIT',
      cadrDeficitCFM: 50,
      primaryCookingFuel: 'LPG_GAS',
      vulnerabilityTier: 'RESPIRATORY_ASTHMA',
      vulnerabilityLabel: 'Vulnerable Respiratory Tier',
      indoorPM25Target: 15.0,
      vulnerableMemberCount: 1,
      hasAsthmaOrRespiratory: true,
      hasInfantOrPediatric: false,
      hasSeniorMember: false,
    },
    routine: { savedRoutinesCount: 0, routes: [] },
    timestampUtc: '2026-11-20T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Operational Status & Diagnostic Probe', () => {
    it('reports MISSING_API_KEY with default gemini-3-flash-preview model when key is unconfigured', () => {
      const status = getGeminiProviderStatus();
      expect(status.configured).toBe(false);
      expect(status.status).toBe('MISSING_API_KEY');
      expect(status.modelName).toBe('gemini-3-flash-preview');
      expect(status.alternativeModelName).toBe('gemini-3.8-flash');
      expect(status.maxOutputTokens).toBe(4096);
      expect(status.timeoutMs).toBe(20000);
      expect(status.maxRetries).toBe(2);
      expect(JSON.stringify(status)).not.toContain('key');
    });

    it('respects GEMINI_MODEL env override in operational probe', () => {
      process.env.GEMINI_MODEL = 'gemini-1.5-flash';
      const status = getGeminiProviderStatus();
      expect(status.modelName).toBe('gemini-1.5-flash');
    });

    it('reports READY status when GEMINI_API_KEY is configured without leaking key', () => {
      const secretKey = 'ai_secret_gemini_prod_key_789';
      process.env.GEMINI_API_KEY = secretKey;

      const status = getGeminiProviderStatus();
      expect(status.configured).toBe(true);
      expect(status.status).toBe('READY');
      expect(JSON.stringify(status)).not.toContain(secretKey);
    });

    it('assistantService.getAiStatus delegates to getGeminiProviderStatus', () => {
      const status = assistantService.getAiStatus();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('modelName');
      expect(status).toHaveProperty('status');
    });
  });

  describe('Deterministic Fallback Fidelity on Unconfigured Key', () => {
    it('immediately serves pre-reviewed deterministic guidance without issuing network calls', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const response = await generateAssistantResponse(
        { message: 'Should I jog outdoors right now?' },
        mockPayload
      );

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(response.reply).toBeTruthy();
      expect(response.recommendations.length).toBeGreaterThan(0);
      expect(response.contextSummary.provenance).toBe('HISTORICAL_SQLITE_SNAPSHOT');
      expect(response.contextSummary.isLive).toBe(false);
      expect(response.recommendations[0].provenance).toBe('PRE_REVIEWED_RULE');
    });
  });

  describe('Error Handling, Retries & Fallback Resilience', () => {
    it('falls back to deterministic engine immediately on HTTP 401 Unauthorized without infinite retry', async () => {
      process.env.GEMINI_API_KEY = 'invalid_key';
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'API key not valid' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const response = await generateAssistantResponse(
        { message: 'What precautions should I take?' },
        mockPayload
      );

      // Should fail-closed cleanly after single attempt (no retry for 401)
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(response.reply).toBeTruthy();
      expect(response.contextSummary.isLive).toBe(false);
    });

    it('retries transient HTTP 503 and succeeds if subsequent attempt is 200', async () => {
      process.env.GEMINI_API_KEY = 'valid_key';

      const validGeminiJson = {
        reply: 'Air quality in Delhi is currently poor. Stay indoors.',
        recommendations: [
          {
            action: 'Keep windows shut and run HEPA purifier indoors',
            category: 'INDOOR_PURIFICATION',
            reason: 'High ambient PM2.5 requires indoor air filtration',
            expectedBenefit: 'Reduces indoor particulate exposure by up to 80%',
            measurableImpact: '80% PM2.5 reduction',
            assumptions: 'Room remains sealed',
            uncertainty: '±15%',
            implementationSteps: ['Close doors', 'Set purifier to auto mode'],
            disclaimer: 'Advisory only. Not clinical medical advice.',
          },
        ],
        contextSummary: {
          aqiStatus: 'POOR',
          aqiValue: 285,
          aqiCategory: 'POOR',
          dominantPollutant: 'PM2.5',
          provenance: 'HISTORICAL_SQLITE_SNAPSHOT',
          isLive: false,
          observationTimeUtc: '2026-11-20T10:00:00.000Z',
          coarseLocation: '28.61°N, 77.21°E',
          vulnerabilityTier: 'RESPIRATORY_ASTHMA',
        },
        evidenceCitations: ['CPCB Guidelines 2024'],
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: { message: 'Overloaded' } }), {
            status: 503,
            headers: { 'Retry-After': '0' },
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: JSON.stringify(validGeminiJson) }],
                  },
                },
              ],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );

      const response = await generateAssistantResponse(
        { message: 'What precautions should I take?' },
        mockPayload
      );

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(response.reply).toContain('Stay indoors');
      expect(response.recommendations[0].provenance).toBe('AI_GENERATED');
    });

    it('falls back cleanly when upstream times out or aborts', async () => {
      process.env.GEMINI_API_KEY = 'valid_key';
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new DOMException('The operation was aborted', 'AbortError')
      );

      const response = await generateAssistantResponse(
        { message: 'Recommend indoor plants for clean air' },
        mockPayload,
        { timeoutMs: 100 }
      );

      expect(response.reply).toBeTruthy();
      expect(response.recommendations.length).toBeGreaterThan(0);
    });

    it('falls back cleanly when Gemini returns malformed non-JSON text', async () => {
      process.env.GEMINI_API_KEY = 'valid_key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Here is some plain text that is NOT json!' }],
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await generateAssistantResponse(
        { message: 'Advise on face masks' },
        mockPayload
      );

      expect(response.reply).toBeTruthy();
      expect(response.contextSummary.provenance).toBe('HISTORICAL_SQLITE_SNAPSHOT');
    });

    it('strictly preserves ground truth snapshot invariants even if AI claims isLive: true', async () => {
      process.env.GEMINI_API_KEY = 'valid_key';

      // Hallucinated AI response claiming live real-time status
      const hallucinatedJson = {
        reply: 'Live real-time air quality is severe right now.',
        recommendations: [
          {
            action: 'Avoid morning jog',
            category: 'OUTDOOR_ACTIVITY',
            reason: 'Live air quality is severe',
            expectedBenefit: 'Avoids acute exposure',
            assumptions: 'None',
            uncertainty: 'None',
            implementationSteps: ['Stay inside'],
            disclaimer: 'Advisory only.',
          },
        ],
        contextSummary: {
          aqi: 285,
          aqiStatus: 'SEVERE',
          primaryPollutant: 'PM2.5',
          observationTimeUtc: '2026-11-20T10:00:00.000Z',
          stationName: 'Anand Vihar',
          isLive: true, // Fake claim!
          provenance: 'LIVE_STATION_TELEMETRY', // Fake claim!
        },
        evidenceCitations: [],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(hallucinatedJson) }],
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await generateAssistantResponse(
        { message: 'Is this live data?' },
        mockPayload
      );

      // Invariant lock: Must be locked to mockPayload.environment.isLive (false) and HISTORICAL_SQLITE_SNAPSHOT
      expect(response.contextSummary.isLive).toBe(false);
      expect(response.contextSummary.provenance).toBe('HISTORICAL_SQLITE_SNAPSHOT');
    });

    it('sanitizes script tags from AI response to prevent stored/reflected XSS', async () => {
      process.env.GEMINI_API_KEY = 'valid_key';

      const xssJson = {
        reply: 'Wear a mask <script>alert("xss")</script> when going out.',
        recommendations: [
          {
            action: 'Wear N95 <img src=x onerror=alert(1)>',
            category: 'OUTDOOR_ACTIVITY',
            reason: 'Protection <a href="javascript:steal()">link</a>',
            expectedBenefit: 'Avoids smoke',
            assumptions: 'None',
            uncertainty: 'Low',
            implementationSteps: ['Fit nose clip'],
            disclaimer: 'Advisory only.',
          },
        ],
        contextSummary: {
          aqiStatus: 'POOR',
          aqiValue: 285,
          aqiCategory: 'POOR',
          dominantPollutant: 'PM2.5',
          provenance: 'HISTORICAL_SQLITE_SNAPSHOT',
          isLive: false,
          observationTimeUtc: '2026-11-20T10:00:00.000Z',
          coarseLocation: '28.61°N, 77.21°E',
          vulnerabilityTier: 'RESPIRATORY_ASTHMA',
        },
        evidenceCitations: [],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(xssJson) }],
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

      const response = await generateAssistantResponse(
        { message: 'Mask tips' },
        mockPayload
      );

      expect(response.reply).not.toContain('<script>');
      expect(response.recommendations[0].action).not.toContain('onerror');
      expect(response.recommendations[0].reason).not.toContain('javascript:');
    });
  });
});
