'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Calculator, ChevronDown, ChevronUp, Scale } from 'lucide-react';

export interface ImpactMetricCardProps {
  label: string;
  value: string;
  unit: string;
  period: string;
  formula: string;
  baseline: string;
  uncertaintyMargin: string;
}

export function ImpactMetricCard({
  label,
  value,
  unit,
  period,
  formula,
  baseline,
  uncertaintyMargin,
}: ImpactMetricCardProps) {
  const [showFormula, setShowFormula] = useState(false);

  return (
    <Card className="border-[#E2E8DE] p-5 hover:border-[#397A55] transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#68766C] uppercase tracking-wider">
          {label}
        </span>
        <Badge variant="default" size="sm">
          {period}
        </Badge>
      </div>

      <div className="flex items-baseline gap-1.5 mt-2">
        <span className="text-3xl font-black text-[#27352D] font-[var(--font-heading)]">
          {value}
        </span>
        <span className="text-sm font-semibold text-[#397A55]">{unit}</span>
      </div>

      <div className="mt-4 pt-3 border-t border-[#E2E8DE]">
        <button
          onClick={() => setShowFormula(!showFormula)}
          className="w-full flex items-center justify-between text-xs text-[#397A55] font-semibold hover:underline cursor-pointer"
        >
          <span className="flex items-center gap-1">
            <Calculator className="w-3.5 h-3.5" /> Show Calculation Math
          </span>
          {showFormula ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showFormula && (
          <div className="mt-3 p-3 rounded-[8px] bg-[#F7F8F3] border border-[#E2E8DE] space-y-1.5 text-xs text-[#27352D] animate-in fade-in duration-150">
            <div>
              <span className="font-bold text-[11px] text-[#68766C] block">Formula:</span>
              <code className="text-xs bg-white px-2 py-0.5 rounded border border-[#E2E8DE] text-[#397A55] font-mono">
                {formula}
              </code>
            </div>
            <div>
              <span className="font-bold text-[11px] text-[#68766C] block">Baseline Factor:</span>
              <p className="text-[11px] text-[#68766C]">{baseline}</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#A86B16] pt-1">
              <Scale className="w-3 h-3" />
              <span>Uncertainty: {uncertaintyMargin}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
