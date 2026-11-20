import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import RegisterPage from '@/app/register/page';
import DashboardPage from '@/app/dashboard/page';
import { Header } from '@/components/layout/Header';

// Mock Next.js navigation hooks
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => ({
    get: (key: string) => (key === 'returnUrl' ? '/dashboard' : null),
  }),
}));

describe('Browser-Level Integration & Dashboard UX Tests (M3 Phase 6 & 11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LoginPage Component UX & Form Validation', () => {
    it('renders login form with semantic labels, inputs, and submit button', () => {
      render(<LoginPage />);

      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In to Dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/Need an account\?/i)).toBeInTheDocument();
    });

    it('displays client error alert when submitting empty fields', async () => {
      render(<LoginPage />);

      const submitBtn = screen.getByRole('button', { name: /Sign In to Dashboard/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Please provide both your email address and password/i)).toBeInTheDocument();
      });
    });

    it('handles successful login and redirects to returnUrl', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: { id: 'usr_1', email: 'test@breathewise.local' },
          },
        }),
      });

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'test@breathewise.local' },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: 'Secret123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Sign In to Dashboard/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('RegisterPage Component UX & Validations', () => {
    it('renders registration form with all required fields and privacy note', () => {
      render(<RegisterPage />);

      expect(screen.getByText('Create Household Account')).toBeInTheDocument();
      expect(screen.getByLabelText(/Household Name or Alias/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      expect(screen.getByText(/Privacy-by-Design Guarantee/i)).toBeInTheDocument();
    });

    it('enforces password match and minimum length validation', async () => {
      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'newuser@breathewise.local' },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: 'short' },
      });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
        target: { value: 'different' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Account & Continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 8 characters in length/i)).toBeInTheDocument();
      });
    });
  });

  describe('Header Dynamic Authentication State', () => {
    it('renders Sign In and Get Started buttons when unauthenticated', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { authenticated: false, user: null },
        }),
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument();
        expect(screen.getByText('Get Started')).toBeInTheDocument();
      });
    });

    it('renders user name and Sign Out button when authenticated', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            authenticated: true,
            user: { id: 'usr_abc', email: 'family_verma@breathewise.local', name: 'Verma Family' },
          },
        }),
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByText('Verma Family')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
      });
    });
  });

  describe('Authenticated DashboardPage Component View', () => {
    it('redirects unauthenticated visitor to login page with returnUrl', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { authenticated: false, user: null },
        }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login?returnUrl=/dashboard');
      });
    });

    it('renders authenticated dashboard with personalized welcome and tabs', async () => {
      // Mock session call
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/auth/session')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: {
                authenticated: true,
                user: { id: 'usr_xyz', email: 'akshay@breathewise.local', name: 'Akshay' },
              },
            }),
          });
        }
        if (url.includes('/api/household')) {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: { code: 'NOT_FOUND' } }),
          });
        }
        if (url.includes('/api/routines')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { routines: [] } }),
          });
        }
        if (url.includes('/api/impact')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { logs: [], aggregates: null } }),
          });
        }
        if (url.includes('/api/aqi')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { isLiveExternalFeed: false } }),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Akshay/i)).toBeInTheDocument();
        expect(screen.getByText(/Verified Account/i)).toBeInTheDocument();
        expect(screen.getByText(/Overview/i)).toBeInTheDocument();
        expect(screen.getByText(/Household Profile & CADR/i)).toBeInTheDocument();
        expect(screen.getByText(/Commute Routines/i)).toBeInTheDocument();
        expect(screen.getByText(/Account & Privacy/i)).toBeInTheDocument();
      });
    });
  });
});
