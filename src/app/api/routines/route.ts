import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { routineService } from '@/services/routine.service';
import { createRoutineSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to view saved commute routines.', 401);
  }

  const rateLimit = checkRateLimit(`routine_get_${user.id}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many routine requests.', 429);
  }

  try {
    const routines = await routineService.getUserRoutines(user.id);
    return apiSuccess({ routines });
  } catch (error) {
    return handleApiError(error, 'GET /api/routines');
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to save a commute routine.', 401);
  }

  const rateLimit = checkRateLimit(`routine_post_${user.id}`, 20, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many routine updates.', 429);
  }

  try {
    const body = await req.json();
    const validated = createRoutineSchema.parse(body);

    const routine = await routineService.createRoutine(user.id, validated);
    return apiSuccess(routine, undefined, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/routines');
  }
}
