import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { assistantService } from '@/services/assistant.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to view this conversation.', 401);
  }

  const { id } = await params;

  try {
    const conversation = await assistantService.getConversation(user.id, id);
    if (!conversation) {
      return apiError(
        'NOT_FOUND',
        'Conversation thread not found or you do not have permission to access it.',
        404
      );
    }

    return apiSuccess(conversation);
  } catch (error) {
    return handleApiError(error, `GET /api/assistant/conversations/${id}`);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to delete this conversation.', 401);
  }

  const { id } = await params;

  try {
    const deleted = await assistantService.deleteConversation(user.id, id);
    if (!deleted) {
      return apiError(
        'NOT_FOUND',
        'Conversation thread not found or you do not have permission to delete it.',
        404
      );
    }

    return apiSuccess({ deleted: true, id });
  } catch (error) {
    return handleApiError(error, `DELETE /api/assistant/conversations/${id}`);
  }
}
