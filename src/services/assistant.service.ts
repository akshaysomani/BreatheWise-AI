import { assistantRepository } from '@/repositories/assistant.repository';
import { recommendationRepository } from '@/repositories/recommendation.repository';
import {
  ChatMessageInput,
  AssistantChatResponse,
  RoutineGenerateInput,
  IndoorAdviceInput,
  RecommendationFeedbackInput,
} from '@/lib/validations/assistant.schema';
import { buildAssistantContext } from '@/lib/ai/context-builder';
import { generateAssistantResponse, getGeminiProviderStatus } from '@/lib/ai/gemini-client';
import { deterministicFallbackEngine } from '@/lib/ai/deterministic-fallback';
import { DailyRoutinePlan, IndoorAdviceReport } from '@/lib/ai/types';
import { logger } from '@/lib/logger';

export const assistantService = {
  /**
   * Processes a conversational interaction for an authenticated user.
   */
  async chat(
    userId: string,
    input: ChatMessageInput
  ): Promise<AssistantChatResponse & { conversationId: string }> {
    // 1. Resolve or create conversation thread with ownership guarantee
    let conversationId = input.conversationId;
    if (conversationId) {
      const existing = await assistantRepository.getConversationById(userId, conversationId);
      if (!existing) {
        // Conversation does not exist or belongs to another user -> start fresh thread
        const newThread = await assistantRepository.createConversation(
          userId,
          input.message.slice(0, 40) + '...'
        );
        conversationId = newThread.id;
      }
    } else {
      const newThread = await assistantRepository.createConversation(
        userId,
        input.message.slice(0, 40) + '...'
      );
      conversationId = newThread.id;
    }

    // 2. Retrieve multi-turn conversation history prior to new message insertion
    const existingThread = await assistantRepository.getConversationById(userId, conversationId);
    const priorMessages = (existingThread?.messages || []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Persist incoming user message
    await assistantRepository.addMessage(conversationId, 'USER', input.message);

    // 3. Assemble trusted, anonymized environmental and household context
    const coords =
      input.latitude !== undefined && input.longitude !== undefined
        ? { lat: input.latitude, lon: input.longitude }
        : undefined;

    const contextPayload = await buildAssistantContext(userId, coords);

    // 4. Generate structured assistant response (Gemini with deterministic fallback grounded in context + history)
    const assistantResult = await generateAssistantResponse(input, contextPayload, {}, priorMessages);

    // 5. Persist each structured recommendation to the database for auditability
    const savedRecIds: string[] = [];
    for (const rec of assistantResult.recommendations) {
      try {
        const saved = await recommendationRepository.save(userId, {
          category: rec.category,
          recommendedAction: rec.action,
          scientificReason: rec.reason,
          expectedBenefit: rec.expectedBenefit,
          quantifiedImpact: rec.measurableImpact || null,
          assumptionsAndUncertainty: `${rec.assumptions} | Uncertainty: ${rec.uncertainty}`,
          implementationSteps: rec.implementationSteps,
          disclaimer: rec.disclaimer,
        });
        savedRecIds.push(saved.id);
      } catch (err) {
        logger.warn('Failed to persist individual recommendation record', { error: err });
      }
    }

    // 6. Persist assistant message in conversation thread
    await assistantRepository.addMessage(
      conversationId,
      'ASSISTANT',
      assistantResult.reply,
      JSON.stringify({
        recommendations: assistantResult.recommendations,
        contextSummary: assistantResult.contextSummary,
        evidenceCitations: assistantResult.evidenceCitations,
        savedRecommendationIds: savedRecIds,
      })
    );

    return {
      ...assistantResult,
      conversationId,
    };
  },

  /**
   * Retrieves conversation summaries for the user.
   */
  async getUserConversations(userId: string, limit = 20) {
    return assistantRepository.getUserConversations(userId, limit);
  },

  /**
   * Retrieves a single conversation thread with ownership validation.
   */
  async getConversation(userId: string, conversationId: string) {
    return assistantRepository.getConversationById(userId, conversationId);
  },

  /**
   * Deletes a conversation thread.
   */
  async deleteConversation(userId: string, conversationId: string) {
    return assistantRepository.deleteConversation(userId, conversationId);
  },

  /**
   * Generates a personalized daily routine plan.
   */
  async generateDailyRoutine(
    userId: string,
    options?: RoutineGenerateInput
  ): Promise<DailyRoutinePlan> {
    const contextPayload = await buildAssistantContext(userId);
    const plan = deterministicFallbackEngine.generateDailyRoutine(contextPayload, options);

    // Persist each routine period as a recommendation record
    for (const p of plan.periods) {
      try {
        await recommendationRepository.save(userId, {
          category: 'DAILY_ROUTINE',
          recommendedAction: `${p.period}: ${p.action}`,
          scientificReason: p.reason,
          expectedBenefit: p.expectedBenefit,
          quantifiedImpact: null,
          assumptionsAndUncertainty: `${p.assumptions} | Uncertainty: ${p.uncertainty}`,
          implementationSteps: p.implementationSteps,
          disclaimer: plan.disclaimer,
        });
      } catch (err) {
        logger.warn('Failed to persist routine period record', { error: err });
      }
    }

    return plan;
  },

  /**
   * Generates structured indoor air quality advisor recommendations.
   */
  async generateIndoorAdvice(
    userId: string,
    input: IndoorAdviceInput
  ): Promise<IndoorAdviceReport> {
    const contextPayload = await buildAssistantContext(userId);
    const report = deterministicFallbackEngine.generateIndoorAdvice(input, contextPayload);

    // Persist recommendations
    for (const rec of report.recommendations) {
      try {
        await recommendationRepository.save(userId, {
          category: 'INDOOR_PURIFICATION',
          recommendedAction: rec.action,
          scientificReason: rec.reason,
          expectedBenefit: rec.expectedBenefit,
          quantifiedImpact: rec.measurableImpact || null,
          assumptionsAndUncertainty: `${rec.assumptions} | Uncertainty: ${rec.uncertainty}`,
          implementationSteps: rec.implementationSteps,
          disclaimer: rec.disclaimer,
        });
      } catch (err) {
        logger.warn('Failed to persist indoor advice record', { error: err });
      }
    }

    return report;
  },

  /**
   * Submits feedback for a recommendation.
   */
  async submitFeedback(userId: string, input: RecommendationFeedbackInput) {
    return assistantRepository.recordFeedback(
      userId,
      input.isHelpful,
      input.recommendationId,
      input.feedbackReason
    );
  },

  /**
   * Retrieves operational status and configuration validity of the AI service.
   */
  getAiStatus() {
    return getGeminiProviderStatus();
  },
};
