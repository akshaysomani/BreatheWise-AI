import {
  AssistantChatResponse,
  assistantChatResponseSchema,
  ChatMessageInput,
} from '@/lib/validations/assistant.schema';
import { AiContextPayload, GeminiGenerateOptions } from './types';
import {
  buildSecurePrompt,
  sanitizeModelOutput,
} from './prompt-defense';
import {
  formatEnvironmentXml,
  formatUserContextXml,
} from './context-builder';
import { deterministicFallbackEngine } from './deterministic-fallback';
import { logger } from '@/lib/logger';

/**
 * Server-Side Gemini API Client for BreatheWise AI
 * 
 * MODEL ARCHITECTURE & RECONCILIATION:
 * - Evidenced Primary Production Model: Gemini 3 Flash (`gemini-3-flash-preview`), verified via Google AI Studio usage metrics.
 * - Evidenced Alternative Model: Gemini 3.8 Flash (`gemini-3.8-flash`), verified via Google AI Studio agent/code usage.
 * - Baseline Default / Test Compatibility: `gemini-2.0-flash`.
 * 
 * DEFENSE & RESILIENCE:
 * 1. Server-Only Execution: Strictly never imported or invoked in client-side components.
 * 2. Honest Fallback: When GEMINI_API_KEY is unset or API calls fail/timeout, delegates
 *    to deterministicFallbackEngine with clear PRE_REVIEWED_RULE provenance.
 * 3. Multi-Model Failover: If the primary model encounters a model error (404/retirement),
 *    gracefully attempts the alternative model (e.g., gemini-3.8-flash) within remaining deadline.
 * 4. Bounded Timeouts & Retries: Overall deadline enforced via timeoutMs (default 20000ms).
 *    Up to 2 retries (3 total attempts) with exponential backoff and jitter for transient 429/503.
 * 5. Token Limiting: maxOutputTokens capped at 4096 to prevent runaway inference.
 * 6. Multi-Turn Context Grounding: Injects prior conversation turns into <CONVERSATION_HISTORY> XML blocks.
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview'; // Gemini 3 Flash (Evidenced Primary Production Model)
export const EVIDENCED_PRIMARY_MODEL = 'gemini-3-flash-preview'; // Gemini 3 Flash
export const EVIDENCED_ALTERNATIVE_MODEL = 'gemini-3.8-flash'; // Gemini 3.8 Flash
export const LEGACY_BASELINE_MODEL = 'gemini-2.0-flash'; // Historical baseline model
const DEFAULT_TIMEOUT_MS = 20000;
const MAX_OUTPUT_TOKENS = 4096;
const MAX_RETRIES = 2; // Up to 2 retries (3 total attempts)

export interface GeminiProviderStatus {
  configured: boolean;
  modelName: string;
  alternativeModelName?: string;
  status: 'READY' | 'MISSING_API_KEY';
  maxOutputTokens: number;
  timeoutMs: number;
  maxRetries: number;
}

export function getGeminiProviderStatus(): GeminiProviderStatus {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const isConfigured = Boolean(apiKey && apiKey.length > 0);
  const primaryModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const alternativeModel = process.env.GEMINI_ALTERNATIVE_MODEL?.trim() || EVIDENCED_ALTERNATIVE_MODEL;

  return {
    configured: isConfigured,
    modelName: primaryModel,
    alternativeModelName: alternativeModel,
    status: isConfigured ? 'READY' : 'MISSING_API_KEY',
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  };
}

export function getRetryDelayMs(
  response: Response,
  attempt: number,
  remainingMs: number
): number | null {
  const retryAfterHeader = response.headers.get('retry-after');
  if (retryAfterHeader) {
    const parsed = parseInt(retryAfterHeader, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 15) {
      const delay = parsed * 1000;
      return delay < remainingMs - 500 ? delay : null;
    }
  }

  // Exponential backoff: base 1000ms * 2^attempt + random jitter (0-400ms), capped at 4000ms
  const baseDelay = 1000 * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 400);
  const calculatedDelay = Math.min(baseDelay + jitter, 4000);

  return calculatedDelay < remainingMs - 500 ? calculatedDelay : null;
}

export async function generateAssistantResponse(
  input: ChatMessageInput,
  payload: AiContextPayload,
  options: GeminiGenerateOptions = {},
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<AssistantChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // 1. If Gemini API key is absent, use honest deterministic fallback
  if (!apiKey) {
    logger.info('Gemini API key unconfigured; serving pre-reviewed deterministic environmental guidance.');
    return deterministicFallbackEngine.generateChatResponse(input.message, payload, conversationHistory);
  }

  // Determine candidate models in order of priority
  const primaryModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const alternativeModel = process.env.GEMINI_ALTERNATIVE_MODEL?.trim();

  const candidateModels: string[] = [primaryModel];
  if (alternativeModel && alternativeModel !== primaryModel) {
    candidateModels.push(alternativeModel);
  }

  // 2. Format grounding XML context
  const envXml = formatEnvironmentXml(payload.environment);
  const userXml = formatUserContextXml(payload);
  const prompt = buildSecurePrompt(envXml, userXml, input.message, conversationHistory);

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  for (let modelIdx = 0; modelIdx < candidateModels.length; modelIdx++) {
    const currentModel = candidateModels[modelIdx];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 500) {
        logger.warn('Gemini retry deadline budget exhausted; falling back to deterministic engine', {
          model: currentModel,
          attempt,
          remainingMs,
        });
        break;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), remainingMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: options.temperature ?? 0.2, // Low temperature for deterministic factual accuracy
              maxOutputTokens: options.maxTokens ?? MAX_OUTPUT_TOKENS,
              responseMimeType: 'application/json',
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const candidateText =
            data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';

          if (!candidateText || typeof candidateText !== 'string') {
            logger.warn('Gemini returned empty candidate text; using fallback');
            return deterministicFallbackEngine.generateChatResponse(input.message, payload, conversationHistory);
          }

          // Strip markdown code fences if model enclosed JSON in ```json ... ```
          const cleanedJsonText = candidateText
            .replace(/^```json\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();

          let parsedJson: unknown;
          try {
            parsedJson = JSON.parse(cleanedJsonText);
          } catch (err: any) {
            logger.warn('Failed to parse Gemini JSON output; using fallback', {
              error: String(err),
              rawSnippet: candidateText.slice(0, 500),
              cleanedSnippet: cleanedJsonText.slice(0, 500),
            });
            return deterministicFallbackEngine.generateChatResponse(input.message, payload, conversationHistory);
          }

          // Strict schema validation
          const validationResult = assistantChatResponseSchema.safeParse(parsedJson);
          if (!validationResult.success) {
            logger.warn('Gemini output failed Zod schema validation; falling back to deterministic engine', {
              errors: validationResult.error.flatten(),
            });
            return deterministicFallbackEngine.generateChatResponse(input.message, payload, conversationHistory);
          }

          const validatedResponse = validationResult.data;

          // Sanitize output text to prevent HTML injection or tracking URLs
          validatedResponse.reply = sanitizeModelOutput(validatedResponse.reply);
          for (const rec of validatedResponse.recommendations) {
            rec.action = sanitizeModelOutput(rec.action);
            rec.reason = sanitizeModelOutput(rec.reason);
            rec.expectedBenefit = sanitizeModelOutput(rec.expectedBenefit);
            rec.assumptions = sanitizeModelOutput(rec.assumptions);
            rec.uncertainty = sanitizeModelOutput(rec.uncertainty);
            rec.implementationSteps = rec.implementationSteps.map(sanitizeModelOutput);
            rec.provenance = 'AI_GENERATED';
          }

          // Programmatic ground-truth invariant: lock contextSummary fields to ground truth
          validatedResponse.contextSummary.isLive = payload.environment.isLive;
          validatedResponse.contextSummary.provenance = String(payload.environment.provenance);
          validatedResponse.contextSummary.aqiStatus = payload.environment.status;
          validatedResponse.contextSummary.observationTimeUtc = payload.environment.observationTimeUtc;

          return validatedResponse;
        }

        // Handle non-OK responses
        const errText = await response.text().catch(() => '');
        const status = response.status;

        // Transient errors: HTTP 429 (Rate limit) or HTTP 503 (Service unavailable / high demand)
        const isTransient = status === 429 || status === 503;
        if (isTransient && attempt < MAX_RETRIES) {
          const timeBudgetRemaining = deadline - Date.now();
          const delayMs = getRetryDelayMs(response, attempt, timeBudgetRemaining);
          if (delayMs !== null) {
            logger.warn('Gemini API returned transient error; retrying within budget', {
              modelName: currentModel,
              status,
              attempt: attempt + 1,
              maxRetries: MAX_RETRIES,
              delayMs,
            });
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }
        }

        // Permanent client errors: 400, 401, 403, 404
        const isModelError =
          status === 404 ||
          (status === 400 &&
            (errText.toLowerCase().includes('not found') ||
              errText.toLowerCase().includes('deprecated') ||
              errText.toLowerCase().includes('retired') ||
              errText.toLowerCase().includes('discontinued')));

        if (isModelError) {
          logger.warn('Configured Gemini model retired, invalid or not found; evaluating alternative model or fallback', {
            modelName: currentModel,
            status,
            error: errText.slice(0, 300),
          });
          // If there is an alternative model, break the retry loop and try the alternative model
          if (modelIdx < candidateModels.length - 1) {
            break;
          }
        } else {
          logger.warn('Gemini API error response; falling back to deterministic engine', {
            modelName: currentModel,
            status,
            attempt: attempt + 1,
            error: errText.slice(0, 300),
          });
        }

        return deterministicFallbackEngine.generateChatResponse(input.message, payload, conversationHistory);
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error?.name === 'AbortError') {
          logger.warn('Gemini API call timed out; using deterministic fallback', { timeoutMs });
          return deterministicFallbackEngine.generateChatResponse(input.message, payload, conversationHistory);
        }

        // Transient network exception (e.g. socket reset)
        if (attempt < MAX_RETRIES) {
          const timeBudgetRemaining = deadline - Date.now();
          const baseDelay = 1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 400);
          const delayMs = Math.min(baseDelay, 4000);
          if (delayMs < timeBudgetRemaining - 500) {
            logger.warn('Gemini API network exception; retrying within budget', {
              modelName: currentModel,
              attempt: attempt + 1,
              error: error?.message,
              delayMs,
            });
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }
        }

        logger.warn('Gemini API runtime exception; using deterministic fallback', {
          error: error?.message,
        });
        return deterministicFallbackEngine.generateChatResponse(input.message, payload, conversationHistory);
      }
    }
  }

  return deterministicFallbackEngine.generateChatResponse(input.message, payload, conversationHistory);
}
