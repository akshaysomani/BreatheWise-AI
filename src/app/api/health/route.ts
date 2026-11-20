import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`health_${clientIp}`, 120, 60_000);

  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many health check requests.', 429);
  }

  try {
    const startTime = Date.now();

    // Verify real database connectivity via lightweight query
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;

    return apiSuccess(
      {
        status: 'healthy',
        database: {
          status: 'connected',
          latencyMs,
          engine: 'sqlite',
        },
        service: 'BreatheWise AI Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
      undefined,
      200,
      {
        'Cache-Control': 'no-store, max-age=0',
      }
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/health');
  }
}
