import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommunityWorkspace } from '@/components/dashboard/CommunityWorkspace';

describe('CommunityWorkspace UI — Form Continuous Typing & Focus Retention', () => {
  const mockReports = [
    {
      id: 'rep-1',
      reportType: 'VISIBLE_SMOG',
      severity: 'SEVERE',
      description: 'Citizen observation test from neighbor.',
      fuzzedLatitude: 28.61,
      fuzzedLongitude: 77.20,
      neighborhood: 'Central Delhi',
      isOfficialData: false,
      upvotes: 2,
      status: 'ACTIVE',
      createdAt: '2026-11-22T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/community/reports') && (!init?.method || init?.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              reports: mockReports,
              totalCount: mockReports.length,
            },
          }),
        });
      }
      if (urlStr.includes('/api/community/reports') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            data: {
              id: 'rep-new',
              isOfficialData: false,
            },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: {} }),
      });
    }) as any;
  });

  it('renders CommunityWorkspace and allows opening the observation submission modal', async () => {
    render(<CommunityWorkspace userLat={28.61} userLon={77.20} userCity="Delhi" />);

    // Wait for feed to load
    await waitFor(() => {
      expect(screen.getByText('Community Environmental Intelligence')).toBeInTheDocument();
    });

    // Click "Report Local Condition" button
    const openBtn = screen.getByRole('button', { name: /report local condition/i });
    fireEvent.click(openBtn);

    // Modal should be visible
    expect(screen.getByText('Submit Local Environmental Observation')).toBeInTheDocument();
    expect(screen.getByLabelText(/neighborhood/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe what you see or smell/i)).toBeInTheDocument();
  });

  it('maintains continuous focus while typing multi-character string in Neighborhood input', async () => {
    render(<CommunityWorkspace userLat={28.61} userLon={77.20} userCity="Delhi" />);

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /report local condition/i }));
    const neighborhoodInput = screen.getByLabelText(/neighborhood/i) as HTMLInputElement;

    // Focus input
    neighborhoodInput.focus();
    expect(document.activeElement).toBe(neighborhoodInput);

    // Simulate typing character by character: "Sector 62, Near City Center Park"
    const testString = 'Sector 62, Near City Center Park';
    let currentVal = '';
    for (const char of testString) {
      currentVal += char;
      fireEvent.change(neighborhoodInput, { target: { value: currentVal } });
      // Input MUST still have focus after every single keystroke!
      expect(document.activeElement).toBe(neighborhoodInput);
      expect(neighborhoodInput.value).toBe(currentVal);
    }

    expect(neighborhoodInput.value).toBe(testString);
  });

  it('maintains continuous focus while typing full sentence in Description textarea', async () => {
    render(<CommunityWorkspace userLat={28.61} userLon={77.20} userCity="Delhi" />);

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /report local condition/i }));
    const descTextarea = screen.getByPlaceholderText(/describe what you see or smell/i) as HTMLTextAreaElement;

    // Focus textarea
    descTextarea.focus();
    expect(document.activeElement).toBe(descTextarea);

    // Simulate typing a full descriptive sentence
    const fullSentence =
      'Dense white smoke observed drifting eastward from the industrial sector along with a strong chemical odor.';
    let currentVal = '';
    for (let i = 0; i < fullSentence.length; i++) {
      currentVal += fullSentence[i];
      fireEvent.change(descTextarea, { target: { value: currentVal } });
      // Textarea MUST retain focus on every keystroke
      expect(document.activeElement).toBe(descTextarea);
    }

    expect(descTextarea.value).toBe(fullSentence);
  });

  it('handles spaces, backspaces, and punctuation without losing focus or resetting', async () => {
    render(<CommunityWorkspace userLat={28.61} userLon={77.20} userCity="Delhi" />);

    fireEvent.click(screen.getByRole('button', { name: /report local condition/i }));
    const neighborhoodInput = screen.getByLabelText(/neighborhood/i) as HTMLInputElement;

    neighborhoodInput.focus();

    // Type with spaces and punctuation
    fireEvent.change(neighborhoodInput, { target: { value: 'Sector 18 - Block A!' } });
    expect(document.activeElement).toBe(neighborhoodInput);
    expect(neighborhoodInput.value).toBe('Sector 18 - Block A!');

    // Simulate backspace (deleting characters)
    fireEvent.change(neighborhoodInput, { target: { value: 'Sector 18 - Block' } });
    expect(document.activeElement).toBe(neighborhoodInput);
    expect(neighborhoodInput.value).toBe('Sector 18 - Block');
  });

  it('toggles between All Communities and Near Me scope', async () => {
    render(<CommunityWorkspace userLat={28.61} userLon={77.20} userCity="Delhi" />);

    await waitFor(() => {
      expect(screen.getByText('All Communities')).toBeInTheDocument();
      expect(screen.getByText('Near Me')).toBeInTheDocument();
    });

    const nearMeBtn = screen.getByRole('button', { name: /near me/i });
    fireEvent.click(nearMeBtn);

    // Should fetch with lat & lon & radiusKm
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('radiusKm=50'),
        expect.anything()
      );
    });

    const allBtn = screen.getByRole('button', { name: /all communities/i });
    fireEvent.click(allBtn);

    // Should fetch with scope=all
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('scope=all'),
        expect.anything()
      );
    });
  });
});
