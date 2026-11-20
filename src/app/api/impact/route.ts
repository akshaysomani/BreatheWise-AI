import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { impactService } from '@/services/impact.service';
import {
  createImpactLogSchema,
  impactQueryFilterSchema,
} from '@/lib/validations/impact.schema';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to access personal impact records.', 401);
  }

  const rateLimit = checkRateLimit(`impact_get_${user.id}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many impact requests.', 429);
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryParams: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });

    const parsedFilter = impactQueryFilterSchema.safeParse(queryParams);
    const filter = parsedFilter.success
      ? parsedFilter.data
      : { format: 'json' as const, limit: 50, offset: 0 };

    // Format check for CSV export
    if (filter.format === 'csv') {
      const csv = await impactService.exportLogsAsCsv(user.id, filter);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="breathewise-impact-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    const [{ logs, totalCount }, aggregates] = await Promise.all([
      impactService.getFilteredLogs(user.id, filter),
      impactService.getAggregates(user.id),
    ]);

    return apiSuccess({
      logs,
      totalCount,
      aggregates,
      standardsProvenance:
        'Calculated using UK DEFRA / DESNZ 2024 Passenger Transport Benchmark Factors, US EPA WARM v15, and India CEA Baseline Database v19.0 (±10% to ±15% explicit uncertainty margins).',
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
