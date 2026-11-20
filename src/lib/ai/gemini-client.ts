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
 * 3. Bounded Timeouts: Requests abort after timeoutMs (default 8000ms).
 * 4. Token Limiting: maxOutputTokens capped at 1500 to prevent runaway inference.
 * 5. Strict Zod Validation: Validates model JSON output against assistantChatResponseSchema;
 *    if invalid, sanitizes and returns deterministic guidance.
 */

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_OUTPUT_TOKENS = 1500;

export async function generateAssistantResponse(
  input: ChatMessageInput,
  payload: AiContextPayload,
  options: GeminiGenerateOptions = {}
): Promise<AssistantChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const modelName = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      const isModelError =
        response.status === 404 ||
        (response.status === 400 &&
          (errText.toLowerCase().includes('not found') ||
            errText.toLowerCase().includes('deprecated') ||
            errText.toLowerCase().includes('retired') ||
            errText.toLowerCase().includes('discontinued')));

      if (isModelError) {
        logger.warn('Configured Gemini model retired, invalid or not found; falling back to deterministic engine', {
          modelName,
          status: response.status,
          error: errText.slice(0, 300),
        });
      } else {
        logger.warn('Gemini API returned error response; falling back to deterministic engine', {
          modelName,
          status: response.status,
        });
      }
      return deterministicFallbackEngine.generateChatResponse(input.message, payload);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

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
    } catch {
      logger.warn('Failed to parse Gemini JSON output; using fallback');
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

    return validatedResponse;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === 'AbortError') {
      logger.warn('Gemini API call timed out; using deterministic fallback', { timeoutMs });
    } else {
      logger.warn('Gemini API call network/runtime exception; using deterministic fallback');
    }

    return deterministicFallbackEngine.generateChatResponse(input.message, payload);
  }
}
