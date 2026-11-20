import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { recommendationFeedbackInputSchema } from '@/lib/validations/assistant.schema';
import { assistantService } from '@/services/assistant.service';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to submit feedback.', 401);
  }

  try {
    const body = await req.json();
    const validated = recommendationFeedbackInputSchema.parse(body);

    const feedback = await assistantService.submitFeedback(user.id, validated);
    return apiSuccess(feedback, undefined, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/assistant/feedback');
  }
}
