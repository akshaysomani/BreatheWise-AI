import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { recommendationRepository } from '@/repositories/recommendation.repository';
import { explainableRecommendationSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to access personalized recommendations.', 401);
  }

  const rateLimit = checkRateLimit(`rec_get_${user.id}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many recommendation requests.', 429);
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;

  try {
    const records = await recommendationRepository.getByUser(user.id, category, 20);

    return apiSuccess({
      records,
      explainabilityStandard: '6-Field Scientific Architecture',
      disclaimer: 'Guidance is environmental and preventive; not a clinical medical prescription.',
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/recommendations');
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to store recommendations.', 401);
  }

  const rateLimit = checkRateLimit(`rec_post_${user.id}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many recommendation requests.', 429);
  }

  try {
    const body = await req.json();
    const validated = explainableRecommendationSchema.parse(body);

    const saved = await recommendationRepository.save(user.id, validated);
    return apiSuccess(saved, undefined, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/recommendations');
  }
}
