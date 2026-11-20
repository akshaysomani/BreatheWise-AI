import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { communityService } from '@/services/community.service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser(req);
  const clientIp = getClientIp(req);
  const voterKey = user ? `user_${user.id}` : `ip_${clientIp}`;

  // 1. General burst rate limiting
  const rateLimit = checkRateLimit(`upvote_burst_${voterKey}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many upvote requests.', 429);
  }

  try {
    const { id } = await context.params;

    // 2. Prevent repeated upvotes by the same user or IP on the same report
    const dedupCheck = checkRateLimit(`upvote_dedup_${voterKey}_${id}`, 1, 86_400_000);
    if (!dedupCheck.allowed) {
      return apiError('CONFLICT', 'You have already upvoted this community observation.', 409);
    }

    const result = await communityService.upvoteObservation(id);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, 'POST /api/community/reports/[id]/upvote');
  }
}
