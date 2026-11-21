'use client';

import React, { useEffect, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { AirQualityRadar } from '@/components/dashboard/AirQualityRadar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Wind, ShieldAlert, Activity, Info, BarChart3, Radio, CheckCircle2 } from 'lucide-react';

const CPCB_BANDS = [
  {
    range: '0 – 50',
    category: 'Good',
    color: '#397A55',
    bg: 'bg-[#E8F3ED]',
    text: 'text-[#397A55]',
    impact: 'Minimal health impact. Clean air ideal for all outdoor activities.',
  },
  {
    range: '51 – 100',
    category: 'Satisfactory',
    color: '#5B8C51',
    bg: 'bg-[#EEF5EB]',
    text: 'text-[#487340]',
    impact: 'Minor breathing discomfort to sensitive people. Generally acceptable for public.',
  },
  {
    range: '101 – 200',
    category: 'Moderately Polluted',
    color: '#D97706',
    bg: 'bg-[#FDF6E2]',
    text: 'text-[#9A5B00]',
    impact: 'Breathing discomfort to people with asthma, lung, or heart disease. Children and elderly should limit prolonged heavy outdoor exertion.',
  },
  {
    range: '201 – 300',
    category: 'Poor',
    color: '#EA580C',
    bg: 'bg-[#FFF1EB]',
    text: 'text-[#B43C00]',
    impact: 'Breathing discomfort to most people on prolonged exposure. Avoid strenuous outdoor activities; use N95 respirators near roads.',
  },
  {
    range: '301 – 400',
    category: 'Very Poor',
    color: '#DC2626',
    bg: 'bg-[#FDF2F2]',
    text: 'text-[#A81E1E]',
    impact: 'Respiratory illness on prolonged exposure. High risk for children, elderly, and cardiac patients. Keep windows sealed, run continuous HEPA purifiers.',
  },
  {
    range: '401 – 500',
    category: 'Severe',
    color: '#7F1D1D',
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#641414]',
    impact: 'Affects healthy people and seriously impacts those with existing diseases. Emergency protocol: avoid outdoor transit; run HEPA on maximum CADR.',
  },
];

export default function AirQualityPage() {
  const [household, setHousehold] = useState<any>(null);

  useEffect(() => {
    async function loadHousehold() {
      try {
        const res = await fetch('/api/household', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          setHousehold(json.data);
        }
      } catch {}
    }
    loadHousehold();
  }, []);

  return (
    <div className="py-8 lg:py-12 bg-[#F7F8F3]">
      <Container size="wide" className="space-y-8">
          {/* Header Banner */}
          <div className="border-b border-[#E2E8DE] pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EA] text-[#397A55] text-xs font-semibold">
                <Radio className="w-3.5 h-3.5 text-[#397A55] animate-pulse" />
                <span>Continuous Ambient Air Quality Monitoring (CAAQMS)</span>
              </div>
              <h1 className="text-3xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
                Air Quality Radar & Telemetry
              </h1>
              <p className="text-sm text-[#68766C]">
                Official Central Pollution Control Board (CPCB) Indian NAQI telemetry, pollutant sub-indices, and real-time station diagnostics.
              </p>
            </div>
          </div>

          {/* Air Quality Radar Component */}
          <AirQualityRadar
            householdLat={household?.profile?.latitude}
            householdLon={household?.profile?.longitude}
            householdCity={household?.profile?.city}
          />

          {/* CPCB Scale Reference Table Card */}
          <Card className="bg-white border-[#E2E8DE] shadow-sm overflow-hidden">
            <CardHeader className="border-b border-[#E2E8DE]/60 bg-[#FAFBF9]">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#397A55]" />
                <div>
                  <CardTitle className="text-base text-[#27352D]">CPCB National Air Quality Index (NAQI) Scale</CardTitle>
                  <CardDescription className="text-xs">
                    Statutory breakpoints defined by the Central Pollution Control Board, Ministry of Environment, Forest & Climate Change (MoEFCC), India.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#FAFBF9] text-[#27352D] border-b border-[#E2E8DE] font-bold">
                    <tr>
                      <th className="py-3 px-4">AQI Band</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Primary Health Impact & Precaution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8DE]/60">
                    {CPCB_BANDS.map((b) => (
                      <tr key={b.category} className="hover:bg-[#FAFBF9]/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#27352D]">{b.range}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${b.bg} ${b.text}`}
                          >
                            {b.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#48534C]">{b.impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Educational Explainer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-[#E2E8DE]">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-[#27352D]">
                  <Activity className="w-4 h-4 text-[#397A55]" />
                  CPCB NAQI Multi-Pollutant Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#48534C] space-y-3 leading-relaxed">
                <p>
                  The Indian National Air Quality Index aggregates eight key criteria pollutants: <strong>PM2.5, PM10, NO2, SO2, CO, O3, NH3, and Pb</strong>.
                </p>
                <p>
                  To compute a regulatory certified 24-hour CPCB AQI, statutory rules mandate that at least <strong>3 pollutants</strong> must be monitored, with at least one being either <strong>PM2.5 or PM10</strong>, and with a minimum of <strong>16 hours</strong> of valid observational data across the 24-hour period.
                </p>
                <div className="p-3 bg-[#EEF3EA] rounded-lg text-[#27352D] border border-[#397A55]/20">
                  <strong>Max-Operator Rule:</strong> The overall AQI is governed by the pollutant with the highest sub-index value, designated as the <em>dominant pollutant</em>.
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8DE]">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-[#27352D]">
                  <Info className="w-4 h-4 text-[#D69B47]" />
                  Acute 1-Hour Proxy vs. 24-Hour Regulatory Index
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#48534C] space-y-3 leading-relaxed">
                <p>
                  Continuous CAAQMS monitoring stations stream hourly particulate and gaseous concentrations. BreatheWise AI calculates an <strong>acute 1-hour exposure proxy</strong> against CPCB breakpoint curves to provide instant, real-time safety guidance for walks, commutes, and room ventilation.
                </p>
                <p>
                  Official government health bulletins utilize 24-hour continuous rolling integration. In our interface, hourly acute proxies and regulatory 24-hour statuses are clearly distinguished so you always understand whether telemetry reflects instantaneous exposure or statutory 24-hour averages.
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
    </div>
  );
}
