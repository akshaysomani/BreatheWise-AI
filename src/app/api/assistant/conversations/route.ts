import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { assistantService } from '@/services/assistant.service';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to retrieve conversations.', 401);
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const conversations = await assistantService.getUserConversations(user.id, limit);
    return apiSuccess(conversations);
  } catch (error) {
    return handleApiError(error, 'GET /api/assistant/conversations');
  }
}
