import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { coordinatesQuerySchema } from '@/lib/validations';
import { airQualityService } from '@/services/air-quality.service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

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

    const result = await airQualityService.getAirQuality(parsed.lat, parsed.lon, parsed.city);

    if (result.status === 'NO_NEARBY_STATION') {
      return apiSuccess({
        status: 'NO_NEARBY_STATION',
        isLiveExternalFeed: false,
        notice: result.notice,
        requestedCoordinates: {
          latitude: parsed.lat,
          longitude: parsed.lon,
        },
        station: null,
        cpcbAqi: null,
      });
    }

    if (result.status === 'PROVIDER_ERROR' && !result.data) {
      return apiError('PROVIDER_UNAVAILABLE', result.notice || 'Air quality upstream telemetry is unavailable.', 503);
    }

    const d = result.data!;
    return apiSuccess({
      status: 'SUCCESS',
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
      ...d,
      notice: result.notice,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/aqi');
  }
}
