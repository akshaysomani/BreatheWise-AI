/**
 * BreatheWise AI — Password Requirements & Strength Evaluation
 * 
 * Provides unified, accessible password validation criteria shared between
 * client-side interactive checklists and server-side schema verification.
 */

export interface PasswordRule {
  id: string;
  label: string;
  valid: boolean;
}

export type PasswordStrengthLevel = 'Weak' | 'Fair' | 'Good' | 'Strong';

export interface PasswordEvaluationResult {
  requirements: PasswordRule[];
  allMet: boolean;
  metCount: number;
  strength: PasswordStrengthLevel;
  strengthScore: number; // 0 to 4
  strengthColor: string;
  strengthTextColor: string;
}

export const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;

export function evaluatePasswordRequirements(password: string = ''): PasswordEvaluationResult {
  const requirements: PasswordRule[] = [
    {
      id: 'min-length',
      label: 'Minimum 8 characters',
      valid: password.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter (A–Z)',
      valid: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter (a–z)',
      valid: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'At least one number (0–9)',
      valid: /[0-9]/.test(password),
    },
    {
      id: 'special',
      label: 'At least one special character (!@#$%^&*)',
      valid: SPECIAL_CHAR_REGEX.test(password),
    },
  ];

  const metCount = requirements.filter((r) => r.valid).length;
  const allMet = metCount === 5;

  let strength: PasswordStrengthLevel = 'Weak';
  let strengthScore = 0;
  let strengthColor = 'bg-[#DC2626]';
  let strengthTextColor = 'text-[#DC2626]';

  if (password.length === 0) {
    strength = 'Weak';
    strengthScore = 0;
    strengthColor = 'bg-[#E2E8DE]';
    strengthTextColor = 'text-[#68766C]';
  } else if (password.length < 8 || metCount <= 2) {
    strength = 'Weak';
    strengthScore = 1;
    strengthColor = 'bg-[#DC2626]';
    strengthTextColor = 'text-[#DC2626]';
  } else if (metCount === 3 || metCount === 4) {
    strength = 'Fair';
    strengthScore = 2;
    strengthColor = 'bg-[#D97706]';
    strengthTextColor = 'text-[#D97706]';
  } else if (allMet && password.length < 10) {
    strength = 'Good';
    strengthScore = 3;
    strengthColor = 'bg-[#5B8C51]';
    strengthTextColor = 'text-[#5B8C51]';
  } else {
    strength = 'Strong';
    strengthScore = 4;
    strengthColor = 'bg-[#397A55]';
    strengthTextColor = 'text-[#397A55]';
  }

  return {
    requirements,
    allMet,
    metCount,
    strength,
    strengthScore,
    strengthColor,
    strengthTextColor,
  };
}
