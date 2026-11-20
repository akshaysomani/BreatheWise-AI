import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { communityService } from '@/services/community.service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`upvote_${clientIp}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many upvote requests.', 429);
  }

  try {
    const { id } = await context.params;
    const result = await communityService.upvoteObservation(id);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, 'POST /api/community/reports/[id]/upvote');
  }
}
