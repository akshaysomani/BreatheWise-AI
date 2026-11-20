import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { coordinatesQuerySchema } from '@/lib/validations';
import { airQualityService } from '@/services/air-quality.service';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`aqi_${ip}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many air quality queries.', 429);
  }

  try {
    const { searchParams } = new URL(req.url);
    const parsed = coordinatesQuerySchema.parse({
      lat: searchParams.get('lat'),
      lon: searchParams.get('lon'),
      city: searchParams.get('city') || undefined,
    });

    // In M2: Checks stored database snapshot cache. Live OpenAQ/Copernicus API integration activates in M4.
    const snapshot = await airQualityService.getLatestSnapshot(parsed.lat, parsed.lon);

    if (snapshot) {
      return apiSuccess({
        isLiveExternalFeed: false,
        source: snapshot.sourceProvider,
        stationName: snapshot.stationName,
        aqi: snapshot.aqiValue,
        category: snapshot.aqiCategory,
        dominantPollutant: snapshot.dominantPollutant,
        pollutants: {
          pm25: { value: snapshot.pm25, unit: 'µg/m³' },
          pm10: { value: snapshot.pm10, unit: 'µg/m³' },
          no2: { value: snapshot.no2, unit: 'µg/m³' },
          o3: { value: snapshot.o3, unit: 'µg/m³' },
        },
        measurementTimestamp: snapshot.measurementTimestamp,
        isStale: snapshot.isStale,
        provenanceNotice: 'Retrieved from verified local atmospheric telemetry cache.',
      });
    }

    // Default architectural contract when no snapshot is cached
    return apiSuccess({
      isLiveExternalFeed: false,
      notice: 'Live multi-provider atmospheric telemetry integration activates in Module M4 (OpenAQ v3 & Copernicus CAMS).',
      requestedCoordinates: {
        latitude: parsed.lat,
        longitude: parsed.lon,
      },
      contractStatus: 'READY_FOR_M4_INTEGRATION',
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/aqi');
  }
}
