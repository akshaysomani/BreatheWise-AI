import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { coordinatesQuerySchema } from '@/lib/validations';
import { communityService } from '@/services/community.service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

interface CityCentroid {
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  radiusKm: number;
}

const KNOWN_INDIAN_CENTROIDS: CityCentroid[] = [
  { city: 'Ahmedabad', state: 'Gujarat', country: 'India', lat: 23.0225, lon: 72.5714, radiusKm: 35 },
  { city: 'Gandhinagar', state: 'Gujarat', country: 'India', lat: 23.2156, lon: 72.6369, radiusKm: 25 },
  { city: 'Surat', state: 'Gujarat', country: 'India', lat: 21.1702, lon: 72.8311, radiusKm: 30 },
  { city: 'Vadodara', state: 'Gujarat', country: 'India', lat: 22.3072, lon: 73.1812, radiusKm: 25 },
  { city: 'Rajkot', state: 'Gujarat', country: 'India', lat: 22.3039, lon: 70.8022, radiusKm: 25 },
  { city: 'Delhi', state: 'Delhi NCR', country: 'India', lat: 28.6139, lon: 77.209, radiusKm: 35 },
  { city: 'Noida', state: 'Uttar Pradesh', country: 'India', lat: 28.5355, lon: 77.391, radiusKm: 20 },
  { city: 'Gurugram', state: 'Haryana', country: 'India', lat: 28.4595, lon: 77.0266, radiusKm: 25 },
  { city: 'Faridabad', state: 'Haryana', country: 'India', lat: 28.4089, lon: 77.3178, radiusKm: 20 },
  { city: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India', lat: 28.6692, lon: 77.4538, radiusKm: 20 },
  { city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.076, lon: 72.8777, radiusKm: 40 },
  { city: 'Pune', state: 'Maharashtra', country: 'India', lat: 18.5204, lon: 73.8567, radiusKm: 30 },
  { city: 'Bengaluru', state: 'Karnataka', country: 'India', lat: 12.9716, lon: 77.5946, radiusKm: 35 },
  { city: 'Hyderabad', state: 'Telangana', country: 'India', lat: 17.385, lon: 78.4867, radiusKm: 35 },
  { city: 'Chennai', state: 'Tamil Nadu', country: 'India', lat: 13.0827, lon: 80.2707, radiusKm: 30 },
  { city: 'Kolkata', state: 'West Bengal', country: 'India', lat: 22.5726, lon: 88.3639, radiusKm: 35 },
  { city: 'Jaipur', state: 'Rajasthan', country: 'India', lat: 26.9124, lon: 75.7873, radiusKm: 30 },
  { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', lat: 26.8467, lon: 80.9462, radiusKm: 25 },
  { city: 'Chandigarh', state: 'Chandigarh', country: 'India', lat: 30.7333, lon: 76.7794, radiusKm: 20 },
  { city: 'Patna', state: 'Bihar', country: 'India', lat: 25.5941, lon: 85.1376, radiusKm: 25 },
  { city: 'Kanpur', state: 'Uttar Pradesh', country: 'India', lat: 26.4499, lon: 80.3319, radiusKm: 25 },
];

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// In-memory cache for reverse geocoding lookups
const reverseGeocodeCache = new Map<string, { city: string; state: string; country: string }>();

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`location_${clientIp}`, 60, 60_000);
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

    let resolvedCity = parsed.city;
    let resolvedState = 'Regional Zone';
    const resolvedCountry = 'India';
    let resolutionSource = 'USER_PROVIDED';

    // 1. Check known regional centroids first (instant zero-latency matching)
    let closestCentroid: CityCentroid | null = null;
    let minDistanceKm = Infinity;

    for (const centroid of KNOWN_INDIAN_CENTROIDS) {
      const dist = haversineDistanceKm(parsed.lat, parsed.lon, centroid.lat, centroid.lon);
      if (dist < minDistanceKm) {
        minDistanceKm = dist;
        closestCentroid = centroid;
      }
    }

    if (closestCentroid && minDistanceKm <= closestCentroid.radiusKm) {
      resolvedCity = closestCentroid.city;
      resolvedState = closestCentroid.state;
      resolutionSource = 'REGIONAL_CENTROID_PROXIMITY';
    } else if (!resolvedCity) {
      // 2. Fallback: check cache or resolve nearest centroid
      const cacheKey = `${parsed.lat.toFixed(2)},${parsed.lon.toFixed(2)}`;
      if (reverseGeocodeCache.has(cacheKey)) {
        const cached = reverseGeocodeCache.get(cacheKey)!;
        resolvedCity = cached.city;
        resolvedState = cached.state;
        resolutionSource = 'REVERSE_GEOCODE_CACHE';
      } else if (closestCentroid && minDistanceKm <= 120) {
        resolvedCity = closestCentroid.city;
        resolvedState = closestCentroid.state;
        resolutionSource = 'CLOSEST_METROPOLITAN_AREA';
      } else {
        resolvedCity = `Region (${parsed.lat.toFixed(2)}°N, ${parsed.lon.toFixed(2)}°E)`;
        resolutionSource = 'COORDINATE_PINPOINT';
      }
    }

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
      city: resolvedCity,
      state: resolvedState,
      country: resolvedCountry,
      source: resolutionSource,
      nearestHubDistanceKm: minDistanceKm !== Infinity ? Math.round(minDistanceKm * 10) / 10 : undefined,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/location/coordinates');
  }
}
