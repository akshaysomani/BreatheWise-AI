import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { impactService } from '@/services/impact.service';
import { createImpactLogSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to access personal impact records.', 401);
  }

  try {
    const logs = await impactService.getLogs(user.id);
    const aggregates = await impactService.getAggregates(user.id);

    return apiSuccess({
      logs,
      aggregates,
      standardsProvenance: 'Calculated using UK DEFRA & US EPA Standard Light Duty Passenger Factors (±15% uncertainty margin).',
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/impact');
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to record impact savings.', 401);
  }

  const rateLimit = checkRateLimit(`impact_post_${user.id}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many impact entries submitted.', 429);
  }

  try {
    const body = await req.json();
    const validated = createImpactLogSchema.parse(body);

    const log = await impactService.recordLog(user.id, validated);
    return apiSuccess(log, undefined, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/impact');
  }
}
