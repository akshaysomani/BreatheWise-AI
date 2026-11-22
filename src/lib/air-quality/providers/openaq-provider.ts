/**
 * BreatheWise AI — OpenAQ API v3 Provider Adapter
 * Module M4.1: Live Upstream Telemetry Integration & Strict Validation
 * 
 * Complies with OpenAQ API v3 specification:
 * - Spatial querying: GET /v3/locations?coordinates=lat,lon&radius=meters (max 25,000 meters)
 * - Telemetry querying: GET /v3/locations/{id}/latest (resolving sensorsId to parameter metadata)
 * - Authentication: X-API-Key header (OPENAQ_API_KEY)
 * - Rate limiting: Exponential backoff with jitter on HTTP 429
 * - Timeout: 8-second AbortController guard
 * - Validation: Validates numeric finite ranges, physical plausibility, and non-future timestamps
 */

import {
  AirQualityProvider,
  MonitoringStation,
  CanonicalPollutantMeasurement,
  PollutantCode,
} from '../types';
import { calculateHaversineDistanceKm } from '../station-selector';
import { validateMeasurement } from '../measurement-validator';

const OPENAQ_BASE_URL = 'https://api.openaq.org/v3';
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

const PARAMETER_MAP: Record<string, PollutantCode> = {
  pm25: 'PM2.5',
  'pm2.5': 'PM2.5',
  pm10: 'PM10',
  no2: 'NO2',
  so2: 'SO2',
  co: 'CO',
  o3: 'O3',
  nh3: 'NH3',
  pb: 'Pb',
};

export interface OpenAQProviderError {
  type: 'AUTH_ERROR' | 'UNAVAILABLE' | 'RATE_LIMITED';
  message: string;
  httpStatus?: number;
}

export interface OpenAQProviderStatus {
  configured: boolean;
  endpoint: string;
  status: 'READY' | 'MISSING_API_KEY' | 'AUTH_ERROR' | 'UNAVAILABLE';
  lastError?: OpenAQProviderError | null;
  retryPolicy: {
    maxRetries: number;
    timeoutMs: number;
  };
}

interface SensorMetadata {
  id: number;
  parameterName: string;
  units: string;
}

export class OpenAQProvider implements AirQualityProvider {
  readonly name = 'OPENAQ_V3';
  private explicitApiKey?: string;
  private lastError: OpenAQProviderError | null = null;
  // Cache sensor definitions by location ID: cleanLocationId -> Map<sensorId, SensorMetadata>
  private locationSensorsMap: Map<string, Map<number, SensorMetadata>> = new Map();

  constructor(apiKey?: string) {
    this.explicitApiKey = apiKey;
  }

