import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { communityService } from '@/services/community.service';
import {
  createCommunityReportSchema,
  communityQueryFilterSchema,
} from '@/lib/validations/community.schema';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`community_get_${clientIp}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many community feed requests.', 429);
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryParams: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });

    const format = searchParams.get('format')?.toLowerCase();

    const parsedFilter = communityQueryFilterSchema.safeParse(queryParams);
    const filter = parsedFilter.success
      ? parsedFilter.data
      : { lat: 28.61, lon: 77.20, limit: 30, offset: 0, radiusKm: 30 };

    // CSV Export Handler with strict privacy coarsening & formula injection defense (M8.2)
    if (format === 'csv') {
      const csv = await communityService.exportObservationsAsCsv(filter);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="breathewise-community-observations.csv"',
          'Cache-Control': 'no-store',
        },
      });
    }

    // JSON Export Handler with privacy provenance metadata (M8.2)
    if (format === 'export-json' || format === 'json-export') {
      const exportData = await communityService.exportObservationsAsJson(filter);
      return apiSuccess(exportData);
    }

    const { reports, totalCount } = await communityService.getFilteredFeed(filter);

    return apiSuccess({
      reports,
      totalCount,
      privacyPolicy:
        'All community report coordinates are strictly fuzzed to ~1.1 km precision and timestamps are coarsened to the hour (M8.2). Household identities, real names, and exact addresses are never stored or published.',
      scientificDisclaimer:
        'Community observations reflect qualitative citizen reports and are strictly segregated from certified regulatory air station data. isOfficialData is ALWAYS false.',
      isOfficialData: false,
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
