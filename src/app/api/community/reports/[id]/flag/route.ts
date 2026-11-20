import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { communityService } from '@/services/community.service';
import { flagCommunityReportSchema } from '@/lib/validations/community.schema';
import { checkRateLimit } from '@/lib/rate-limiter';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to report observations.', 401);
  }

  const rateLimit = checkRateLimit(`flag_${user.id}`, 20, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many flag requests.', 429);
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const validated = flagCommunityReportSchema.parse(body);

    const result = await communityService.flagObservation(id, validated);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, 'POST /api/community/reports/[id]/flag');
  }
}
