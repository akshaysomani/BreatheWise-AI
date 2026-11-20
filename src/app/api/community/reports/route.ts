import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { communityService } from '@/services/community.service';
import { createCommunityReportSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`community_get_${clientIp}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many community feed requests.', 429);
  }

  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get('lat') || 28.61);
    const lon = Number(searchParams.get('lon') || 77.20);

    const reports = await communityService.getNearbyObservations(lat, lon);

    return apiSuccess({
      reports,
      privacyPolicy: 'All community report coordinates are strictly fuzzed to ~1.1 km precision to preserve household privacy.',
      scientificDisclaimer: 'Community observations reflect subjective user reports and are strictly segregated from certified regulatory air station data.',
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/community/reports');
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to submit community reports.', 401);
  }

  const rateLimit = checkRateLimit(`community_post_${user.id}`, 10, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many community reports submitted. Please wait.', 429);
  }

  try {
    const body = await req.json();
    const validated = createCommunityReportSchema.parse(body);

    const report = await communityService.submitReport(user.id, validated);
    return apiSuccess(report, undefined, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/community/reports');
  }
}
