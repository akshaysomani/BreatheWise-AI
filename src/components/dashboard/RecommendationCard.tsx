'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Info,
  Clock,
  ShieldCheck,
  Activity,
  Layers,
  Leaf,
} from 'lucide-react';
import { StructuredRecommendation } from '@/lib/validations/assistant.schema';

interface RecommendationCardProps {
  recommendation: StructuredRecommendation;
  recommendationId?: string | null;
  onFeedbackSubmitted?: (isHelpful: boolean) => void;
  onLogAsImpact?: (recommendation: StructuredRecommendation) => void;
}

export function RecommendationCard({
  recommendation,
  recommendationId,
  onFeedbackSubmitted,
  onLogAsImpact,
}: RecommendationCardProps) {
  const [feedback, setFeedback] = useState<'HELPFUL' | 'NOT_HELPFUL' | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [loggedImpact, setLoggedImpact] = useState(false);
  const [loggingImpact, setLoggingImpact] = useState(false);

  const handleLogImpact = async () => {
    if (loggingImpact || loggedImpact) return;
    setLoggingImpact(true);

    try {
      if (onLogAsImpact) {
        onLogAsImpact(recommendation);
        setLoggedImpact(true);
        return;
      }

      // Map recommendation category to impact action type
      let actionType: string = 'COMMUNITY_RECOMMENDATION';
      if (recommendation.category === 'COMMUTE_PLAN') actionType = 'COMMUTE_SHIFT';
      else if (recommendation.category === 'INDOOR_PURIFICATION') actionType = 'HEPA_PURIFICATION';
      else if (recommendation.category === 'DAILY_ROUTINE') actionType = 'VENTILATION_WINDOW';
      else if (recommendation.category === 'SUSTAINABLE_ALTERNATIVE') actionType = 'ENERGY_SAVING';

      const res = await fetch('/api/impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType,
          title: recommendation.action.slice(0, 140),
          co2AvoidedKg: 0.25,
          pm25AvoidedGrams: 0.15,
          calculationFormula: recommendation.measurableImpact || recommendation.reason.slice(0, 250),
          uncertaintyMargin: 0.15,
        }),
      });

      if (res.ok) {
        setLoggedImpact(true);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoggingImpact(false);
    }
  };

  const handleFeedback = async (isHelpful: boolean) => {
    if (submittingFeedback || feedback !== null) return;
    setSubmittingFeedback(true);

    try {
      await fetch('/api/assistant/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendationId: recommendationId || null,
          isHelpful,
          feedbackReason: isHelpful ? 'User marked helpful in chat' : 'User marked unhelpful in chat',
        }),
      });
      setFeedback(isHelpful ? 'HELPFUL' : 'NOT_HELPFUL');
      onFeedbackSubmitted?.(isHelpful);
    } catch {
      // Graceful fallback
      setFeedback(isHelpful ? 'HELPFUL' : 'NOT_HELPFUL');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'error' as const;
      case 'MEDIUM':
        return 'warning' as const;
      default:
        return 'default' as const;
    }
  };

  const getEvidenceStrengthLabel = (strength: string) => {
    switch (strength) {
      case 'MEASURED_OBSERVATION':
        return 'Measured Telemetry Grounding';
      case 'ESTIMATED_MODEL':
        return 'Formulaic Environmental Model';
      default:
        return 'Precautionary Guideline';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E2E8DE] shadow-xs overflow-hidden transition-all hover:border-[#397A55]/40">
      {/* Header Badges */}
      <div className="bg-[#F7F8F3] px-4 py-2.5 border-b border-[#E2E8DE] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={getPriorityBadgeVariant(recommendation.priority)} size="sm">
            {recommendation.priority} PRIORITY
          </Badge>
          <span className="text-[11px] font-semibold text-[#68766C] uppercase tracking-wider">
            {recommendation.category.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#68766C]">
          <Clock className="w-3.5 h-3.5 text-[#397A55]" />
          <span>{recommendation.timeOfDay}</span>
          <span className="text-[#E2E8DE]">•</span>
          <span className="font-mono text-[10px] bg-[#EEF3EA] text-[#397A55] px-2 py-0.5 rounded font-medium">
            {recommendation.provenance}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Field 1: Action */}
        <div>
          <h4 className="text-base font-bold text-[#27352D] font-[var(--font-heading)] leading-snug">
            {recommendation.action}
          </h4>
        </div>

        {/* Field 2: Scientific Reason */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-[#397A55] uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Scientific Grounding & Rationale
          </span>
          <p className="text-xs text-[#27352D] leading-relaxed bg-[#F7F8F3] p-2.5 rounded-lg border border-[#E2E8DE]">
            {recommendation.reason}
          </p>
        </div>

        {/* Field 3: Expected Benefit */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-[#27352D] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#287A4B]" />
            Expected Health Benefit
          </span>
          <p className="text-xs text-[#68766C] leading-relaxed">
            {recommendation.expectedBenefit}
          </p>
        </div>

        {/* Field 4: Measurable Impact (if available) */}
        {recommendation.measurableImpact && (
          <div className="p-2.5 bg-[#EEF3EA] rounded-lg border border-[#397A55]/20 flex items-start gap-2">
            <Activity className="w-4 h-4 text-[#397A55] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-[#397A55] uppercase">Quantified Impact</span>
              <p className="text-xs font-semibold text-[#27352D]">
                {recommendation.measurableImpact}
              </p>
            </div>
          </div>
        )}

        {/* Implementation Steps */}
        {recommendation.implementationSteps && recommendation.implementationSteps.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-[#27352D] uppercase tracking-wider block">
              Practical Action Steps
            </span>
            <ul className="space-y-1.5">
              {recommendation.implementationSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-[#27352D]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55] shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expandable Scientific Details: Assumptions & Uncertainty */}
        <div className="pt-2 border-t border-[#E2E8DE]">
          <button
            type="button"
            onClick={() => setExpandedDetails(!expandedDetails)}
            className="text-[11px] font-semibold text-[#397A55] hover:underline flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {expandedDetails ? 'Hide Scientific Assumptions & Uncertainty' : 'View Scientific Assumptions & Uncertainty'}
          </button>

          {expandedDetails && (
            <div className="mt-2.5 p-3 bg-[#F7F8F3] rounded-lg border border-[#E2E8DE] space-y-2 text-[11px]">
              <div>
                <span className="font-bold text-[#27352D] block mb-0.5">Underlying Assumptions:</span>
                <p className="text-[#68766C]">{recommendation.assumptions}</p>
              </div>
              <div>
                <span className="font-bold text-[#27352D] block mb-0.5">Uncertainty Bounds & Limitations:</span>
                <p className="text-[#68766C]">{recommendation.uncertainty}</p>
              </div>
              <div>
                <span className="font-bold text-[#27352D] block mb-0.5">Evidence Classification:</span>
                <p className="text-[#397A55] font-medium">
                  {getEvidenceStrengthLabel(recommendation.evidenceStrength)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer & Transparency Footer */}
        <div className="pt-2 border-t border-[#E2E8DE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-[#68766C]">
          <p className="italic max-w-md">
            {recommendation.disclaimer}
          </p>

          <div className="flex items-center gap-3 shrink-0">
            {/* Record as Impact Action Button */}
            <button
              type="button"
              onClick={handleLogImpact}
              disabled={loggingImpact || loggedImpact}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                loggedImpact
                  ? 'bg-[#EEF3EA] text-[#397A55] border border-[#397A55]/30'
                  : 'bg-white hover:bg-[#EEF3EA] text-[#397A55] border border-[#E2E8DE]'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>{loggedImpact ? 'Logged to Impact ✓' : 'Log as Impact'}</span>
            </button>

            {/* Feedback buttons */}
            <div className="flex items-center gap-1.5 border-l border-[#E2E8DE] pl-2">
              <span className="text-[10px] text-[#68766C] font-medium">Helpful?</span>
              <button
                type="button"
                onClick={() => handleFeedback(true)}
                disabled={submittingFeedback || feedback !== null}
                aria-label="Helpful recommendation"
                className={`p-1.5 rounded transition-colors ${
                  feedback === 'HELPFUL'
                    ? 'bg-[#287A4B] text-white'
                    : 'hover:bg-[#EEF3EA] text-[#68766C] hover:text-[#287A4B]'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(false)}
                disabled={submittingFeedback || feedback !== null}
                aria-label="Not helpful recommendation"
                className={`p-1.5 rounded transition-colors ${
                  feedback === 'NOT_HELPFUL'
                    ? 'bg-[#B8423D] text-white'
                    : 'hover:bg-[#EEF3EA] text-[#68766C] hover:text-[#B8423D]'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
