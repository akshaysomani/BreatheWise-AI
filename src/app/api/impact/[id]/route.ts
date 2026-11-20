import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { impactService } from '@/services/impact.service';
import { updateImpactLogSchema } from '@/lib/validations/impact.schema';
import { checkRateLimit } from '@/lib/rate-limiter';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required.', 401);
  }

  try {
    const { id } = await context.params;
    const log = await impactService.getLogById(id, user.id);

    if (!log) {
      return apiError('NOT_FOUND', 'Impact log not found or access denied.', 404);
    }

    return apiSuccess(log);
  } catch (error) {
    return handleApiError(error, 'GET /api/impact/[id]');
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required.', 401);
  }

  const rateLimit = checkRateLimit(`impact_put_${user.id}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many requests.', 429);
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const validated = updateImpactLogSchema.parse(body);

    const updated = await impactService.updateLog(id, user.id, validated);
    if (!updated) {
      return apiError('NOT_FOUND', 'Impact log not found or unauthorized to edit.', 404);
    }

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error, 'PUT /api/impact/[id]');
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required.', 401);
  }

  const rateLimit = checkRateLimit(`impact_del_${user.id}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many requests.', 429);
  }

  try {
    const { id } = await context.params;
    const success = await impactService.deleteLog(id, user.id);

    if (!success) {
      return apiError('NOT_FOUND', 'Impact log not found or unauthorized to delete.', 404);
    }

    return apiSuccess({ deleted: true, id });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/impact/[id]');
  }
}
