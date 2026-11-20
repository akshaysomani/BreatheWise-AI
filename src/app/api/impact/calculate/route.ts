import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { liveCalculateSchema } from '@/lib/validations/impact.schema';
import { impactService } from '@/services/impact.service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`calc_post_${clientIp}`, 120, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many calculation requests.', 429);
  }

  try {
    const body = await req.json();
    const validated = liveCalculateSchema.parse(body);

    if (validated.domain === 'TRANSPORT') {
      const result = impactService.calculateTransitSavings(
        validated.distanceKm,
        validated.baselineMode,
        validated.optimizedMode,
        validated.customOccupancy
      );
      return apiSuccess(result);
    }

    if (validated.domain === 'WASTE') {
      const result = impactService.calculateWasteSavings(
        validated.wasteType,
        validated.quantityKg
      );
      return apiSuccess(result);
    }

    if (validated.domain === 'ENERGY') {
      const result = impactService.calculateEnergySavings(
        validated.kwhSaved,
        validated.gridRegion,
        validated.actionType
      );
      return apiSuccess(result);
    }

    return apiError('INVALID_INPUT', 'Unsupported calculation domain', 400);
  } catch (error) {
    return handleApiError(error, 'POST /api/impact/calculate');
  }
}
