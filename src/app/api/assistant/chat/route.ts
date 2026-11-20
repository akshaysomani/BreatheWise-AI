import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { checkRateLimit } from '@/lib/rate-limiter';
import { chatMessageInputSchema } from '@/lib/validations/assistant.schema';
import { assistantService } from '@/services/assistant.service';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to interact with BreatheWise AI Assistant.', 401);
  }

  // Rate Limiting: 20 conversational queries per minute per user
  const rateLimit = checkRateLimit(`chat_${user.id}`, 20, 60_000);
  if (!rateLimit.allowed) {
    return apiError(
      'RATE_LIMIT_EXCEEDED',
      'You have exceeded the conversational rate limit (max 20 messages per minute). Please wait a moment.',
      429
    );
  }

  try {
    const body = await req.json();
    const validated = chatMessageInputSchema.parse(body);

    const result = await assistantService.chat(user.id, validated);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, 'POST /api/assistant/chat');
  }
}
