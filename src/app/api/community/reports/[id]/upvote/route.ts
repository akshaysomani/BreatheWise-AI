import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { communityService } from '@/services/community.service';
import { checkRateLimit } from '@/lib/rate-limiter';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  // 1. Enforce authentication: anonymous upvoting is strictly disabled to prevent sybil/header-spoofing attacks (M8.3 / M7-002)
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to upvote community reports.', 401);
  }

  // 2. General burst rate limiting per authenticated user
  const rateLimit = checkRateLimit(`upvote_burst_${user.id}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many upvote requests.', 429);
  }

  try {
    const { id } = await context.params;

    // 3. Perform transactional database upvote with composite uniqueness constraint (reportId + userId)
    const result = await communityService.upvoteObservation(id, user.id);
    return apiSuccess(result);
  } catch (error: any) {
    if (
      error?.code === 'ALREADY_UPVOTED' ||
      error?.code === 'P2002' ||
      error?.message?.includes('already upvoted')
    ) {
      return apiError('CONFLICT', 'You have already upvoted this community observation.', 409);
    }
    if (
      error?.message?.includes('quarantined') ||
      error?.message?.includes('non-active')
    ) {
      return apiError('BAD_REQUEST', 'Cannot upvote quarantined or non-active observation.', 400);
    }
    return handleApiError(error, 'POST /api/community/reports/[id]/upvote');
  }
}
