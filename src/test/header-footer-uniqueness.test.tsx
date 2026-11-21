import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import RootLayout from '@/app/layout';
import AssistantPage from '@/app/assistant/page';
import TipsPage from '@/app/tips/page';
import AirQualityPage from '@/app/air-quality/page';
import ImpactPage from '@/app/impact/page';
import AboutPage from '@/app/about/page';
import PrivacyPolicyPage from '@/app/privacy-policy/page';
import TermsOfUsePage from '@/app/terms-of-use/page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/assistant',
  useSearchParams: () => ({
    get: () => null,
  }),
}));

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        authenticated: true,
        user: { id: 'test-user', email: 'test@breathewise.ai', name: 'Tester' },
        profile: { city: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714 },
      },
    }),
  } as any);
});

describe('Header & Footer Component Uniqueness Regression Test', () => {
  it('Pages do NOT contain internal Header or Footer tags (delegated strictly to RootLayout)', () => {
    const { container: assistantContainer } = render(<AssistantPage />);
    expect(assistantContainer.querySelectorAll('header').length).toBe(0);
    expect(assistantContainer.querySelectorAll('footer').length).toBe(0);

    const { container: tipsContainer } = render(<TipsPage />);
    expect(tipsContainer.querySelectorAll('header').length).toBe(0);
    expect(tipsContainer.querySelectorAll('footer').length).toBe(0);

    const { container: aqiContainer } = render(<AirQualityPage />);
    expect(aqiContainer.querySelectorAll('header').length).toBe(0);
    expect(aqiContainer.querySelectorAll('footer').length).toBe(0);

    const { container: impactContainer } = render(<ImpactPage />);
    expect(impactContainer.querySelectorAll('header').length).toBe(0);
    expect(impactContainer.querySelectorAll('footer').length).toBe(0);

    const { container: aboutContainer } = render(<AboutPage />);
    expect(aboutContainer.querySelectorAll('header').length).toBe(0);
    expect(aboutContainer.querySelectorAll('footer').length).toBe(0);

    const { container: privacyContainer } = render(<PrivacyPolicyPage />);
    expect(privacyContainer.querySelectorAll('header').length).toBe(0);
    expect(privacyContainer.querySelectorAll('footer').length).toBe(0);

    const { container: termsContainer } = render(<TermsOfUsePage />);
    expect(termsContainer.querySelectorAll('header').length).toBe(0);
    expect(termsContainer.querySelectorAll('footer').length).toBe(0);
  });
});