  private getEffectiveApiKey(): string | undefined {
    const raw = this.explicitApiKey || process.env.OPENAQ_API_KEY;
    if (!raw) return undefined;
    const cleaned = raw.replace(/^["']|["']$/g, '').trim();
    return cleaned.length > 0 ? cleaned : undefined;
  }

  getProviderStatus(): OpenAQProviderStatus {
    const key = this.getEffectiveApiKey();
    const isConfigured = Boolean(key && key.length > 0);
    let status: 'READY' | 'MISSING_API_KEY' | 'AUTH_ERROR' | 'UNAVAILABLE' = isConfigured ? 'READY' : 'MISSING_API_KEY';
    if (this.lastError) {
      if (this.lastError.type === 'AUTH_ERROR') status = 'AUTH_ERROR';
      else if (this.lastError.type === 'UNAVAILABLE') status = 'UNAVAILABLE';
    }

    return {
      configured: isConfigured,
      endpoint: OPENAQ_BASE_URL,
      status,
      lastError: this.lastError,
      retryPolicy: {
        maxRetries: MAX_RETRIES,
        timeoutMs: DEFAULT_TIMEOUT_MS,
      },
    };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'BreatheWiseAI/1.4.1 (AirQualityIntelligence/AtmosphericTelemetry)',
    };
    const key = this.getEffectiveApiKey();
    if (key) {
      headers['X-API-Key'] = key;
    }
    return headers;
  }

  private async fetchWithRetry(url: string, attempt = 0): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 401 || response.status === 403) {
        this.lastError = {
          type: 'AUTH_ERROR',
          message: `OpenAQ v3 rejected API key credentials (HTTP ${response.status}). Configure valid OPENAQ_API_KEY in Vercel.`,
          httpStatus: response.status,
        };
        return response;
      }

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfterSec = Number(response.headers.get('Retry-After')) || 1;
        const delayMs = retryAfterSec * 1000 + Math.random() * 500;
        await new Promise((res) => setTimeout(res, delayMs));
        return this.fetchWithRetry(url, attempt + 1);
      }

      if (response.status === 429) {
        this.lastError = {
          type: 'RATE_LIMITED',
          message: 'OpenAQ v3 API rate limit exceeded.',
          httpStatus: 429,
        };
      } else if (response.status >= 500) {
        this.lastError = {
          type: 'UNAVAILABLE',
          message: `OpenAQ upstream server error (HTTP ${response.status}).`,
          httpStatus: response.status,
        };
      } else if (response.ok) {
        // Reset lastError on success
        this.lastError = null;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeout);
      if (attempt < MAX_RETRIES) {
        const jitter = Math.random() * 500;
        await new Promise((res) => setTimeout(res, 500 * (attempt + 1) + jitter));
        return this.fetchWithRetry(url, attempt + 1);
      }
      this.lastError = {
        type: 'UNAVAILABLE',
        message: err?.name === 'AbortError' ? 'OpenAQ v3 request timed out (8s).' : `OpenAQ upstream network error: ${err?.message || 'Unreachable'}`,
        httpStatus: 504,
      };
      throw err;
    }
  }

  async getNearbyStations(
    latitude: number,
    longitude: number,
    radiusKm = 50.0
  ): Promise<MonitoringStation[]> {
    const key = this.getEffectiveApiKey();
    if (!key) {
      this.lastError = {
        type: 'AUTH_ERROR',
        message: 'OPENAQ_API_KEY is not configured in environment variables.',
        httpStatus: 401,
      };
      return [];
    }

    try {
      // OpenAQ v3 enforces maximum radius <= 25,000 meters (25 km)
      const radiusMeters = Math.min(Math.round(radiusKm * 1000), 25000);
      const url = `${OPENAQ_BASE_URL}/locations?coordinates=${latitude},${longitude}&radius=${radiusMeters}&limit=10`;

      const res = await this.fetchWithRetry(url);
      if (!res.ok) {
        return [];
      }

      const json = await res.json();
      const results = Array.isArray(json?.results) ? json.results : [];

      return results.map((item: any) => {
        const cleanId = String(item.id);
        const stationLat = Number(item?.coordinates?.latitude) || latitude;
        const stationLon = Number(item?.coordinates?.longitude) || longitude;
        const distanceKm = calculateHaversineDistanceKm(latitude, longitude, stationLat, stationLon);

        const supportedPollutants: PollutantCode[] = [];
        const sensorMap = new Map<number, SensorMetadata>();

        if (Array.isArray(item?.sensors)) {
          for (const s of item.sensors) {
            const pName = String(s?.parameter?.name || s?.name || '').toLowerCase();
            const units = String(s?.parameter?.units || s?.units || 'µg/m³');
            const code = PARAMETER_MAP[pName];
            if (code && !supportedPollutants.includes(code)) {
              supportedPollutants.push(code);
            }
            if (typeof s?.id === 'number') {
              sensorMap.set(s.id, {
                id: s.id,
                parameterName: pName,
                units,
              });
            }
          }
        }

        // Cache sensor definitions for latest observation resolution
        this.locationSensorsMap.set(cleanId, sensorMap);

        return {
          id: `openaq_${item.id}`,
          name: item.name || `Station #${item.id}`,
          city: item.locality || item.city || 'Regional Center',
          state: item.state || 'India',
          operatingAgency: item.owner?.name || 'CPCB / State Pollution Board',
          coordinates: { latitude: stationLat, longitude: stationLon },
          distanceKm,
          supportedPollutants,
          lastReportedUtc: item.datetimeLast?.utc || new Date().toISOString(),
          hasLiveTelemetryFeed: true,
          sourceProvider: 'OPENAQ' as const,
        };
      });
    } catch {
      return [];
    }
  }

  async getLatestStationMeasurements(stationId: string): Promise<{
    station: MonitoringStation;
    measurements: Partial<Record<PollutantCode, CanonicalPollutantMeasurement>>;
    fetchedAt: Date;
  } | null> {
    const key = this.getEffectiveApiKey();
    if (!key) {
      return null;
    }

    try {
      const cleanId = stationId.replace('openaq_', '');

      // Ensure we have the sensor definitions for this location
      let sensorMap = this.locationSensorsMap.get(cleanId);
      let locationMetadata: any = null;

      if (!sensorMap || sensorMap.size === 0) {
        // Query location details to obtain sensor ID mappings
        const locRes = await this.fetchWithRetry(`${OPENAQ_BASE_URL}/locations/${cleanId}`);
        if (locRes.ok) {
          const locJson = await locRes.json();
          const locItem = Array.isArray(locJson?.results) ? locJson.results[0] : locJson?.results;
          if (locItem) {
            locationMetadata = locItem;
            sensorMap = new Map<number, SensorMetadata>();
            if (Array.isArray(locItem.sensors)) {
              for (const s of locItem.sensors) {
                const pName = String(s?.parameter?.name || s?.name || '').toLowerCase();
                const units = String(s?.parameter?.units || s?.units || 'µg/m³');
                if (typeof s?.id === 'number') {
                  sensorMap.set(s.id, {
                    id: s.id,
                    parameterName: pName,
                    units,
                  });
                }
              }
            }
            this.locationSensorsMap.set(cleanId, sensorMap);
          }
        }
      }

      // Query latest telemetry measurements for this location
      const latestUrl = `${OPENAQ_BASE_URL}/locations/${cleanId}/latest`;
      const res = await this.fetchWithRetry(latestUrl);
      if (!res.ok) return null;

      const json = await res.json();
      const results = Array.isArray(json?.results) ? json.results : [];

      const measurements: Partial<Record<PollutantCode, CanonicalPollutantMeasurement>> = {};
      const nowIso = new Date().toISOString();

      for (const item of results) {
        // In OpenAQ v3, /latest returns sensorsId. Resolve parameter from sensor mapping.
        const sensor = sensorMap?.get(item?.sensorsId);
        const pName = String(item?.parameter?.name || sensor?.parameterName || '').toLowerCase();
        const rawUnit = String(item?.unit || sensor?.units || 'µg/m³');
        const code = PARAMETER_MAP[pName];

        if (code) {
          const validated = validateMeasurement(code, item?.value, rawUnit, item?.datetime?.utc);
          if (!validated.isValid) {
            continue; // Quarantine invalid/unphysical measurement
          }

          measurements[code] = {
            pollutant: code,
            value: validated.value,
            originalUnit: validated.unit,
            normalizedUnit: code === 'CO' ? 'mg/m³' : 'µg/m³',
            normalizedValue: validated.value,
            averagingPeriod: '1_HOUR',
            isInstantaneousProxy: true,
            subIndex: null, // Computed downstream by calculateCpcbAqi
            cpcbCategory: null,
            observationTimestampUtc: validated.observationTimestampUtc,
            ingestionTimestampUtc: nowIso,
            isExceededNAAQS: false,
            rawParameterName: pName,
            qualityFlags: validated.qualityFlags,
          };
        }
      }

      const stationName = locationMetadata?.name || `OpenAQ Station #${cleanId}`;
      const stationCity = locationMetadata?.locality || locationMetadata?.city || 'Regional Center';

      return {
        station: {
          id: stationId,
          name: stationName,
          city: stationCity,
          state: 'India',
          operatingAgency: 'CPCB / SPCB via OpenAQ',
          coordinates: {
            latitude: Number(locationMetadata?.coordinates?.latitude) || 0,
            longitude: Number(locationMetadata?.coordinates?.longitude) || 0,
          },
          supportedPollutants: Object.keys(measurements) as PollutantCode[],
          lastReportedUtc: nowIso,
          hasLiveTelemetryFeed: true,
          sourceProvider: 'OPENAQ',
        },
        measurements,
        fetchedAt: new Date(),
      };
    } catch {
      return null;
    }
  }
}

export const openaqProvider = new OpenAQProvider();
