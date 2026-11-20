import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { checkRateLimit } from '@/lib/rate-limiter';
import { indoorAdviceInputSchema } from '@/lib/validations/assistant.schema';
import { assistantService } from '@/services/assistant.service';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to receive indoor air quality guidance.', 401);
  }

  // Rate Limiting: 15 indoor calculations per minute
  const rateLimit = checkRateLimit(`indoor_${user.id}`, 15, 60_000);
  if (!rateLimit.allowed) {
    return apiError(
      'RATE_LIMIT_EXCEEDED',
      'You have exceeded the indoor advisor calculation rate limit. Please wait.',
      429
    );
  }

  try {
    const body = await req.json();
    const validated = indoorAdviceInputSchema.parse(body);

    const report = await assistantService.generateIndoorAdvice(user.id, validated);
    return apiSuccess(report);
  } catch (error) {
    return handleApiError(error, 'POST /api/assistant/indoor-advice');
  }
}
