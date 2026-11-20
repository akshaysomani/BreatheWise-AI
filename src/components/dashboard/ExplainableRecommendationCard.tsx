'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Sparkles, ChevronDown, ChevronUp, ShieldCheck, Microscope, HeartPulse, Scale, CheckSquare } from 'lucide-react';

export interface ExplainableRecommendationProps {
  id: string;
  category: string;
  action: string;
  scientificMechanism: string;
  expectedBenefit: string;
  quantifiedImpact?: string;
  assumptionsAndUncertainty: string;
  implementationSteps: string[];
}

export function ExplainableRecommendationCard({
  category,
  action,
  scientificMechanism,
  expectedBenefit,
  quantifiedImpact,
  assumptionsAndUncertainty,
  implementationSteps,
}: ExplainableRecommendationProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <Card className="border-[#E2E8DE] hover:border-[#397A55] transition-all">
      <CardHeader>
        <div className="flex items-center justify-between mb-1">
          <Badge variant="default" size="sm">
            {category}
          </Badge>
          <span className="text-[11px] font-semibold text-[#397A55] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> 6-Field Explainability
          </span>
        </div>
        <CardTitle className="text-lg font-bold text-[#27352D] font-[var(--font-heading)] leading-snug">
          {action}
        </CardTitle>
        <CardDescription className="text-xs text-[#68766C]">
          Personalized recommendation verified against current local smog dynamics.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Field 1: Scientific Reason */}
        <div className="p-3.5 rounded-[8px] bg-[#EEF3EA] border border-[#CDE0D3] space-y-1">
          <span className="text-xs font-bold text-[#397A55] flex items-center gap-1.5 uppercase tracking-wide">
            <Microscope className="w-3.5 h-3.5" /> Scientific Mechanism
          </span>
          <p className="text-xs text-[#27352D] leading-relaxed">
            {scientificMechanism}
          </p>
        </div>

        {/* Field 2: Expected Benefit */}
        <div className="flex items-start gap-2 text-xs text-[#27352D]">
          <HeartPulse className="w-4 h-4 text-[#287A4B] shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-[#27352D]">Health & Safety Benefit:</strong>{' '}
            <span className="text-[#68766C]">{expectedBenefit}</span>
          </div>
        </div>

        {/* Action Steps */}
        <div className="space-y-1.5 pt-1 border-t border-[#E2E8DE]">
          <span className="text-xs font-semibold text-[#27352D] flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5 text-[#397A55]" /> Practical Implementation:
          </span>
          <ul className="text-xs text-[#68766C] space-y-1 pl-4 list-disc">
            {implementationSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
        </div>

        {/* Expandable Technical Details (Impact & Uncertainty) */}
        {detailsOpen && (
          <div className="p-3.5 rounded-[8px] bg-[#F7F8F3] border border-[#E2E8DE] space-y-2 text-xs animate-in fade-in duration-150">
            {quantifiedImpact && (
              <div>
                <span className="font-bold text-[#27352D] block mb-0.5">Estimated Quantified Impact:</span>
                <p className="text-[#68766C]">{quantifiedImpact}</p>
              </div>
            )}
            <div>
              <span className="font-bold text-[#27352D] flex items-center gap-1 mb-0.5">
                <Scale className="w-3.5 h-3.5 text-[#A86B16]" /> Scientific Assumptions & Uncertainty:
              </span>
              <p className="text-[#68766C] leading-relaxed">
                {assumptionsAndUncertainty}
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="text-xs font-semibold text-[#397A55] hover:underline flex items-center gap-1 cursor-pointer"
          >
            {detailsOpen ? 'Hide Scientific Audit Details' : 'View Impact & Uncertainty Audit'}
            {detailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
