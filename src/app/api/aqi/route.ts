import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { coordinatesQuerySchema } from '@/lib/validations';
import { airQualityService } from '@/services/air-quality.service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { quantizeCoordinates } from '@/lib/air-quality/station-selector';

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`aqi_${clientIp}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many air quality queries. Please wait a moment.', 429);
  }

  try {
    const { searchParams } = new URL(req.url);
    const parsed = coordinatesQuerySchema.parse({
      lat: searchParams.get('lat'),
      lon: searchParams.get('lon'),
      city: searchParams.get('city') || undefined,
    });

    // Check optional fixture flag (only permitted in non-production)
    const allowFixture = searchParams.get('fixture') === 'true' && process.env.NODE_ENV !== 'production';

    const result = await airQualityService.getAirQuality(parsed.lat, parsed.lon, parsed.city, {
      allowFixture,
    });

    // Privacy protection: Return privacy-quantized coordinates (~1.1 km precision)
    const sanitizedCoords = quantizeCoordinates(parsed.lat, parsed.lon);

    if (result.status === 'NO_NEARBY_STATION') {
      return apiSuccess({
        status: 'NO_NEARBY_STATION',
        provenanceStatus: 'NO_DATA',
        isLiveExternalFeed: false,
        notice: result.notice,
        requestedCoordinates: sanitizedCoords,
        station: null,
        cpcbAqi: null,
      });
    }

    if (result.status === 'NO_DATA') {
      return apiSuccess({
        status: 'NO_DATA',
        provenanceStatus: 'NO_DATA',
        isLiveExternalFeed: false,
        notice: result.notice,
        requestedCoordinates: sanitizedCoords,
        station: null,
        cpcbAqi: null,
      });
    }

    if (result.status === 'PROVIDER_ERROR' && !result.data) {
      return apiError('PROVIDER_UNAVAILABLE', result.notice || 'Air quality upstream telemetry is unavailable.', 503);
    }

    const d = result.data!;
    return apiSuccess({
      ...d,
      status: 'SUCCESS',
      provenanceStatus: d.status,
      isLiveExternalFeed: d.attribution?.isLiveFeed ?? false,
      source: d.attribution?.provider,
      stationName: d.station?.name,
      aqi: d.cpcbAqi?.aqi,
      category: d.cpcbAqi?.category,
      dominantPollutant: d.cpcbAqi?.dominantPollutant,
      pollutants: {
        pm25: { value: d.measurements['PM2.5']?.normalizedValue ?? null, unit: 'µg/m³' },
        pm10: { value: d.measurements['PM10']?.normalizedValue ?? null, unit: 'µg/m³' },
        no2: { value: d.measurements['NO2']?.normalizedValue ?? null, unit: 'µg/m³' },
        o3: { value: d.measurements['O3']?.normalizedValue ?? null, unit: 'µg/m³' },
        so2: { value: d.measurements['SO2']?.normalizedValue ?? null, unit: 'µg/m³' },
        co: { value: d.measurements['CO']?.normalizedValue ?? null, unit: 'mg/m³' },
        nh3: { value: d.measurements['NH3']?.normalizedValue ?? null, unit: 'µg/m³' },
        pb: { value: d.measurements['Pb']?.normalizedValue ?? null, unit: 'µg/m³' },
      },
      requestedCoordinates: sanitizedCoords,
      notice: result.notice,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/aqi');
  }
}
