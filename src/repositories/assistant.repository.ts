import prisma from '@/lib/db';

export const assistantRepository = {
  /**
   * Creates a new conversation thread for the authenticated user.
   */
  async createConversation(userId: string, title = 'Environmental Consultation') {
    return prisma.conversation.create({
      data: {
        userId,
        title,
      },
    });
  },

  /**
   * Retrieves conversation summaries for the authenticated user.
   */
  async getUserConversations(userId: string, limit = 20) {
    return prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(limit, 50),
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Preview latest message
        },
      },
    });
  },

  /**
   * Retrieves a single conversation with all messages, strictly verifying ownership.
   */
  async getConversationById(userId: string, conversationId: string) {
    return prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId, // Horizontal privilege escalation defense
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  /**
   * Deletes a conversation owned by the authenticated user with cascade message deletion.
   */
  async deleteConversation(userId: string, conversationId: string) {
    // Verify ownership before deleting
    const existing = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!existing) {
      return null;
    }

    return prisma.conversation.delete({
      where: { id: conversationId },
    });
  },

  /**
   * Adds a message to an existing conversation.
   */
  async addMessage(
    conversationId: string,
    role: 'USER' | 'ASSISTANT' | 'SYSTEM',
    content: string,
    metadataJson?: string | null
  ) {
    // Touch conversation updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return prisma.conversationMessage.create({
      data: {
        conversationId,
        role,
        content,
        metadataJson: metadataJson || null,
      },
    });
  },

  /**
   * Records user feedback on a recommendation.
   */
  async recordFeedback(
    userId: string,
    isHelpful: boolean,
    recommendationId?: string | null,
    feedbackReason?: string | null
  ) {
    return prisma.recommendationFeedback.create({
      data: {
        userId,
        recommendationId: recommendationId || null,
        isHelpful,
        feedbackReason: feedbackReason || null,
      },
    });
  },
};
