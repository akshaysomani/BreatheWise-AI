import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { householdService } from '@/services/household.service';
import { createHouseholdProfileSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to access household profile.', 401);
  }

  const rateLimit = checkRateLimit(`profile_get_${user.id}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many profile requests.', 429);
  }

  try {
    const profile = await householdService.getProfile(user.id);
    if (!profile) {
      return apiError('NOT_FOUND', 'Household profile not found. Please create one.', 404);
    }

    // Include calculated CADR sizing and vulnerability tier assessment
    const cadr = householdService.calculateCadrRequirements(
      profile.floorAreaSqFt,
      profile.ceilingHeightFt,
      profile.hepaCADR
    );

    const vulnerability = householdService.evaluateVulnerabilityTier(profile.members);

    return apiSuccess({
      profile,
      cadrAnalysis: cadr,
      vulnerabilityAssessment: vulnerability,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/household');
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to create household profile.', 401);
  }

  const rateLimit = checkRateLimit(`profile_post_${user.id}`, 20, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many profile updates.', 429);
  }

  try {
    const body = await req.json();
    const validated = createHouseholdProfileSchema.parse(body);

    const profile = await householdService.saveProfile(user.id, validated);
    return apiSuccess(profile, undefined, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/household');
  }
}
