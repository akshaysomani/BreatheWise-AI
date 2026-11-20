import React from 'react';
import { cn } from '@/lib/utils';

export interface PollutantCardProps {
  name: string;
  chemicalFormula: string;
  value: number;
  unit: string;
  standardLimit: number; // e.g. WHO 24-hr guideline
  status: 'good' | 'moderate' | 'unhealthy' | 'hazardous';
  description: string;
}

export function PollutantCard({
  name,
  chemicalFormula,
  value,
  unit,
  standardLimit,
  status,
  description,
}: PollutantCardProps) {
  const statusStyles = {
    good: { badge: 'bg-[#EBF5EE] text-[#287A4B] border-[#CBE5D3]', label: 'Safe Level' },
    moderate: { badge: 'bg-[#FDFBE8] text-[#8A7000] border-[#F2E8A3]', label: 'Elevated' },
    unhealthy: { badge: 'bg-[#FDF5E6] text-[#A86B16] border-[#F6D9AC]', label: 'Unhealthy' },
    hazardous: { badge: 'bg-[#FCEBEA] text-[#B8423D] border-[#F6C1BE]', label: 'Hazardous' },
  };

  const currentStatus = statusStyles[status];
  const ratioToLimit = (value / standardLimit).toFixed(1);

  return (
    <div className="bg-white border border-[#E2E8DE] rounded-[12px] p-5 shadow-xs flex flex-col justify-between hover:border-[#397A55] transition-colors">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="font-bold text-sm text-[#27352D] font-[var(--font-heading)]">
              {name}
            </h4>
            <span className="text-xs text-[#68766C]">{chemicalFormula}</span>
          </div>
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', currentStatus.badge)}>
            {currentStatus.label}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-[#27352D] font-[var(--font-heading)]">
            {value}
          </span>
          <span className="text-xs font-medium text-[#68766C]">{unit}</span>
        </div>

        <p className="text-xs text-[#68766C] mt-2 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-[#E2E8DE] flex items-center justify-between text-[11px] text-[#68766C]">
        <span>WHO Guideline: {standardLimit} {unit}</span>
        <span className="font-bold text-[#A86B16]">{ratioToLimit}x Guideline</span>
      </div>
    </div>
  );
}
