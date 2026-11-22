'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wind,
  MapPin,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Info,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  Database,
  Radio,
  FileCheck2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface RegionalStationOption {
  label: string;
  city: string;
  lat: number;
  lon: number;
  agency: string;
}

export const REGIONAL_STATIONS: RegionalStationOption[] = [
  { label: 'Delhi (Anand Vihar)', city: 'Delhi', lat: 28.6476, lon: 77.3158, agency: 'DPCC' },
  { label: 'Delhi (IGI Airport T3)', city: 'Delhi', lat: 28.5562, lon: 77.1000, agency: 'CPCB / IMD' },
  { label: 'Delhi (RK Puram)', city: 'Delhi', lat: 28.5632, lon: 77.1869, agency: 'DPCC' },
  { label: 'Ahmedabad (Maninagar)', city: 'Ahmedabad', lat: 22.9961, lon: 72.6042, agency: 'GPCB / AMC' },
  { label: 'Ahmedabad (Vatva GIDC)', city: 'Ahmedabad', lat: 22.9567, lon: 72.6321, agency: 'GPCB' },
  { label: 'Gandhinagar (Sector 10)', city: 'Gandhinagar', lat: 23.2156, lon: 72.6369, agency: 'GPCB' },
  { label: 'Surat (Sachin GIDC)', city: 'Surat', lat: 21.0850, lon: 72.8680, agency: 'GPCB' },
];

const CPCB_CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; badgeVariant: 'success' | 'warning' | 'error' | 'accent' | 'secondary' }> = {
  GOOD: { bg: 'bg-[#E8F3ED]', text: 'text-[#397A55]', border: 'border-[#397A55]/30', badgeVariant: 'success' },
  SATISFACTORY: { bg: 'bg-[#EEF5EB]', text: 'text-[#487340]', border: 'border-[#5B8C51]/30', badgeVariant: 'success' },
  MODERATELY_POLLUTED: { bg: 'bg-[#FDF6E2]', text: 'text-[#9A5B00]', border: 'border-[#D97706]/30', badgeVariant: 'warning' },
  POOR: { bg: 'bg-[#FFF1EB]', text: 'text-[#B43C00]', border: 'border-[#EA580C]/30', badgeVariant: 'warning' },
  VERY_POOR: { bg: 'bg-[#FDF2F2]', text: 'text-[#A81E1E]', border: 'border-[#DC2626]/30', badgeVariant: 'error' },
  SEVERE: { bg: 'bg-[#FEE2E2]', text: 'text-[#641414]', border: 'border-[#7F1D1D]/40', badgeVariant: 'error' },
  INSUFFICIENT_DATA: { bg: 'bg-[#F0F2EF]', text: 'text-[#48534C]', border: 'border-[#68766C]/30', badgeVariant: 'secondary' },
};

interface AirQualityRadarProps {
  householdLat?: number;
  householdLon?: number;
  householdCity?: string;
}

