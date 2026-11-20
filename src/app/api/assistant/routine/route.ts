import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { checkRateLimit } from '@/lib/rate-limiter';
import { routineGenerateInputSchema } from '@/lib/validations/assistant.schema';
import { assistantService } from '@/services/assistant.service';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to generate a personalized air-quality routine.', 401);
  }

  // Rate Limiting: 10 routine generations per minute
  const rateLimit = checkRateLimit(`routine_${user.id}`, 10, 60_000);
  if (!rateLimit.allowed) {
    return apiError(
      'RATE_LIMIT_EXCEEDED',
      'You have exceeded the routine generation rate limit (max 10 plans per minute). Please wait.',
      429
    );
  }

  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is acceptable
      body = {};
    }

    const validated = routineGenerateInputSchema.parse(body);
    const plan = await assistantService.generateDailyRoutine(user.id, validated);

    return apiSuccess(plan);
  } catch (error) {
    return handleApiError(error, 'POST /api/assistant/routine');
  }
}
