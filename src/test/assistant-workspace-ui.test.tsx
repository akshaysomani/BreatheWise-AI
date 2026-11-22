import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssistantWorkspace } from '@/components/dashboard/AssistantWorkspace';

describe('AssistantWorkspace — Daily Action Plan Regeneration UI Workflow', () => {
  const planTier0 = {
    summary: 'Plan Grounding: Delhi (Anand Vihar) CAAQMS Station Baseline',
    provenance: 'HISTORICAL_BASELINE_ADAPTED',
    generatedAt: '2026-11-22T08:00:00.000Z',
    disclaimer: 'Not medical advice. Environmental exposure reduction only.',
    periods: [
      {
        period: 'MORNING',
        timeRange: '06:00 – 10:00',
        action: 'Tier 0: Commute in Sealed Cabin & Exercise Indoors',
        reason: 'Severe nocturnal inversion trapping PM2.5 at breathing zone.',
        environmentalEvidence: 'Historical station record from Anand Vihar (AQI 318, PM2.5 165.4 µg/m³).',
        implementationSteps: [
          'Switch vehicle HVAC to recirculation mode.',
          'Wear N95/FFP2 respirator if outdoor transit exceeds 15 minutes.',
          'Safety Note: Do not keep home hermetically sealed indefinitely. If indoor space becomes stuffy or CO2 exceeds 1,000 ppm, open windows for a brief 5-minute cross-ventilation flush.',
        ],
        assumptions: 'CADR-calibrated HEPA filtration active.',
        uncertainty: 'Station data represents 24-hour historical baseline.',
        freshnessAndSource: 'Station: Anand Vihar — DPCC | Historical Reference',
      },
      {
        period: 'AFTERNOON',
        timeRange: '12:00 – 16:00',
        action: 'Tier 0: Maintain Closed Windows and Continuous HEPA Air Filtration',
        reason: 'Peak convective boundary layer particulate concentration.',
        environmentalEvidence: 'Station: Anand Vihar | Dominant: PM2.5',
        implementationSteps: ['Maintain True HEPA filtration.'],
        assumptions: 'Windows closed.',
        uncertainty: 'Moderate.',
        freshnessAndSource: 'Station: Anand Vihar',
      },
      {
        period: 'EVENING',
        timeRange: '18:00 – 22:00',
        action: 'Tier 0: Seal Bedroom Windows & Engage HEPA Purifier',
        reason: 'Nocturnal boundary layer collapse.',
        environmentalEvidence: 'Station: Anand Vihar',
        implementationSteps: ['Run bedroom purifier on low-noise sleep mode.'],
        assumptions: 'Standard bedroom volume.',
        uncertainty: 'Low.',
        freshnessAndSource: 'Station: Anand Vihar',
      },
    ],
  };

  const planTier1 = {
    summary: 'Plan Grounding: Delhi (Anand Vihar) CAAQMS Station Baseline (Tier 1)',
    provenance: 'HISTORICAL_BASELINE_ADAPTED',
    generatedAt: '2026-11-22T08:05:00.000Z',
    disclaimer: 'Not medical advice. Environmental exposure reduction only.',
    periods: [
      {
        period: 'MORNING',
        timeRange: '06:00 – 10:00',
        action: 'Tier 1: Pre-Treat Indoor Breathing Zone & Filtered Low-Resistance Transit',
        reason: 'Micro-environmental particulate shielding during peak commute.',
        environmentalEvidence: 'Station: Anand Vihar (PM2.5 165.4 µg/m³).',
        implementationSteps: [
          'Pre-filter living spaces for 30 minutes prior to waking.',
          'Safety Note: Do not keep home hermetically sealed indefinitely. If indoor space becomes stuffy or CO2 exceeds 1,000 ppm, open windows for a brief 5-minute cross-ventilation flush.',
        ],
        assumptions: 'N95 fit tested.',
        uncertainty: 'Baseline derived.',
        freshnessAndSource: 'Station: Anand Vihar',
      },
      {
        period: 'AFTERNOON',
        timeRange: '12:00 – 16:00',
        action: 'Tier 1: High-Speed Purifier Air Cleansing & Clean Zone Segregation',
        reason: 'Aerosol clearance in highest occupied rooms.',
        environmentalEvidence: 'Station: Anand Vihar',
        implementationSteps: ['Run purifier on maximum CADR setting for 45 minutes.'],
        assumptions: 'Doors closed.',
        uncertainty: 'Low.',
        freshnessAndSource: 'Station: Anand Vihar',
      },
      {
        period: 'EVENING',
        timeRange: '18:00 – 22:00',
        action: 'Tier 1: Sleep Sanctuary Purifier Cadence & Dust Stabilization',
        reason: 'Overnight particulate minimization.',
        environmentalEvidence: 'Station: Anand Vihar',
        implementationSteps: ['Position purifier within 2 meters of bed.'],
        assumptions: 'Sleep mode 35 dB.',
        uncertainty: 'Low.',
        freshnessAndSource: 'Station: Anand Vihar',
      },
    ],
  };

  const planTier2 = {
    summary: 'Plan Grounding: Delhi (Anand Vihar) CAAQMS Station Baseline (Tier 2)',
    provenance: 'HISTORICAL_BASELINE_ADAPTED',
    generatedAt: '2026-11-22T08:10:00.000Z',
    disclaimer: 'Not medical advice. Environmental exposure reduction only.',
    periods: [
      {
        period: 'MORNING',
        timeRange: '06:00 – 10:00',
        action: 'Tier 2: Eliminate Indoor Emission Sources & Micro-Ventilation Flush',
        reason: 'Avoid concurrent indoor combustion while outdoor levels are hazardous.',
        environmentalEvidence: 'Station: Anand Vihar',
        implementationSteps: [
          'Avoid frying, incense, or unvented combustion.',
          'Safety Note: Do not keep home hermetically sealed indefinitely. If indoor space becomes stuffy or CO2 exceeds 1,000 ppm, open windows for a brief 5-minute cross-ventilation flush.',
        ],
        assumptions: 'Electric kettle/exhaust used.',
        uncertainty: 'Low.',
        freshnessAndSource: 'Station: Anand Vihar',
      },
      {
        period: 'AFTERNOON',
        timeRange: '12:00 – 16:00',
        action: 'Tier 2: Timed 5-Minute Cross-Ventilation Flush & Post-Flush Re-Purging',
        reason: 'Prevent stale air and CO2 elevation beyond 1000 ppm.',
        environmentalEvidence: 'Station: Anand Vihar',
        implementationSteps: ['Execute rapid 5-minute cross-ventilation window flush.'],
        assumptions: 'Window opened 5 mins.',
        uncertainty: 'Low.',
        freshnessAndSource: 'Station: Anand Vihar',
      },
      {
        period: 'EVENING',
        timeRange: '18:00 – 22:00',
        action: 'Tier 2: Wet-Mop Particulate Trapping & Bedside CADR Optimization',
        reason: 'Settle and capture resuspended PM10/PM2.5 particles.',
        environmentalEvidence: 'Station: Anand Vihar',
        implementationSteps: ['Damp-mop hard floors to trap settled dust without dry sweeping.'],
        assumptions: 'Damp microfiber cloth used.',
        uncertainty: 'Low.',
        freshnessAndSource: 'Station: Anand Vihar',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles 3 consecutive regeneration clicks with changing variationIndex and updates DOM', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Initial mount calls
    fetchMock.mockImplementation(async (url: string, opts?: any) => {
      if (url === '/api/assistant/routine') {
        const body = JSON.parse(opts?.body || '{}');
        if (body.variationIndex === 1) {
          return { ok: true, json: async () => ({ success: true, data: planTier1 }) };
        }
        if (body.variationIndex === 2) {
          return { ok: true, json: async () => ({ success: true, data: planTier2 }) };
        }
        return { ok: true, json: async () => ({ success: true, data: planTier0 }) };
      }
      if (url === '/api/assistant/indoor-advice') {
        return { ok: true, json: async () => ({ success: true, data: null }) };
      }
      return { ok: true, json: async () => ({ success: true }) };
    });

    render(
      <AssistantWorkspace
        initialLat={28.6469}
        initialLon={77.3160}
        userCity="Delhi (Anand Vihar)"
      />
    );

    // Switch to Daily Routine tab
    const routineTabBtn = screen.getByRole('button', { name: /Daily Routine/i });
    fireEvent.click(routineTabBtn);

    // Initial render verification
    await waitFor(() => {
      expect(screen.getByText(/Personalized Air-Quality Daily Action Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/Tier 0: Commute in Sealed Cabin & Exercise Indoors/i)).toBeInTheDocument();
    });

    // Check initial fetch parameters
    const initialCall = fetchMock.mock.calls.find((call) => call[0] === '/api/assistant/routine');
    expect(initialCall).toBeDefined();
    const initialBody = JSON.parse(initialCall![1].body);
    expect(initialBody.latitude).toBe(28.6469);
    expect(initialBody.longitude).toBe(77.3160);
    expect(initialBody.locationName).toBe('Delhi (Anand Vihar)');
    expect(initialBody.variationIndex).toBe(0);
    expect(initialBody.isRegeneration).toBe(false);

    // CLICK 1: Regenerate Daily Plan
    const regenBtn = screen.getByRole('button', { name: /Regenerate Daily Plan/i });
    fireEvent.click(regenBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tier 1: Pre-Treat Indoor Breathing Zone/i)).toBeInTheDocument();
    });

    // Verify 2nd fetch call had variationIndex: 1
    const call2 = fetchMock.mock.calls.filter((call) => call[0] === '/api/assistant/routine')[1];
    expect(call2).toBeDefined();
    const body2 = JSON.parse(call2![1].body);
    expect(body2.variationIndex).toBe(1);
    expect(body2.isRegeneration).toBe(true);

    // CLICK 2: Regenerate Daily Plan
    fireEvent.click(regenBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tier 2: Eliminate Indoor Emission Sources/i)).toBeInTheDocument();
    });

    // Verify 3rd fetch call had variationIndex: 2
    const call3 = fetchMock.mock.calls.filter((call) => call[0] === '/api/assistant/routine')[2];
    expect(call3).toBeDefined();
    const body3 = JSON.parse(call3![1].body);
    expect(body3.variationIndex).toBe(2);
    expect(body3.isRegeneration).toBe(true);

    // CLICK 3: Regenerate Daily Plan (cycles back to 0)
    fireEvent.click(regenBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tier 0: Commute in Sealed Cabin & Exercise Indoors/i)).toBeInTheDocument();
    });

    // Verify 4th fetch call had variationIndex: 0
    const call4 = fetchMock.mock.calls.filter((call) => call[0] === '/api/assistant/routine')[3];
    expect(call4).toBeDefined();
    const body4 = JSON.parse(call4![1].body);
    expect(body4.variationIndex).toBe(0);
    expect(body4.isRegeneration).toBe(true);
  });

  it('displays honest error alert and preserves existing plan on network failure', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Initial mount succeeds
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/assistant/routine') {
        return { ok: true, json: async () => ({ success: true, data: planTier0 }) };
      }
      return { ok: true, json: async () => ({ success: true }) };
    });

    render(
      <AssistantWorkspace
        initialLat={28.6469}
        initialLon={77.3160}
        userCity="Delhi (Anand Vihar)"
      />
    );

    const routineTabBtn = screen.getByRole('button', { name: /Daily Routine/i });
    fireEvent.click(routineTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tier 0: Commute in Sealed Cabin & Exercise Indoors/i)).toBeInTheDocument();
    });

    // Subsequent regeneration fails with 500 error
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/assistant/routine') {
        return {
          ok: false,
          json: async () => ({ error: { message: 'Upstream rate limit exceeded. Please retry in 30s.' } }),
        };
      }
      return { ok: true, json: async () => ({ success: true }) };
    });

    const regenBtn = screen.getByRole('button', { name: /Regenerate Daily Plan/i });
    fireEvent.click(regenBtn);

    await waitFor(() => {
      expect(screen.getByText(/Upstream rate limit exceeded\. Please retry in 30s\./i)).toBeInTheDocument();
      // Old plan is preserved, NOT wiped or falsely updated
      expect(screen.getByText(/Tier 0: Commute in Sealed Cabin & Exercise Indoors/i)).toBeInTheDocument();
    });
  });
});
