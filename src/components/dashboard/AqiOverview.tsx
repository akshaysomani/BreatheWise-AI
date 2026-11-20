import React from 'react';
import { cn } from '@/lib/utils';
import { aqiTiers } from '@/lib/tokens';
import { Badge } from '@/components/ui/Badge';
import { AlertCircle, Clock, MapPin, Radio } from 'lucide-react';

export interface AqiOverviewProps {
  aqi: number;
  category: keyof typeof aqiTiers;
  dominantPollutant: string;
  city: string;
  stationName: string;
  stationDistanceKm: number;
  lastUpdated: string;
  isSampleFixture?: boolean;
}

export function AqiOverview({
  aqi,
  category,
  dominantPollutant,
  city,
  stationName,
  stationDistanceKm,
  lastUpdated,
  isSampleFixture = true,
}: AqiOverviewProps) {
  const tier = aqiTiers[category] || aqiTiers.unhealthy;

  return (
    <div className="bg-white border border-[#E2E8DE] rounded-[14px] p-6 shadow-xs relative overflow-hidden">
      {/* Sample Fixture Top Watermark */}
      {isSampleFixture && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E2E8DE]">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-[#397A55] animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#397A55]">
              M1 Visual Foundation Radar
            </span>
          </div>
          <Badge variant="accent" size="sm">
            SAMPLE FIXTURE — NOT LIVE DATA
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Main AQI Number Block */}
        <div className="md:col-span-5 flex flex-col items-start justify-center p-6 rounded-[12px] border" style={{ backgroundColor: tier.bg, borderColor: tier.border }}>
          <span className="text-xs font-bold uppercase tracking-wider text-[#68766C]">
            Air Quality Index (US EPA)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-5xl sm:text-6xl font-black font-[var(--font-heading)]" style={{ color: tier.color }}>
              {aqi}
            </span>
            <span className="text-sm font-semibold text-[#68766C]">/ 500</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-xs" style={{ backgroundColor: tier.color }}>
            {tier.label}
          </div>
          <p className="text-xs text-[#27352D] mt-3 font-medium">
            Primary Driver: <strong className="font-bold">{dominantPollutant}</strong> (Fine Particulates)
          </p>
        </div>

        {/* Station Metadata & Lineage Details */}
        <div className="md:col-span-7 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#68766C] mb-1">
              <MapPin className="w-3.5 h-3.5 text-[#397A55]" />
              <span>Location Monitoring Corridor</span>
            </div>
            <h3 className="text-2xl font-bold text-[#27352D] font-[var(--font-heading)]">
              {city}
            </h3>
            <p className="text-xs text-[#68766C] mt-0.5">
              Station: <span className="font-medium text-[#27352D]">{stationName}</span> ({stationDistanceKm} km away)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-[#E2E8DE]">
            <div>
              <span className="text-[#68766C] block">Telemetery Provider</span>
              <span className="font-semibold text-[#27352D]">OpenAQ v3 Government Feed</span>
            </div>
            <div>
              <span className="text-[#68766C] block">Last Sensor Update</span>
              <span className="font-semibold text-[#27352D] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#397A55]" /> {lastUpdated}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-[8px] bg-[#EEF3EA] border border-[#CDE0D3] text-xs text-[#27352D] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#397A55] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Winter nocturnal thermal inversion layer active. Particulate dispersion improves between 13:00 and 15:30.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
