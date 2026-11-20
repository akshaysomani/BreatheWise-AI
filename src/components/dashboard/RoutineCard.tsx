import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Bike, Train, Car, ShieldAlert, Leaf, ArrowRight } from 'lucide-react';

export interface RoutineCardProps {
  title: string;
  distanceKm: number;
  origin: string;
  destination: string;
  baselineMode: string;
  recommendedMode: string;
  inhaledDoseReductionPercent: number;
  co2AvoidedKg: number;
  safetyReason: string;
}

export function RoutineCard({
  title,
  distanceKm,
  origin,
  destination,
  baselineMode,
  recommendedMode,
  inhaledDoseReductionPercent,
  co2AvoidedKg,
  safetyReason,
}: RoutineCardProps) {
  return (
    <Card className="border-[#E2E8DE] hover:border-[#397A55] transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-1">
          <Badge variant="warning" size="sm">
            Smog Correlated Commute
          </Badge>
          <span className="text-xs text-[#68766C]">{distanceKm} km route</span>
        </div>
        <CardTitle className="text-base font-bold text-[#27352D] font-[var(--font-heading)]">
          {title}
        </CardTitle>
        <p className="text-xs text-[#68766C]">
          {origin} &rarr; {destination}
        </p>
      </CardHeader>

      <CardContent className="space-y-3.5">
        {/* Mode Comparison */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-[8px] bg-[#F7F8F3] border border-[#E2E8DE]">
            <span className="text-[11px] text-[#68766C] block">Baseline Option</span>
            <span className="font-semibold text-[#27352D] mt-0.5 block">{baselineMode}</span>
          </div>
          <div className="p-2.5 rounded-[8px] bg-[#EEF3EA] border border-[#CDE0D3]">
            <span className="text-[11px] text-[#397A55] font-semibold block">Recommended Option</span>
            <span className="font-bold text-[#27352D] mt-0.5 block">{recommendedMode}</span>
          </div>
        </div>

        {/* Dual Impact Numbers */}
        <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-[#E2E8DE] py-2.5">
          <div>
            <span className="text-[11px] text-[#68766C] block">Lung Inhaled Dose</span>
            <span className="text-sm font-black text-[#287A4B] font-[var(--font-heading)]">
              -{inhaledDoseReductionPercent}% Intake
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[#68766C] block">Emissions Avoided</span>
            <span className="text-sm font-black text-[#397A55] font-[var(--font-heading)]">
              {co2AvoidedKg} kg CO₂e
            </span>
          </div>
        </div>

        {/* Safety First Principle Explanation */}
        <div className="p-2.5 rounded-[6px] bg-[#FDF5E6] border border-[#F6D9AC] text-[11px] text-[#27352D] flex items-start gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-[#A86B16] shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Safety-First Rule:</strong> {safetyReason}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