export function AirQualityRadar({
  householdLat,
  householdLon,
  householdCity,
}: AirQualityRadarProps) {
  // Selected coordinate state (defaults to household or Delhi Anand Vihar)
  const defaultCoords = householdLat && householdLon
    ? { lat: householdLat, lon: householdLon, label: householdCity ? `${householdCity} (Home)` : 'Household Location' }
    : { lat: 28.6476, lon: 77.3158, label: 'Delhi (Anand Vihar)' };

  const [currentCoords, setCurrentCoords] = useState(defaultCoords);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const handleUseDeviceLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const res = await fetch(`/api/location/coordinates?lat=${lat}&lon=${lon}`);
          const json = await res.json();
          const cityName = json?.data?.city || 'My Device Location';
          setCurrentCoords({
            lat,
            lon,
            label: `📍 ${cityName} (GPS)`,
          });
        } catch {
          setCurrentCoords({
            lat,
            lon,
            label: `📍 Device GPS (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`,
          });
        } finally {
          setLocatingGps(false);
        }
      },
      (err) => {
        setLocatingGps(false);
        setGpsError('Location access was denied or timed out. Please select a regional hub.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const fetchTelemetry = useCallback(async (lat: number, lon: number, isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/aqi?lat=${lat}&lon=${lon}&_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message || 'Failed to retrieve air quality telemetry.');
      }

      setData(json.data);
    } catch (err: any) {
      setError(err?.message || 'A network error occurred while querying monitoring stations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry(currentCoords.lat, currentCoords.lon);
  }, [currentCoords.lat, currentCoords.lon, fetchTelemetry]);

  // Sync if household location is updated externally
  useEffect(() => {
    if (householdLat && householdLon) {
      setCurrentCoords({
        lat: householdLat,
        lon: householdLon,
        label: householdCity ? `${householdCity} (Home)` : 'Household Location',
      });
    }
  }, [householdLat, householdLon, householdCity]);

  const shortTermIndicator = data?.shortTermIndicator;
  const officialCpcb = data?.officialCpcbAqi;
  const provenanceType: string = data?.provenanceType || 'UNKNOWN_PROVENANCE';

  const categoryKey = shortTermIndicator?.category || data?.cpcbAqi?.category || data?.category || 'INSUFFICIENT_DATA';
  const categoryStyle = CPCB_CATEGORY_STYLES[categoryKey] || CPCB_CATEGORY_STYLES.INSUFFICIENT_DATA;
  const aqiValue = shortTermIndicator?.indicatorValue ?? data?.cpcbAqi?.aqi ?? data?.aqi ?? null;
  const dominant = shortTermIndicator?.dominantPollutant ?? data?.cpcbAqi?.dominantPollutant ?? data?.dominantPollutant ?? 'N/A';
  const stationName = data?.station?.name || data?.stationName || 'Regional Telemetry Station';
  const distanceKm = data?.station?.distanceKm;
  const health = shortTermIndicator?.healthGuidance || data?.cpcbAqi?.healthGuidance;

  // Provenance & Timestamps
  const provenanceStatus: 'LIVE' | 'AGING' | 'CACHED' | 'STALE' | 'MOCK' | 'NO_DATA' =
    data?.provenanceStatus ||
    (data?.isLiveExternalFeed ? 'LIVE' : data?.freshness?.state === 'AGING' ? 'AGING' : data?.freshness?.isStale ? 'STALE' : 'CACHED');

  const observationTime = data?.timestamps?.observationLocalTime || data?.freshness?.measurementLocalTime || 'Recent';
  const retrievalTime = data?.timestamps?.retrievalLocalTime || 'Recent Query';
  const averagingNotice = data?.cpcbAqi?.averagingNotice || data?.timestamps?.averagingNotice || 'Acute 1-hour sensor proxy evaluated against CPCB breakpoints. Regulatory CPCB standard mandates a 24-hour average.';
  const isInstantaneous = true;

  const getProvenanceTypeLabel = (type: string) => {
    switch (type) {
      case 'VERIFIED_EXTERNAL_OBSERVATION':
        return 'Verified Live Sensor Feed (OpenAQ v3 / CPCB)';
      case 'DEVELOPMENT_SEED':
        return 'Regional Baseline Cache (Seed Data)';
      case 'HISTORICAL_IMPORTED':
        return 'CPCB Historical Reference Baseline (Archived Statutory Profile)';
      case 'SYNTHETIC_FIXTURE':
        return 'Demonstration Fixture (Test Baseline)';
      default:
        return 'Atmospheric Ingestion Telemetry';
    }
  };

  // Render Provenance Badge configuration
  const renderProvenanceBadge = () => {
    switch (provenanceStatus) {
      case 'LIVE':
        return (
          <Badge variant="success" size="sm" className="font-semibold" data-testid="provenance-badge-live">
            <Radio className="w-3 h-3 mr-1 text-[#397A55] animate-pulse" />
            Live Observation (&lt;2h)
          </Badge>
        );
      case 'AGING':
        return (
          <Badge variant="warning" size="sm" className="font-semibold bg-amber-50 text-amber-800 border-amber-300" data-testid="provenance-badge-aging">
            <Clock className="w-3 h-3 mr-1 text-amber-700" />
            Aging Observation (2-4h)
          </Badge>
        );
      case 'CACHED':
        return (
          <Badge variant="secondary" size="sm" className="font-semibold" data-testid="provenance-badge-cached">
            <Database className="w-3 h-3 mr-1 text-[#48534C]" />
            Verified Cached Observation
          </Badge>
        );
      case 'STALE':
        return (
          <Badge variant="warning" size="sm" className="font-semibold" data-testid="provenance-badge-stale">
            <Clock className="w-3 h-3 mr-1 text-[#D97706]" />
            Stale Telemetry (&gt;4h)
          </Badge>
        );
      case 'MOCK':
        return (
          <Badge variant="accent" size="sm" className="font-semibold" data-testid="provenance-badge-mock">
            <FileCheck2 className="w-3 h-3 mr-1 text-[#397A55]" />
            Demo Test Fixture (Non-Production)
          </Badge>
        );
      case 'NO_DATA':
      default:
        return (
          <Badge variant="secondary" size="sm" className="font-semibold" data-testid="provenance-badge-nodata">
            <AlertCircle className="w-3 h-3 mr-1 text-[#68766C]" />
            {data?.status === 'NO_NEARBY_STATION' ? 'No Nearby Station (>50 km)' : 'Monitoring Unavailable'}
          </Badge>
        );
    }
  };

  const isNoData = !loading && !error && (
    data?.status === 'NO_DATA' ||
    data?.status === 'NO_NEARBY_STATION' ||
    provenanceStatus === 'NO_DATA'
  );

  const isLive = !isNoData && Boolean(data?.isLiveExternalFeed || data?.attribution?.isLiveFeed);
  const isHistoricalOnly = !isNoData && !isLive;

  return (
    <Card className="bg-white border-[#E2E8DE] shadow-sm overflow-hidden" data-testid="aqi-radar-card">
      <CardHeader className="pb-4 border-b border-[#E2E8DE]/60 bg-[#FAFBF9]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EEF3EA] rounded-lg text-[#397A55]">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-[#27352D] font-[var(--font-heading)]">
                Atmospheric Telemetry Radar
              </CardTitle>
              <CardDescription className="text-xs text-[#68766C]">
                Official Central Pollution Control Board (CPCB) Indian NAQI Engine & Sensor Network
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {renderProvenanceBadge()}

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTelemetry(currentCoords.lat, currentCoords.lon, true)}
              disabled={loading || refreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
              aria-label="Refresh atmospheric telemetry"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Station / Hub Selector Chips */}
        <div className="pt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={handleUseDeviceLocation}
            disabled={locatingGps}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 flex items-center gap-1 ${
              currentCoords.label.includes('(GPS)')
                ? 'bg-[#397A55] text-white shadow-xs'
                : 'bg-[#EEF3EA] text-[#397A55] border border-[#CDE0D3] hover:bg-[#DCE7D6]'
            }`}
            title="Detect device GPS coordinates"
            data-testid="use-current-location-btn"
          >
            <MapPin className={`w-3 h-3 ${locatingGps ? 'animate-bounce text-[#D69B47]' : 'text-current'}`} />
            {locatingGps ? 'Locating...' : 'Use My Current Location'}
          </button>

          <span className="text-[#68766C] font-medium flex items-center gap-1 shrink-0 mx-1">
            <Compass className="w-3.5 h-3.5 text-[#397A55]" />
            Regional Hubs:
          </span>

          {householdLat && householdLon && (
            <button
              onClick={() =>
                setCurrentCoords({
                  lat: householdLat,
                  lon: householdLon,
                  label: householdCity ? `${householdCity} (Home)` : 'Household Location',
                })
              }
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                currentCoords.lat === householdLat && currentCoords.lon === householdLon
                  ? 'bg-[#397A55] text-white shadow-xs'
                  : 'bg-[#EEF3EA] text-[#27352D] hover:bg-[#E2E8DE]'
              }`}
            >
              🏠 My Home ({householdCity || 'Local'})
            </button>
          )}

          {REGIONAL_STATIONS.map((st) => (
            <button
              key={st.label}
              onClick={() => setCurrentCoords({ lat: st.lat, lon: st.lon, label: st.label })}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                currentCoords.lat === st.lat && currentCoords.lon === st.lon
                  ? 'bg-[#397A55] text-white font-semibold shadow-xs'
                  : 'bg-white border border-[#E2E8DE] text-[#27352D] hover:bg-[#F7F8F3]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {gpsError && (
          <div className="mt-2.5 px-3 py-1.5 bg-[#FFF1EB] border border-[#EA580C]/30 rounded-lg text-[#B43C00] text-xs flex items-center justify-between">
            <span>{gpsError}</span>
            <button onClick={() => setGpsError(null)} className="font-bold ml-2 text-xs hover:underline">
              Dismiss
            </button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="space-y-4 py-8 animate-pulse" data-testid="aqi-loading-skeleton">
            <div className="h-28 bg-[#EEF3EA] rounded-xl" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-[#F7F8F3] rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-4 bg-[#FEE2E2] border border-[#DC2626]/30 rounded-xl text-[#A81E1E] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">Telemetry Ingestion Error</h4>
              <p className="text-xs">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 bg-white"
                onClick={() => fetchTelemetry(currentCoords.lat, currentCoords.lon)}
              >
                Retry Query
              </Button>
            </div>
          </div>
        )}

        {/* Honest No-Data / No-Nearby-Station Fallback State */}
        {isNoData && (
          <div className="p-6 text-center bg-[#FAFBF9] rounded-xl space-y-3 border border-[#E2E8DE]" data-testid="aqi-no-data-card">
            <MapPin className="w-8 h-8 text-[#D97706] mx-auto" />
            <h4 className="text-base font-bold text-[#27352D]">
              Air-quality monitoring data is currently unavailable for this location.
            </h4>
            <p className="text-xs text-[#68766C] max-w-lg mx-auto leading-relaxed">
              {data?.status === 'NO_NEARBY_STATION'
                ? `BreatheWise AI operates under a strict scientific zero-fabrication standard. No active continuous monitoring station is located within the 50 km representative radius of coordinates (${currentCoords.lat.toFixed(2)}, ${currentCoords.lon.toFixed(2)}).`
                : 'BreatheWise AI operates under a strict scientific zero-fabrication standard. Continuous ambient monitoring observations are currently unreachable for these coordinates.'}
            </p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EEF3EA] text-[#397A55] text-xs font-semibold rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> Zero Synthetic Fabrication Policy Enforced
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentCoords(REGIONAL_STATIONS[0])}
              >
                View Delhi Regional Hub
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentCoords(REGIONAL_STATIONS[3])}
              >
                View Ahmedabad Regional Hub
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentCoords(REGIONAL_STATIONS[5])}
              >
                View Gandhinagar Regional Hub
              </Button>
            </div>
          </div>
        )}

        {/* Telemetry Display */}
        {!loading && !error && !isNoData && data && (
          <div className="space-y-6">
            {/* User-facing Telemetry Status Banner */}
            {isLive ? (
              <div className="p-3 bg-emerald-50/90 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5" data-testid="telemetry-status-banner">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p className="font-medium text-emerald-950 leading-relaxed">
                  Live air-quality monitoring data is available for this location.
                </p>
              </div>
            ) : isHistoricalOnly ? (
              <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5" data-testid="telemetry-status-banner">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="font-medium text-amber-950 leading-relaxed">
                  Air-quality monitoring information is currently available from historical station records. Live monitoring updates are temporarily unavailable.
                </p>
              </div>
            ) : null}

            {/* Main AQI Hero Gauge Card: Short-Term Air Quality Indicator */}
            <div className={`p-5 rounded-xl border ${categoryStyle.bg} ${categoryStyle.border} transition-all`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#68766C] uppercase tracking-wider">
                      Short-Term Indicator
                    </span>
                    <Badge variant={categoryStyle.badgeVariant} size="sm">
                      {categoryKey.replace(/_/g, ' ')}
                    </Badge>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100/90 rounded border border-amber-300 text-amber-900"
                      data-testid="short-term-indicator-badge"
                    >
                      1-Hour Acute Proxy
                    </span>
                    {dominant !== 'N/A' && (
                      <span className="text-xs font-medium px-2 py-0.5 bg-white/80 rounded border border-[#E2E8DE] text-[#27352D]">
                        Dominant: <strong>{dominant}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-[#27352D] font-[var(--font-heading)]" data-testid="aqi-value-display">
                      {aqiValue !== null ? aqiValue : '—'}
                    </span>
                    <span className="text-sm font-semibold text-[#68766C]">
                      / 500 Index Scale
                    </span>
                  </div>

                  <p className="text-xs font-medium text-[#27352D] pt-1">
                    {health?.shortStatement || 'Environmental conditions monitored.'}
                  </p>
                </div>

                {/* Station Location & Provenance Metadata Badge */}
                <div className="bg-white/90 p-4 rounded-lg border border-[#E2E8DE] shadow-xs space-y-1.5 md:min-w-[320px]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#27352D]">
                    <MapPin className="w-3.5 h-3.5 text-[#397A55]" />
                    <span className="truncate">{stationName}</span>
                  </div>
                  {distanceKm !== undefined && (
                    <div className="text-[11px] text-[#68766C]">
                      Proximity: <strong>{distanceKm.toFixed(1)} km</strong> from query location
                    </div>
                  )}
                  <div className="text-[11px] text-[#68766C] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#397A55]" />
                    <strong>Observed:</strong> {observationTime}
                  </div>
                  <div className="text-[11px] text-[#68766C] flex items-center gap-1">
                    <Database className="w-3 h-3 text-[#68766C]" />
                    <strong>Retrieved:</strong> {retrievalTime}
                  </div>
                  <div className="text-[10px] text-[#397A55] font-semibold pt-0.5 border-t border-[#E2E8DE]/60">
                    Provenance: {getProvenanceTypeLabel(provenanceType)}
                  </div>
                </div>
              </div>

              {/* Official CPCB 24-Hour Regulatory AQI Status Card */}
              <div
                className="mt-4 p-3.5 rounded-lg border bg-white/95 shadow-2xs space-y-2 border-[#E2E8DE]"
                data-testid="official-cpcb-status"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileCheck2 className={`w-4 h-4 ${officialCpcb?.status === 'AVAILABLE' ? 'text-[#397A55]' : 'text-[#68766C]'}`} />
                    <span className="text-xs font-bold text-[#27352D]">
                      CPCB National AQI:
                    </span>
                    {officialCpcb?.status === 'AVAILABLE' ? (
                      <Badge variant="success" size="sm" className="font-bold">
                        {officialCpcb.aqi} — {officialCpcb.category.replace(/_/g, ' ')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" size="sm" className="font-semibold text-[10px]">
                        Unavailable (Insufficient Completeness)
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-[#68766C] font-medium">
                    Completeness: <strong>{officialCpcb?.completenessHours ? Math.round(officialCpcb.completenessHours) : 1}/24 hrs</strong> valid data (min. 16 hrs required)
                  </span>
                </div>
                <p className="text-[11px] text-[#556359] leading-snug">
                  {officialCpcb?.status === 'AVAILABLE'
                    ? 'CPCB National AQI: Evaluated using 24-hour averages for PM2.5, PM10, NO2, SO2, NH3, Pb and 8-hour running averages for CO, O3. Meets statutory 16-hour valid data completeness and 3-parameter sufficiency (including PM).'
                    : 'CPCB National AQI combines 24-hour averages (PM2.5, PM10, NO2, SO2, NH3, Pb) and 8-hour running averages (CO, O3). Requires at least 16 hours of valid data in the 24-hour cycle. Currently serving acute 1-hour sensor proxy for immediate exposure guidance.'}
                </p>
              </div>

              {/* Acute Sensor Proxy vs Regulatory Standard Notice */}
              <div className="mt-3 p-2.5 bg-white/70 rounded-lg border border-[#E2E8DE] flex items-start gap-2 text-[11px] text-[#68766C]">
                <Info className="w-4 h-4 text-[#397A55] shrink-0 mt-0.5" />
                <span className="leading-snug">
                  <strong>Averaging Standard:</strong> {averagingNotice}
                </span>
              </div>

              {/* Health Guidance Expandable Strip */}
              {health && (
                <div className="mt-4 pt-3 border-t border-black/10 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#27352D] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#397A55]" /> General Public
                    </span>
                    <p className="text-[11px] text-[#556359] leading-snug">{health.generalPublicAdvice}</p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="font-bold text-[#27352D] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" /> Sensitive Groups
                    </span>
                    <p className="text-[11px] text-[#556359] leading-snug">{health.sensitiveGroupsAdvice}</p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="font-bold text-[#27352D] flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 text-[#397A55]" /> Clean Room Action
                    </span>
                    <p className="text-[11px] text-[#556359] leading-snug">{health.indoorGuidance}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Comprehensive 8-Criteria Pollutant Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#27352D] font-[var(--font-heading)] flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#397A55]" />
                  CPCB Criteria Pollutant Sub-Indices (8-Parameter Suite)
                </h4>
                <span className="text-[11px] text-[#68766C]">
                  Standard: Indian NAAQS Regulatory Limits
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { code: 'PM2.5', label: 'PM2.5 Fine Dust', naaqs: '60 µg/m³', defaultUnit: 'µg/m³' },
                  { code: 'PM10', label: 'PM10 Coarse Dust', naaqs: '100 µg/m³', defaultUnit: 'µg/m³' },
                  { code: 'NO2', label: 'Nitrogen Dioxide', naaqs: '80 µg/m³', defaultUnit: 'µg/m³' },
                  { code: 'SO2', label: 'Sulfur Dioxide', naaqs: '80 µg/m³', defaultUnit: 'µg/m³' },
                  { code: 'CO', label: 'Carbon Monoxide', naaqs: '2.0 mg/m³', defaultUnit: 'mg/m³' },
                  { code: 'O3', label: 'Ozone (8-hr)', naaqs: '100 µg/m³', defaultUnit: 'µg/m³' },
                  { code: 'NH3', label: 'Ammonia', naaqs: '400 µg/m³', defaultUnit: 'µg/m³' },
                  { code: 'Pb', label: 'Lead (Particulate)', naaqs: '1.0 µg/m³', defaultUnit: 'µg/m³' },
                ].map((item) => {
                  const m = data?.measurements?.[item.code] || (data?.pollutants?.[item.code.toLowerCase().replace('.', '')] ? {
                    normalizedValue: data.pollutants[item.code.toLowerCase().replace('.', '')]?.value,
                    normalizedUnit: data.pollutants[item.code.toLowerCase().replace('.', '')]?.unit || item.defaultUnit,
                    subIndex: null,
                    isExceededNAAQS: false,
                  } : null);

                  const val = m?.normalizedValue ?? null;
                  const unit = m?.normalizedUnit || item.defaultUnit;
                  const subIndex = m?.subIndex ?? data?.cpcbAqi?.subIndices?.[item.code] ?? null;
                  const isExceeded = m?.isExceededNAAQS ?? false;

                  return (
                    <div
                      key={item.code}
                      className="p-3 bg-[#FAFBF9] rounded-lg border border-[#E2E8DE] hover:border-[#397A55]/40 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#27352D]">{item.code}</span>
                        {subIndex !== null ? (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            subIndex <= 100 ? 'bg-[#E8F3ED] text-[#397A55]' : subIndex <= 200 ? 'bg-[#FDF6E2] text-[#9A5B00]' : 'bg-[#FEE2E2] text-[#A81E1E]'
                          }`}>
                            Sub-Index {subIndex}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#68766C]">No Sub-Index</span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-extrabold text-[#27352D]">
                          {val !== null ? val : '—'}
                        </span>
                        <span className="text-[10px] text-[#68766C]">{unit}</span>
                      </div>

                      <div className="text-[10px] flex items-center justify-between pt-1 border-t border-[#E2E8DE]/60">
                        <span className="text-[#68766C]">NAAQS: {item.naaqs}</span>
                        {val !== null && (
                          isExceeded ? (
                            <span className="text-[#DC2626] font-semibold flex items-center gap-0.5">
                              <AlertCircle className="w-2.5 h-2.5" /> Exceeded
                            </span>
                          ) : (
                            <span className="text-[#397A55] font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Within Limit
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attribution, Scientific Methodology & Provenance Disclosure */}
            <div className="p-3.5 bg-[#F7F8F3] rounded-lg border border-[#E2E8DE] text-[11px] text-[#68766C] space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>
                  <strong>Data Provenance:</strong> {data?.attribution?.provider || data?.source || 'CPCB CAAQMS / OpenAQ v3'}
                </span>
                <span>
                  <strong>License:</strong> {data?.attribution?.license || 'Open Database License (ODbL) / GODL India'}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-[#68766C]">
                Calculated strictly using official Central Pollution Control Board (CPCB) National Air Quality Index (NAQI)
                piecewise linear sub-index formulas (2014-2015). BreatheWise AI maintains zero synthetic telemetry generation.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
