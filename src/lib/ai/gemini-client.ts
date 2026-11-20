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
 * Server-Side Gemini API Client for BreatheWise AI (M5)
 * 
 * DEFENSE & RESILIENCE:
 * 1. Server-Only Execution: Strictly never imported or invoked in client-side components.
 * 2. Honest Fallback: When GEMINI_API_KEY is unset or API calls fail/timeout, delegates
 *    to deterministicFallbackEngine with clear PRE_REVIEWED_RULE provenance.
 * 3. Bounded Timeouts & Retries: Overall deadline enforced via timeoutMs (default 20000ms).
 *    Up to 2 retries (3 total attempts) with exponential backoff and jitter for transient 429/503.
 *    Bypasses retry for permanent 400, 401, 403, 404 client errors.
 * 4. Token Limiting: maxOutputTokens capped at 4096 to prevent runaway inference.
 * 5. Strict Zod Validation & Provenance Invariant: Validates model JSON output against schema;
 *    programmatically locks contextSummary.isLive and provenance to payload.environment ground truth.
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const DEFAULT_TIMEOUT_MS = 20000;
const MAX_OUTPUT_TOKENS = 4096;
const MAX_RETRIES = 2; // Up to 2 retries (3 total attempts)

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
  options: GeminiGenerateOptions = {}
): Promise<AssistantChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const modelName = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  // 1. If Gemini API key is absent, use honest deterministic fallback
  if (!apiKey) {
    logger.info('Gemini API key unconfigured; serving pre-reviewed deterministic environmental guidance.');
    return deterministicFallbackEngine.generateChatResponse(input.message, payload);
  }

  // 2. Format grounding XML context
  const envXml = formatEnvironmentXml(payload.environment);
  const userXml = formatUserContextXml(payload);
  const prompt = buildSecurePrompt(envXml, userXml, input.message);

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 500) {
      logger.warn('Gemini retry deadline budget exhausted; falling back to deterministic engine', {
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
          return deterministicFallbackEngine.generateChatResponse(input.message, payload);
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
          return deterministicFallbackEngine.generateChatResponse(input.message, payload);
        }

        // Strict schema validation
        const validationResult = assistantChatResponseSchema.safeParse(parsedJson);
        if (!validationResult.success) {
          logger.warn('Gemini output failed Zod schema validation; falling back to deterministic engine', {
            errors: validationResult.error.flatten(),
          });
          return deterministicFallbackEngine.generateChatResponse(input.message, payload);
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

        // Programmatic ground-truth invariant: SQLite snapshot is never live!
        // Lock contextSummary fields to ground truth from payload.environment
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
            modelName,
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
        logger.warn('Configured Gemini model retired, invalid or not found; falling back to deterministic engine', {
          modelName,
          status,
          error: errText.slice(0, 300),
        });
      } else {
        logger.warn('Gemini API error response; falling back to deterministic engine', {
          modelName,
          status,
          attempt: attempt + 1,
          error: errText.slice(0, 300),
        });
      }

      return deterministicFallbackEngine.generateChatResponse(input.message, payload);
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error?.name === 'AbortError') {
        logger.warn('Gemini API call timed out; using deterministic fallback', { timeoutMs });
        return deterministicFallbackEngine.generateChatResponse(input.message, payload);
      }

      // Transient network exception (e.g. socket reset)
      if (attempt < MAX_RETRIES) {
        const timeBudgetRemaining = deadline - Date.now();
        const baseDelay = 1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 400);
        const delayMs = Math.min(baseDelay, 4000);
        if (delayMs < timeBudgetRemaining - 500) {
          logger.warn('Gemini API network exception; retrying within budget', {
            modelName,
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
      return deterministicFallbackEngine.generateChatResponse(input.message, payload);
    }
  }

  return deterministicFallbackEngine.generateChatResponse(input.message, payload);
}
