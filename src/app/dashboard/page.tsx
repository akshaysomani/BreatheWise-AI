'use client';

import React, { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { AqiOverview } from '@/components/dashboard/AqiOverview';
import { PollutantCard } from '@/components/dashboard/PollutantCard';
import { TrendChart, TrendDataPoint } from '@/components/dashboard/TrendChart';
import { ExplainableRecommendationCard } from '@/components/dashboard/ExplainableRecommendationCard';
import { RoutineCard } from '@/components/dashboard/RoutineCard';
import { ImpactMetricCard } from '@/components/dashboard/ImpactMetricCard';
import {
  Wind,
  ShieldAlert,
  Home,
  Flame,
  Radio,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardPage() {
  // Sample fixture data for M1 visual foundation
  const sampleTrendData: TrendDataPoint[] = [
    { hour: '00:00', aqi: 195, pm25: 145 },
    { hour: '03:00', aqi: 220, pm25: 170 },
    { hour: '06:00', aqi: 275, pm25: 225 }, // Nocturnal inversion peak
    { hour: '08:00', aqi: 290, pm25: 240 },
    { hour: '11:00', aqi: 210, pm25: 160 },
    { hour: '13:00', aqi: 135, pm25: 50, isVentilationWindow: true }, // Diurnal minimum
    { hour: '15:00', aqi: 140, pm25: 55, isVentilationWindow: true }, // Diurnal minimum
    { hour: '18:00', aqi: 215, pm25: 165 },
    { hour: '21:00', aqi: 250, pm25: 200 },
  ];

  const [activeTab, setActiveTab] = useState<'all' | 'indoor' | 'routines' | 'impact'>('all');

  return (
    <div className="py-8 lg:py-12 bg-[#F7F8F3] min-h-screen">
      <Container size="wide" className="space-y-8">
        {/* Dashboard Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2E8DE]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="accent" size="sm">
                M1 Visual Foundation
              </Badge>
              <span className="text-xs text-[#68766C]">Verified Design System Shell</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
              Air Quality & Household Defense Radar
            </h1>
            <p className="text-sm text-[#68766C] mt-1">
              Comprehensive environmental intelligence dashboard tailored for severe urban winter smog navigation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8DE] text-xs text-[#27352D] font-medium flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#287A4B] animate-pulse"></span>
              <span>Sample Station: Anand Vihar / Central Delhi</span>
            </div>
            <Badge variant="secondary" size="md">
              Dev Fixtures Active
            </Badge>
          </div>
        </div>

        {/* 10. Pollution Alert Banner */}
        <Alert
          variant="warning"
          title="Acute Smog Emergency Warning (PM2.5 > 180 µg/m³)"
        >
          Ground-level thermal inversion active across urban basin. Sensitive groups (infants, asthmatics, seniors) must keep windows sealed until the 13:00 diurnal mixing window. Run indoor HEPA purifiers on continuous medium/high.
        </Alert>

        {/* 1. Air Quality Overview Card */}
        <AqiOverview
          aqi={265}
          category="veryUnhealthy"
          dominantPollutant="PM2.5"
          city="Delhi NCR / Anand Vihar Station"
          stationName="CPCB Monitoring Station #DL014"
          stationDistanceKm={1.8}
          lastUpdated="Today, 08:30 IST (15 mins ago)"
          isSampleFixture={true}
        />

        {/* 2. Pollutant Measurement Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#27352D] font-[var(--font-heading)] flex items-center gap-2">
              <Wind className="w-5 h-5 text-[#397A55]" />
              Measured Particulate & Gas Telemetry
            </h3>
            <span className="text-xs text-[#68766C]">Standardized Units: µg/m³ & ppm</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PollutantCard
              name="Fine Particulates"
              chemicalFormula="PM2.5"
              value={214.8}
              unit="µg/m³"
              standardLimit={15}
              status="hazardous"
              description="Microscopic particles penetrating deep into bronchial passages and bloodstream."
            />
            <PollutantCard
              name="Coarse Dust"
              chemicalFormula="PM10"
              value={328.2}
              unit="µg/m³"
              standardLimit={45}
              status="hazardous"
              description="Inhalable dust from construction, road abrasion, and regional topsoil movement."
            />
            <PollutantCard
              name="Nitrogen Dioxide"
              chemicalFormula="NO₂"
              value={68.4}
              unit="µg/m³"
              standardLimit={25}
              status="unhealthy"
              description="Pungent combustion gas generated by heavy vehicle diesel exhaust and thermal plants."
            />
            <PollutantCard
              name="Ground Ozone"
              chemicalFormula="O₃"
              value={42.1}
              unit="µg/m³"
              standardLimit={100}
              status="good"
              description="Photochemical oxidant formed by sunlight reacting with volatile organic emissions."
            />
          </div>
        </div>

        {/* 4. Historical Trend & Diurnal Ventilation Window Chart */}
        <TrendChart data={sampleTrendData} />

        {/* Navigation Filter Tabs for Guidance Sections */}
        <div className="flex items-center gap-2 border-b border-[#E2E8DE] pb-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All Recommendations' },
            { id: 'indoor', label: 'Indoor Air & CADR' },
            { id: 'routines', label: 'Commute & Travel' },
            { id: 'impact', label: 'Impact Accounting' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-semibold rounded-[8px] transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#397A55] text-white shadow-2xs'
                  : 'bg-white text-[#27352D] border border-[#E2E8DE] hover:bg-[#F7F8F3]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 5. Explainable Recommendation Cards & 7. Indoor Air Tips */}
        {(activeTab === 'all' || activeTab === 'indoor') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#27352D] font-[var(--font-heading)]">
                  Personalized Family & Indoor Guidance
                </h3>
                <p className="text-xs text-[#68766C]">
                  Every recommendation follows the strict 6-field scientific explainability architecture.
                </p>
              </div>
              <Badge variant="default" size="sm">
                Household Profile: 2 Adults + 1 Asthmatic Child
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ExplainableRecommendationCard
                id="rec-01"
                category="Indoor HEPA Protocol"
                action="Operate Bedroom HEPA Purifier at 180 CFM Continuous Fan Speed"
                scientificMechanism="During severe smog, standard building infiltration rate (0.5 ACH) continuously leaks outdoor PM2.5 indoors. A CADR of 180 CFM in a 200 sq ft room achieves 5.0 Air Changes per Hour, maintaining steady-state indoor PM2.5 below 15 µg/m³."
                expectedBenefit="Reduces child bronchial irritation and prevents nocturnal asthma flare-ups by 78%."
                quantifiedImpact="Estimated indoor particulate reduction: 82% compared to unpurified baseline room."
                assumptionsAndUncertainty="Assumes closed windows with standard rubber weatherstripping. CADR tested on 0.3-micron particulate scale (±10% variance)."
                implementationSteps={[
                  'Position air purifier 3 feet away from walls for unobstructed airflow.',
                  'Close bedroom door to maintain isolated clean-air bubble.',
                  'Set speed to High from 22:00 to 07:00 during nocturnal peak inversion.',
                ]}
              />

              <ExplainableRecommendationCard
                id="rec-02"
                category="Ventilation Timing"
                action="Execute 20-Minute Cross-Ventilation Flush at 13:30 Today"
                scientificMechanism="Solar heating between 13:00 and 15:30 deepens the atmospheric boundary mixing layer, diluting outdoor ground-level PM2.5 to the daily low (135 AQI). Brief mechanical cross-ventilation expels accumulated indoor CO2 without saturating HEPA filters."
                expectedBenefit="Lowers indoor CO2 from >1400 ppm to <700 ppm, eliminating cognitive fatigue and headaches."
                quantifiedImpact="Indoor CO2 reduced by 50%; outdoor particulate ingress captured within 15 minutes of re-sealing."
                assumptionsAndUncertainty="Relies on hourly Copernicus CAMS boundary layer forecast (±15% timing variance based on cloud cover)."
                implementationSteps={[
                  'Open opposite-facing windows for exactly 20 minutes at 13:30.',
                  'Switch kitchen exhaust fan ON to assist cross-draft expulsion.',
                  'Close windows firmly at 13:50 and resume HEPA filtration.',
                ]}
              />
            </div>
          </div>
        )}

        {/* 6. Daily Routine Cards */}
        {(activeTab === 'all' || activeTab === 'routines') && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-[#27352D] font-[var(--font-heading)]">
                Smog-Aware Commute & Travel Optimizer
              </h3>
              <p className="text-xs text-[#68766C]">
                Balancing inhaled particulate dose against vehicle emissions. Safety strictly overrides green transit during hazardous smog.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RoutineCard
                title="Office Commute Corridor"
                distanceKm={14.2}
                origin="Sector 62, Noida"
                destination="Barakhamba Road, Connaught Place"
                baselineMode="Solo Gasoline Car (Traffic Jam)"
                recommendedMode="Electric Metro (Blue Line with Underground Filtered Air)"
                inhaledDoseReductionPercent={64}
                co2AvoidedKg={2.08}
                safetyReason="Underground metro cars feature mechanical air filtration. Riding the metro prevents 64% of particulate inhalation compared to sitting in idling road traffic, while eliminating 2.08 kg of CO2e."
              />

              <RoutineCard
                title="School Drop-Off & Errands Chaining"
                distanceKm={5.6}
                origin="Mayur Vihar Phase 1"
                destination="Preet Vihar Hub"
                baselineMode="Open Motorcycle / Scooter"
                recommendedMode="Filtered Rideshare / Carpool"
                inhaledDoseReductionPercent={82}
                co2AvoidedKg={0.45}
                safetyReason="Motorcycle transit exposes pediatric lungs directly to diesel tailpipe plumes. Combining school drop-off with grocery errands in a filtered vehicle prevents severe particulate deposition."
              />
            </div>
          </div>
        )}

        {/* 8. Sustainability Suggestions & 9. Environmental Impact Metrics */}
        {(activeTab === 'all' || activeTab === 'impact') && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-[#27352D] font-[var(--font-heading)]">
                Audit-Grade Environmental Impact Tracker
              </h3>
              <p className="text-xs text-[#68766C]">
                Calculated using UK DEFRA and US EPA passenger-km constants. Open formula inspection with explicit uncertainty bounds.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <ImpactMetricCard
                label="Transport CO₂e Avoided"
                value="48.6"
                unit="kg CO₂e"
                period="Past 30 Days"
                formula="Distance Shifted (320 km) × [0.171 kg/km (Car) - 0.035 kg/km (Metro)]"
                baseline="DEFRA Light Duty Gasoline Passenger Vehicle average 171 g CO2e/km"
                uncertaintyMargin="±15% (Traffic idling and grid carbon intensity)"
              />
              <ImpactMetricCard
                label="Tailpipe PM2.5 Prevented"
                value="142"
                unit="grams"
                period="Past 30 Days"
                formula="Shifted Distance × 0.015 g/km (Exhaust + Brake + Tire Wear Baseline)"
                baseline="Direct exhaust and non-exhaust brake particulate factor"
                uncertaintyMargin="±20% (Brake wear velocity variance)"
              />
              <ImpactMetricCard
                label="Clean Air Hours Logged"
                value="318"
                unit="hours"
                period="Past 30 Days"
                formula="Total hours indoor air maintained at <15 µg/m³ PM2.5 via verified CADR"
                baseline="Calculated room air exchange rate of 5.0 ACH"
                uncertaintyMargin="±10% (Room infiltration coefficient)"
              />
            </div>

            {/* Scientific Houseplant Myth Disclaimer Card */}
            <div className="p-4 rounded-[12px] bg-white border border-[#E2E8DE] shadow-2xs space-y-2">
              <h4 className="font-bold text-sm text-[#27352D] font-[var(--font-heading)] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#397A55]" />
                Scientific Honesty Notice: Houseplants vs. Mechanical HEPA Filtration
              </h4>
              <p className="text-xs text-[#68766C] leading-relaxed">
                Many popular blogs claim that houseplants (like snake plants or peace lilies) clean indoor smog. Peer-reviewed environmental studies show that natural phytoremediation in residential conditions produces less than 0.05 Clean Air Delivery Rate (CADR). A single standard HEPA filter cleans 100 to 200 times more air per minute than 50 indoor plants. BreatheWise AI bases all indoor recommendations on verified mechanical filtration and airtight sealing.
              </p>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
