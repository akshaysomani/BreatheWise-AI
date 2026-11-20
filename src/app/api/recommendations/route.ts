import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { recommendationRepository } from '@/repositories/recommendation.repository';
import { explainableRecommendationSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;

  const user = await getSessionUser(req);
  const userId = user ? user.id : 'dev-unauthenticated-preview';

  try {
    const records = await recommendationRepository.getByUser(userId, category, 20);

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
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`rec_post_${ip}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many recommendation requests.', 429);
  }

  const user = await getSessionUser(req);
  const userId = user ? user.id : null;

  try {
    const body = await req.json();
    const validated = explainableRecommendationSchema.parse(body);

    const saved = await recommendationRepository.save(userId, validated);
    return apiSuccess(saved, undefined, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/recommendations');
  }
}
