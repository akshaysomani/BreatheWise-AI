'use client';

import React from 'react';
import {
  evaluatePasswordRequirements,
  PasswordRule,
  PasswordEvaluationResult,
} from '@/lib/validations/password-requirements';
import { Check } from 'lucide-react';

interface PasswordChecklistProps {
  password: string;
}

export function PasswordChecklist({ password }: PasswordChecklistProps) {
  const result: PasswordEvaluationResult = evaluatePasswordRequirements(password);
  const hasStartedTyping = password.length > 0;

  return (
    <div className="space-y-2.5 pt-1" aria-live="polite">
      {/* Compact Password Strength Meter */}
      {hasStartedTyping && (
        <div className="space-y-1.5" data-testid="password-strength-container">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#68766C] font-medium">Password Strength:</span>
            <span
              className={`font-semibold ${result.strengthTextColor}`}
              data-testid="password-strength-label"
            >
              {result.strength}
            </span>
          </div>
          {/* Segmented Strength Bar */}
          <div
            className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-[#E2E8DE]/60 rounded-full p-0.5"
            role="progressbar"
            aria-valuenow={result.strengthScore}
            aria-valuemin={0}
            aria-valuemax={4}
            aria-label={`Password strength: ${result.strength}`}
          >
            {[1, 2, 3, 4].map((step) => {
              const active = result.strengthScore >= step;
              return (
                <div
                  key={step}
                  className={`h-full rounded-full transition-all duration-200 ${
                    active ? result.strengthColor : 'bg-transparent'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Live Requirement Checklist */}
      <div className="bg-[#F7F8F3] p-3 rounded-lg border border-[#E2E8DE] space-y-1.5">
        <p className="text-[11px] font-semibold text-[#68766C] uppercase tracking-wider mb-1">
          Password Requirements:
        </p>
        <ul className="space-y-1.5 text-xs" role="list">
          {result.requirements.map((req: PasswordRule) => {
            const isMet = req.valid;

            return (
              <li
                key={req.id}
                className="flex items-center gap-2"
                data-testid={`req-${req.id}`}
                data-valid={isMet ? 'true' : 'false'}
              >
                {isMet ? (
                  <span
                    className="w-4 h-4 rounded-full bg-[#EEF3EA] text-[#397A55] flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <Check className="w-3 h-3 text-[#397A55] stroke-[2.5]" />
                  </span>
                ) : (
                  <span
                    className="w-4 h-4 rounded-full border border-[#CDE0D3] bg-white shrink-0 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CDE0D3]" />
                  </span>
                )}
                <span className={isMet ? 'text-[#27352D] font-medium' : 'text-[#68766C]'}>
                  <span className="sr-only">
                    {isMet ? 'Requirement satisfied: ' : 'Requirement unmet: '}
                  </span>
                  {req.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
