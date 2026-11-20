/**
 * BreatheWise AI — Air Quality Intelligence Data Architecture
 * Module M4.1: Canonical Types, Provenance Model & Provider Interfaces
 * 
 * Complies with official Central Pollution Control Board (CPCB) India
 * National Air Quality Index (NAQI) technical standards (2014/2015).
 */

export type PollutantCode = 'PM2.5' | 'PM10' | 'NO2' | 'SO2' | 'CO' | 'O3' | 'NH3' | 'Pb';

export type AveragingPeriod = '1_HOUR' | '8_HOUR' | '24_HOUR';

export type FreshnessState =
  | 'CURRENT'             // < 2 hours old
  | 'AGING'               // 2 to 4 hours old
  | 'STALE'               // 4 to 24 hours old
  | 'MISSING'             // > 24 hours old or no measurement reported
  | 'INVALID'             // Out of range or negative concentration
  | 'PROVIDER_UNAVAILABLE'// Upstream provider timeout/error
  | 'INSUFFICIENT_DATA';  // Does not satisfy CPCB >=3 criteria rule

export type TelemetryProvenanceStatus =
  | 'LIVE'      // Valid fresh provider observation meeting freshness policy (< 2 hours)
  | 'CACHED'    // Previously retrieved observation served from cache within valid TTL
  | 'STALE'     // Observation exceeds freshness threshold (>= 4 hours)
  | 'MOCK'      // Test or fixture measurement (HARD BLOCKED in production)
  | 'NO_DATA';  // No suitable validated observation is available

export type CpcbCategory =
  | 'GOOD'                // 0 - 50
  | 'SATISFACTORY'         // 51 - 100
  | 'MODERATELY_POLLUTED' // 101 - 200
  | 'POOR'                // 201 - 300
  | 'VERY_POOR'           // 301 - 400
  | 'SEVERE';             // 401 - 500+

export interface CanonicalPollutantMeasurement {
  pollutant: PollutantCode;
  value: number; // Raw measured numeric concentration
  originalUnit: string; // e.g., 'µg/m³', 'mg/m³', 'ppm'
  normalizedUnit: 'µg/m³' | 'mg/m³'; // CO is normalized to mg/m³, all other 7 pollutants to µg/m³
  normalizedValue: number; // Truncated / converted numeric value used for sub-index
  averagingPeriod: AveragingPeriod;
  isInstantaneousProxy: boolean; // True when 1-hr acute concentration is evaluated against 24-hr CPCB table
  subIndex: number | null; // CPCB Sub-Index (0 to 500+) or null if out of range / invalid
  cpcbCategory: CpcbCategory | null;
  observationTimestampUtc: string; // When the physical instrument took the reading
  ingestionTimestampUtc: string;   // When BreatheWise ingested it
  isExceededNAAQS: boolean;        // True if exceeding 24-hr/8-hr Indian NAAQS regulatory limits
  rawParameterName?: string;
  qualityFlags?: string[];
}

export interface MonitoringStationCoordinates {
  latitude: number;
  longitude: number;
}

export interface MonitoringStation {
  id: string;
  name: string;
  city: string;
  state: string;
  operatingAgency: string; // e.g., 'CPCB', 'GPCB', 'DPCC'
  coordinates: MonitoringStationCoordinates;
  distanceKm?: number;
  supportedPollutants: PollutantCode[];
  lastReportedUtc?: string;
  hasLiveTelemetryFeed: boolean;
  sourceProvider: 'OPENAQ' | 'CPCB_CAAQMS' | 'DATA_GOV_IN' | 'MOCK_FIXTURE';
}

export interface CpcbHealthGuidance {
  shortStatement: string;
  description: string;
  colorHex: string;
  colorClass: string;
  generalPublicAdvice: string;
  sensitiveGroupsAdvice: string;
  indoorGuidance: string;
}

export interface CpcbDataSufficiency {
  isSufficient: boolean;
  pollutantCount: number;
  hasParticulate: boolean; // Must monitor at least one of PM2.5 or PM10 per CPCB rules
  monitoredPollutants: PollutantCode[];
  missingParticulateReason?: string;
  details: string;
}

export interface CpcbAqiResult {
  aqi: number | null; // Overall CPCB AQI (max sub-index) or null if data is insufficient
  category: CpcbCategory | 'INSUFFICIENT_DATA';
  dominantPollutant: PollutantCode | null;
  dominantSubIndex: number | null;
  healthGuidance: CpcbHealthGuidance;
  subIndices: Record<PollutantCode, number | null>;
  dataSufficiency: CpcbDataSufficiency;
  methodology: 'CPCB_NAQI_INDIA_2014';
  averagingNotice: string;
}

export interface TelemetryTimestamps {
  observationTimeUtc: string;     // Exact timestamp when sensor recorded the concentration
  ingestionTimeUtc: string;       // Timestamp when BreatheWise ingested from provider
  retrievalTimeUtc: string;       // Timestamp when client received this response
  cacheTimeUtc?: string;          // Timestamp when local database cache was persisted
  observationLocalTime: string;   // Indian Standard Time (IST / UTC+05:30)
  retrievalLocalTime: string;     // Indian Standard Time (IST / UTC+05:30)
}

export interface CanonicalAirQualityRecord {
  status: TelemetryProvenanceStatus;
  station: MonitoringStation;
  measurements: Record<PollutantCode, CanonicalPollutantMeasurement | null>;
  cpcbAqi: CpcbAqiResult;
  timestamps: TelemetryTimestamps;
  freshness: {
    state: FreshnessState;
    ageMinutes: number;
    isStale: boolean;
    measurementLocalTime?: string;
  };
  attribution: {
    provider: string; // e.g. "OpenAQ v3 / CPCB Network"
    upstreamOwner?: string; // e.g. "Delhi Pollution Control Committee (DPCC)"
    license: string; // e.g. "Open Database License (ODbL) / Government Open Data License (GODL) India"
    attributionUrl: string;
    isLiveFeed: boolean;
    isSimulatedFallback?: boolean;
    notice: string;
  };
}

export interface AirQualityProvider {
  readonly name: string;
  getNearbyStations(latitude: number, longitude: number, radiusKm: number): Promise<MonitoringStation[]>;
  getLatestStationMeasurements(stationId: string): Promise<{
    station: MonitoringStation;
    measurements: Partial<Record<PollutantCode, CanonicalPollutantMeasurement>>;
    fetchedAt: Date;
  } | null>;
}
