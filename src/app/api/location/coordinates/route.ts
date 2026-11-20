import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { coordinatesQuerySchema } from '@/lib/validations';
import { communityService } from '@/services/community.service';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`location_${ip}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many location requests.', 429);
  }

  try {
    const { searchParams } = new URL(req.url);
    const parsed = coordinatesQuerySchema.parse({
      lat: searchParams.get('lat'),
      lon: searchParams.get('lon'),
      city: searchParams.get('city') || undefined,
    });

    const fuzzed = communityService.fuzzCoordinates(parsed.lat, parsed.lon);

    return apiSuccess({
      verifiedCoordinates: {
        latitude: parsed.lat,
        longitude: parsed.lon,
      },
      privacyFuzzedCoordinates: {
        latitude: fuzzed.fuzzedLatitude,
        longitude: fuzzed.fuzzedLongitude,
        precision: '~1.1 km neighborhood centroid',
      },
      city: parsed.city || 'Coordinates Pinpoint',
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/location/coordinates');
  }
}
