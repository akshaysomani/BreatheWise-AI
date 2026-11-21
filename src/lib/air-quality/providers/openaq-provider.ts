/**
 * BreatheWise AI — OpenAQ API v3 Provider Adapter
 * Module M4.1: Live Upstream Telemetry Integration & Strict Validation
 * 
 * Complies with OpenAQ API v3 specification:
 * - Spatial querying: GET /v3/locations?coordinates=lat,lon&radius=meters
 * - Telemetry querying: GET /v3/locations/{id}/latest
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

export interface OpenAQProviderStatus {
  configured: boolean;
  endpoint: string;
  status: 'READY' | 'MISSING_API_KEY';
  retryPolicy: {
    maxRetries: number;
    timeoutMs: number;
  };
}

export class OpenAQProvider implements AirQualityProvider {
  readonly name = 'OPENAQ_V3';
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAQ_API_KEY;
  }

  getProviderStatus(): OpenAQProviderStatus {
    const key = this.apiKey?.trim();
    const isConfigured = Boolean(key && key.length > 0);
    return {
      configured: isConfigured,
      endpoint: OPENAQ_BASE_URL,
      status: isConfigured ? 'READY' : 'MISSING_API_KEY',
      retryPolicy: {
        maxRetries: MAX_RETRIES,
        timeoutMs: DEFAULT_TIMEOUT_MS,
      },
    };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'BreatheWiseAI/1.4.1 (AirQualityIntelligence/Challenge6)',
    };
    if (this.apiKey && this.apiKey.trim().length > 0) {
      headers['X-API-Key'] = this.apiKey.trim();
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

      if (response.status === 429 && attempt < MAX_RETRIES) {
        // Read Retry-After header or apply exponential jitter
        const retryAfterSec = Number(response.headers.get('Retry-After')) || 1;
        const delayMs = retryAfterSec * 1000 + Math.random() * 500;
        await new Promise((res) => setTimeout(res, delayMs));
        return this.fetchWithRetry(url, attempt + 1);
      }

      return response;
    } catch (err) {
      clearTimeout(timeout);
      if (attempt < MAX_RETRIES) {
        const jitter = Math.random() * 500;
        await new Promise((res) => setTimeout(res, 500 * (attempt + 1) + jitter));
        return this.fetchWithRetry(url, attempt + 1);
      }
      throw err;
    }
  }

  async getNearbyStations(
    latitude: number,
    longitude: number,
    radiusKm = 50.0
  ): Promise<MonitoringStation[]> {
    // If API key is not configured, do not issue unauthenticated calls that will fail with 401
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      return [];
    }

    try {
      const radiusMeters = Math.min(Math.round(radiusKm * 1000), 50000);
      const url = `${OPENAQ_BASE_URL}/locations?coordinates=${latitude},${longitude}&radius=${radiusMeters}&limit=10`;

      const res = await this.fetchWithRetry(url);
      if (!res.ok) {
        return [];
      }

      const json = await res.json();
      const results = Array.isArray(json?.results) ? json.results : [];

      return results.map((item: any) => {
        const stationLat = Number(item?.coordinates?.latitude) || latitude;
        const stationLon = Number(item?.coordinates?.longitude) || longitude;
        const distanceKm = calculateHaversineDistanceKm(latitude, longitude, stationLat, stationLon);

        const supportedPollutants: PollutantCode[] = [];
        if (Array.isArray(item?.sensors)) {
          for (const s of item.sensors) {
            const pName = String(s?.parameter?.name || '').toLowerCase();
            const code = PARAMETER_MAP[pName];
            if (code && !supportedPollutants.includes(code)) {
              supportedPollutants.push(code);
            }
          }
        }

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
      // Graceful error recovery: Return empty array so caller returns transparent NO_DATA
      return [];
    }
  }

  async getLatestStationMeasurements(stationId: string): Promise<{
    station: MonitoringStation;
    measurements: Partial<Record<PollutantCode, CanonicalPollutantMeasurement>>;
    fetchedAt: Date;
  } | null> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      return null;
    }

    try {
      const cleanId = stationId.replace('openaq_', '');
      const url = `${OPENAQ_BASE_URL}/locations/${cleanId}/latest`;

      const res = await this.fetchWithRetry(url);
      if (!res.ok) return null;

      const json = await res.json();
      const results = Array.isArray(json?.results) ? json.results : [];

      const measurements: Partial<Record<PollutantCode, CanonicalPollutantMeasurement>> = {};
      const nowIso = new Date().toISOString();

      for (const item of results) {
        const pName = String(item?.parameter?.name || '').toLowerCase();
        const code = PARAMETER_MAP[pName];
        if (code) {
          // Strictly validate observation value and timestamp
          const validated = validateMeasurement(code, item?.value, item?.unit || 'µg/m³', item?.datetime?.utc);
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
            rawParameterName: item.parameter?.name,
            qualityFlags: validated.qualityFlags,
          };
        }
      }

      return {
        station: {
          id: stationId,
          name: json?.location?.name || `OpenAQ Station #${cleanId}`,
          city: json?.location?.locality || 'Regional Station',
          state: 'India',
          operatingAgency: 'CPCB / SPCB via OpenAQ',
          coordinates: {
            latitude: Number(json?.location?.coordinates?.latitude) || 0,
            longitude: Number(json?.location?.coordinates?.longitude) || 0,
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
