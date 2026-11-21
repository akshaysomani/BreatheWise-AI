import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '@/app/register/page';
import { evaluatePasswordRequirements } from '@/lib/validations/password-requirements';
import { registerSchema } from '@/lib/validations/auth.schema';
import { POST as postRegister } from '@/app/api/auth/register/route';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db';
import { resetRateLimits } from '@/lib/rate-limiter';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe('Strong Password Checklist & Validation Suite (MOSAIC Module)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  // -------------------------------------------------------------
  // 1-6: Password Requirement Engine Tests
  // -------------------------------------------------------------
  describe('Rule Evaluation & Strength Scoring', () => {
    it('1. Correctly flags password shorter than 8 characters as invalid for min-length', () => {
      const res = evaluatePasswordRequirements('Pass1!');
      const minLength = res.requirements.find((r) => r.id === 'min-length');
      expect(minLength?.valid).toBe(false);
      expect(res.allMet).toBe(false);
      expect(res.strength).toBe('Weak');
    });

    it('2. Correctly flags password without uppercase letters as invalid', () => {
      const res = evaluatePasswordRequirements('lowercase123!@#');
      const uppercase = res.requirements.find((r) => r.id === 'uppercase');
      expect(uppercase?.valid).toBe(false);
      expect(res.allMet).toBe(false);
    });

    it('3. Correctly flags password without lowercase letters as invalid', () => {
      const res = evaluatePasswordRequirements('UPPERCASE123!@#');
      const lowercase = res.requirements.find((r) => r.id === 'lowercase');
      expect(lowercase?.valid).toBe(false);
      expect(res.allMet).toBe(false);
    });

    it('4. Correctly flags password without numbers as invalid', () => {
      const res = evaluatePasswordRequirements('NoNumbersHere!@#');
      const number = res.requirements.find((r) => r.id === 'number');
      expect(number?.valid).toBe(false);
      expect(res.allMet).toBe(false);
    });

    it('5. Correctly flags password without special characters as invalid', () => {
      const res = evaluatePasswordRequirements('NoSpecialChars123');
      const special = res.requirements.find((r) => r.id === 'special');
      expect(special?.valid).toBe(false);
      expect(res.allMet).toBe(false);
    });

    it('6. Successfully verifies password satisfying all 5 requirements with Strong rating', () => {
      const res = evaluatePasswordRequirements('StrongPass123!@#');
      expect(res.allMet).toBe(true);
      expect(res.metCount).toBe(5);
      expect(res.requirements.every((r) => r.valid)).toBe(true);
      expect(res.strength).toBe('Strong');
      expect(res.strengthScore).toBe(4);
    });
  });

  // -------------------------------------------------------------
  // 7-8: Interactive Component Checklist & Confirmation
  // -------------------------------------------------------------
  describe('RegisterPage Interactive Component Checklist', () => {
    it('7. Displays live checkmarks as user types and shows mismatch for non-matching confirmation', () => {
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const confirmInput = screen.getByLabelText(/Confirm Password/i);

      fireEvent.change(emailInput, { target: { value: 'test@breathewise.ai' } });

      // Initially requirements are unmet
      expect(screen.getByTestId('req-min-length')).toHaveAttribute('data-valid', 'false');
      expect(screen.getByTestId('req-uppercase')).toHaveAttribute('data-valid', 'false');

      // Type partial password
      fireEvent.change(passwordInput, { target: { value: 'Abc' } });
      expect(screen.getByTestId('req-uppercase')).toHaveAttribute('data-valid', 'true');
      expect(screen.getByTestId('req-lowercase')).toHaveAttribute('data-valid', 'true');
      expect(screen.getByTestId('req-min-length')).toHaveAttribute('data-valid', 'false');

      // Type full valid password
      fireEvent.change(passwordInput, { target: { value: 'BreatheWise123!' } });
      expect(screen.getByTestId('req-min-length')).toHaveAttribute('data-valid', 'true');
      expect(screen.getByTestId('req-uppercase')).toHaveAttribute('data-valid', 'true');
      expect(screen.getByTestId('req-lowercase')).toHaveAttribute('data-valid', 'true');
      expect(screen.getByTestId('req-number')).toHaveAttribute('data-valid', 'true');
      expect(screen.getByTestId('req-special')).toHaveAttribute('data-valid', 'true');
      expect(screen.getByTestId('password-strength-label')).toHaveTextContent(/Strong/i);

      // Confirm mismatch
      fireEvent.change(confirmInput, { target: { value: 'DifferentPassword123!' } });
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();

      // Submit should show mismatch error
      fireEvent.click(screen.getByRole('button', { name: /Create Account & Continue/i }));
      expect(screen.getByText(/Passwords do not match. Please re-enter your password./i)).toBeInTheDocument();
    });

    it('8. Confirms matching passwords and displays positive match indicator', () => {
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const confirmInput = screen.getByLabelText(/Confirm Password/i);

      fireEvent.change(emailInput, { target: { value: 'test@breathewise.ai' } });

      fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
      fireEvent.change(confirmInput, { target: { value: 'ValidPass123!' } });

      expect(screen.getByTestId('password-match-indicator')).toBeInTheDocument();
      expect(screen.getByText(/Passwords match/i)).toBeInTheDocument();
      expect(screen.queryByText(/Passwords do not match/i)).toBeNull();
    });
  });

  // -------------------------------------------------------------
  // 9-12: Backend API, Security, Redaction & Schema Enforcements
  // -------------------------------------------------------------
  describe('Backend Validation, Zero Exposure & Rate Limiting', () => {
    it('9. Backend schema rejects passwords missing any of the 5 rules with detailed errors', () => {
      // Missing uppercase
      const noUpper = registerSchema.safeParse({ email: 'u@test.com', password: 'password123!' });
      expect(noUpper.success).toBe(false);

      // Missing lowercase
      const noLower = registerSchema.safeParse({ email: 'u@test.com', password: 'PASSWORD123!' });
      expect(noLower.success).toBe(false);

      // Missing number
      const noNum = registerSchema.safeParse({ email: 'u@test.com', password: 'Password!@#' });
      expect(noNum.success).toBe(false);

      // Missing special
      const noSpecial = registerSchema.safeParse({ email: 'u@test.com', password: 'Password123' });
      expect(noSpecial.success).toBe(false);

      // Too short
      const tooShort = registerSchema.safeParse({ email: 'u@test.com', password: 'P1!' });
      expect(tooShort.success).toBe(false);
    });

    it('10. Registration API succeeds with valid strong password (201 Created)', async () => {
      const email = `valid_strong_${Date.now()}@breathewise.test`;
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Strong Password User',
          email,
          password: 'BreatheWise2026!#',
        }),
      });

      const res = await postRegister(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe(email);
    });

    it('11. Rejects duplicate registration with HTTP 409 Conflict', async () => {
      const email = `dup_strong_${Date.now()}@breathewise.test`;
      const createReq = () =>
        new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email,
            password: 'BreatheWise2026!#',
          }),
        });

      const res1 = await postRegister(createReq());
      expect(res1.status).toBe(201);

      const res2 = await postRegister(createReq());
      expect(res2.status).toBe(409);
    });

    it('12. Password values and password hashes are never exposed in API responses or logs', async () => {
      const email = `privacy_audit_${Date.now()}@breathewise.test`;
      const password = 'SuperSecretPassword2026!#';

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Privacy Audit',
          email,
          password,
        }),
      });

      const res = await postRegister(req);
      const text = await res.text();

      // Password and hash never in body
      expect(text).not.toContain(password);
      expect(text).not.toContain('scrypt$');

      // Check logger redaction
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logger.info('Register submission attempt', { password, email });
      expect(logSpy).toHaveBeenCalled();
      const lastCall = JSON.parse(logSpy.mock.calls[logSpy.mock.calls.length - 1][0]);
      expect(lastCall.context.password).toBe('[REDACTED]');
      logSpy.mockRestore();
    });
  });
});
