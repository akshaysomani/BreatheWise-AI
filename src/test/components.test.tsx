import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AqiOverview } from '@/components/dashboard/AqiOverview';
import { PollutantCard } from '@/components/dashboard/PollutantCard';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { ExplainableRecommendationCard } from '@/components/dashboard/ExplainableRecommendationCard';
import { RoutineCard } from '@/components/dashboard/RoutineCard';
import { ImpactMetricCard } from '@/components/dashboard/ImpactMetricCard';

describe('UI Component Foundation Tests (M1)', () => {
  describe('Button Component', () => {
    it('renders with default props and text', () => {
      render(<Button>Click Me</Button>);
      const btn = screen.getByRole('button', { name: /click me/i });
      expect(btn).toBeInTheDocument();
      expect(btn).not.toBeDisabled();
    });

    it('renders loading spinner and disables button when isLoading is true', () => {
      render(<Button isLoading>Submit</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });

    it('renders with primary and outline variants', () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-[#397A55]');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('border-[#E2E8DE]');
    });

    it('handles click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Action</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Card Component', () => {
    it('renders Card with Header, Title, Description, and Content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Air Quality Radar</CardTitle>
            <CardDescription>Real-time station monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <p>AQI 210 Very Unhealthy</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByText('Air Quality Radar')).toBeInTheDocument();
      expect(screen.getByText('Real-time station monitoring')).toBeInTheDocument();
      expect(screen.getByText('AQI 210 Very Unhealthy')).toBeInTheDocument();
    });
  });

  describe('Badge Component', () => {
    it('renders success and warning badges', () => {
      const { rerender } = render(<Badge variant="success">Good Air</Badge>);
      expect(screen.getByText('Good Air')).toBeInTheDocument();
      expect(screen.getByText('Good Air')).toHaveClass('text-[#287A4B]');

      rerender(<Badge variant="warning">Smog Alert</Badge>);
      expect(screen.getByText('Smog Alert')).toBeInTheDocument();
      expect(screen.getByText('Smog Alert')).toHaveClass('text-[#A86B16]');
    });
  });

  describe('Alert Component', () => {
    it('renders with role="alert" and handles close trigger', () => {
      const handleClose = vi.fn();
      render(
        <Alert variant="warning" title="Inversion Advisory" onClose={handleClose}>
          Trapped particulate concentrations peak during early morning.
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Inversion Advisory')).toBeInTheDocument();
      expect(screen.getByText(/trapped particulate concentrations/i)).toBeInTheDocument();

      const closeBtn = screen.getByLabelText(/dismiss alert/i);
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Input and Select Components', () => {
    it('renders Input with accessible label, helper text, and error state', () => {
      const { rerender } = render(
        <Input label="Room Area" helperText="Enter in sq ft" />
      );
      expect(screen.getByLabelText('Room Area')).toBeInTheDocument();
      expect(screen.getByText('Enter in sq ft')).toBeInTheDocument();

      rerender(
        <Input label="Room Area" error="Room area is required" />
      );
      expect(screen.getByRole('alert')).toHaveTextContent('Room area is required');
      expect(screen.getByLabelText('Room Area')).toHaveAttribute('aria-invalid', 'true');
    });

    it('renders Select with options and accessible label', () => {
      render(
        <Select
          label="Housing Type"
          options={[
            { value: 'apartment', label: 'Apartment' },
            { value: 'house', label: 'Standalone House' },
          ]}
        />
      );

      const select = screen.getByLabelText('Housing Type');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Apartment')).toBeInTheDocument();
      expect(screen.getByText('Standalone House')).toBeInTheDocument();
    });
  });

  describe('Modal Dialog Component', () => {
    it('renders dialog when isOpen is true and calls onClose on Escape', () => {
      const handleClose = vi.fn();
      const { rerender } = render(
        <Modal isOpen={true} onClose={handleClose} title="CADR Calculator">
          <p>Dialog body content</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('CADR Calculator')).toBeInTheDocument();
      expect(screen.getByText('Dialog body content')).toBeInTheDocument();

      // Trigger Escape key
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Verify unmount when isOpen is false
      rerender(
        <Modal isOpen={false} onClose={handleClose} title="CADR Calculator">
          <p>Dialog body content</p>
        </Modal>
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Dashboard Presentation Components', () => {
    it('renders AqiOverview with AQI number, station name, and sample fixture flag', () => {
      render(
        <AqiOverview
          aqi={265}
          category="veryUnhealthy"
          dominantPollutant="PM2.5"
          city="Delhi NCR"
          stationName="Anand Vihar #DL014"
          stationDistanceKm={1.8}
          lastUpdated="15 mins ago"
          isSampleFixture={true}
        />
      );

      expect(screen.getByText('265')).toBeInTheDocument();
      expect(screen.getByText(/very unhealthy/i)).toBeInTheDocument();
      expect(screen.getByText(/SAMPLE FIXTURE — NOT LIVE DATA/i)).toBeInTheDocument();
      expect(screen.getByText(/Anand Vihar #DL014/i)).toBeInTheDocument();
    });

    it('renders PollutantCard with measured value, unit, and standard limit comparison', () => {
      render(
        <PollutantCard
          name="Fine Particulates"
          chemicalFormula="PM2.5"
          value={214.8}
          unit="µg/m³"
          standardLimit={15}
          status="hazardous"
          description="Dangerous fine particles penetrating deep into lungs."
        />
      );

      expect(screen.getByText('Fine Particulates')).toBeInTheDocument();
      expect(screen.getByText('PM2.5')).toBeInTheDocument();
      expect(screen.getByText('214.8')).toBeInTheDocument();
      expect(screen.getByText('14.3x Guideline')).toBeInTheDocument();
    });

    it('renders TrendChart with SVG line and ventilation window highlights', () => {
      const sampleData = [
        { hour: '06:00', aqi: 280, pm25: 230 },
        { hour: '13:00', aqi: 140, pm25: 55, isVentilationWindow: true },
        { hour: '18:00', aqi: 220, pm25: 170 },
      ];

      render(<TrendChart data={sampleData} />);
      expect(screen.getByLabelText(/24-Hour Air Quality Trend Line Graph/i)).toBeInTheDocument();
      expect(screen.getByText('06:00')).toBeInTheDocument();
      expect(screen.getByText('13:00')).toBeInTheDocument();
      expect(screen.getByText('18:00')).toBeInTheDocument();
    });

    it('renders ExplainableRecommendationCard with all 6 explainability fields', () => {
      render(
        <ExplainableRecommendationCard
          id="rec-test"
          category="Indoor HEPA"
          action="Run HEPA at 180 CFM Continuous"
          scientificMechanism="Building infiltration rate leaks PM2.5 indoors continuously."
          expectedBenefit="Reduces child bronchial irritation."
          quantifiedImpact="Estimated 82% particulate drop."
          assumptionsAndUncertainty="Assumes closed windows."
          implementationSteps={['Place purifier 3ft from wall', 'Close bedroom door']}
        />
      );

      expect(screen.getByText('Run HEPA at 180 CFM Continuous')).toBeInTheDocument();
      expect(screen.getByText(/Scientific Mechanism/i)).toBeInTheDocument();
      expect(screen.getByText(/Building infiltration rate/i)).toBeInTheDocument();
      expect(screen.getByText(/Reduces child bronchial irritation/i)).toBeInTheDocument();
      expect(screen.getByText('Place purifier 3ft from wall')).toBeInTheDocument();

      // Toggle technical audit drawer
      const toggleBtn = screen.getByText(/View Impact & Uncertainty Audit/i);
      fireEvent.click(toggleBtn);
      expect(screen.getByText(/Estimated 82% particulate drop/i)).toBeInTheDocument();
      expect(screen.getByText(/Assumes closed windows/i)).toBeInTheDocument();
    });

    it('renders RoutineCard with commute mode comparison and inhaled dose reduction', () => {
      render(
        <RoutineCard
          title="Daily Office Commute"
          distanceKm={14}
          origin="Sector 62"
          destination="Connaught Place"
          baselineMode="Solo Car"
          recommendedMode="Electric Metro"
          inhaledDoseReductionPercent={64}
          co2AvoidedKg={2.08}
          safetyReason="Underground metro air is filtered, reducing lung particulate exposure."
        />
      );

      expect(screen.getByText('Daily Office Commute')).toBeInTheDocument();
      expect(screen.getByText('Solo Car')).toBeInTheDocument();
      expect(screen.getByText('Electric Metro')).toBeInTheDocument();
      expect(screen.getByText('-64% Intake')).toBeInTheDocument();
      expect(screen.getByText('2.08 kg CO₂e')).toBeInTheDocument();
    });

    it('renders ImpactMetricCard with value, unit, and expandable calculation formula', () => {
      render(
        <ImpactMetricCard
          label="CO2 Avoided"
          value="48.6"
          unit="kg CO₂e"
          period="Past 30 Days"
          formula="Distance × (Car Baseline - Metro Baseline)"
          baseline="DEFRA Light Vehicle 171 g/km"
          uncertaintyMargin="±15%"
        />
      );

      expect(screen.getByText('48.6')).toBeInTheDocument();
      expect(screen.getByText('kg CO₂e')).toBeInTheDocument();

      const toggleFormula = screen.getByText(/Show Calculation Math/i);
      fireEvent.click(toggleFormula);
      expect(screen.getByText(/DEFRA Light Vehicle 171 g\/km/i)).toBeInTheDocument();
      expect(screen.getByText(/Uncertainty: ±15%/i)).toBeInTheDocument();
    });
  });
});
