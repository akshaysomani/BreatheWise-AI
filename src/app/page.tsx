'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { HeroIllustration } from '@/components/home/HeroIllustration';
import {
  Wind,
  Sparkles,
  ShieldAlert,
  Home,
  Bike,
  Flame,
  LineChart,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Gauge,
  Sliders,
  Users,
  Compass,
  AlertTriangle,
  Info,
} from 'lucide-react';

export default function HomePage() {
  // Interactive Household Guidance Modal State
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [selectedSensitivity, setSelectedSensitivity] = useState<'infants' | 'asthma' | 'elderly' | 'general'>('asthma');
  const [selectedRoomSize, setSelectedRoomSize] = useState<number>(200);

  // Compute CADR preview for the room size
  const targetACH = 5.0; // 5 air changes per hour for smog
  const ceilingHeight = 9.0;
  const roomVolume = selectedRoomSize * ceilingHeight;
  const calculatedCADR = Math.round((roomVolume * targetACH) / 60);

  const sensitivityGuidance = {
    asthma: {
      title: 'High Respiratory Sensitivity Guidance',
      badge: 'Priority Defense Tier',
      badgeVariant: 'error' as const,
      advice:
        'Maintain continuous HEPA filtration at minimum 4.5 Air Changes per Hour. Delay outdoor aerobic activities until solar mixing lifts the nocturnal inversion layer (typically 1:00 PM – 3:30 PM). Keep relief inhalers accessible.',
      action: 'Run HEPA on High in bedrooms; seal window draft gaps.',
    },
    infants: {
      title: 'Infant & Pediatric Protection Plan',
      badge: 'Critical Vulnerability Tier',
      badgeVariant: 'warning' as const,
      advice:
        'Children breathe 50% more air per kilogram of body weight than adults. Avoid stroller transit during morning rush hours when exhaust-level PM2.5 and NOx concentrate below 1 meter.',
      action: 'Keep play areas indoors during AQI > 150; use HEPA filtration.',
    },
    elderly: {
      title: 'Cardiovascular & Senior Care Plan',
      badge: 'Vascular Protection Tier',
      badgeVariant: 'warning' as const,
      advice:
        'Fine particulates (PM2.5) trigger acute vascular inflammation and heart strain. Shift essential medical or grocery errands to verified clean air windows.',
      action: 'Avoid morning cold-air exertion; check diurnal forecast.',
    },
    general: {
      title: 'Standard Urban Household Plan',
      badge: 'Baseline Healthy Living',
      badgeVariant: 'success' as const,
      advice:
        'Utilize diurnal ventilation windows to exchange indoor CO2 without letting heavy particulate matter penetrate. Shift solo vehicle commutes to electric transit when safe.',
      action: 'Ventilate for 20 minutes at 2:00 PM; chain errands together.',
    },
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* =====================================================================
          1. HERO SECTION
          ===================================================================== */}
      <section
        id="hero"
        className="relative pt-8 pb-16 lg:pt-16 lg:pb-24 overflow-hidden border-b border-[#E2E8DE] bg-gradient-to-b from-[#F7F8F3] via-[#FFFFFF] to-[#F7F8F3]"
      >
        <Container size="wide">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Season / Mission Banner */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF3EA] border border-[#CDE0D3] text-[#397A55] text-xs font-semibold tracking-wide">
                <Wind className="w-3.5 h-3.5 text-[#397A55]" />
                <span>Urban Air Quality Assistant • Winter Smog Protocol</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#27352D] leading-[1.15] font-[var(--font-heading)]">
                Breathe Better.{' '}
                <span className="text-[#397A55] underline decoration-[#718C72]/40 decoration-wavy decoration-2">
                  Live Healthier.
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-lg sm:text-xl text-[#68766C] leading-relaxed max-w-2xl font-normal">
                Your intelligent companion for cleaner air, healthier everyday choices and a greener tomorrow. Hyper-local verified environmental intelligence, scientific indoor purification, and personalized family daily routines.
              </p>

              {/* Key Value Proposition Badges */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <Badge variant="default" size="md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" /> Zero Hallucinations
                </Badge>
                <Badge variant="default" size="md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" /> ASHRAE CADR Formulas
                </Badge>
                <Badge variant="default" size="md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" /> OpenAQ v3 Verified Feeds
                </Badge>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setPlannerOpen(true)}
                  leftIcon={<Sparkles className="w-5 h-5 text-white" />}
                >
                  Get Personalized Guidance
                </Button>
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    size="lg"
                    rightIcon={<ArrowRight className="w-4 h-4 text-[#718C72]" />}
                    className="w-full sm:w-auto"
                  >
                    Explore Air Quality
                  </Button>
                </Link>
              </div>

              {/* Subtle Trust Line */}
              <p className="text-xs text-[#68766C] flex items-center gap-1.5 pt-1">
                <ShieldCheck className="w-4 h-4 text-[#397A55]" />
                <span>Transparent formulas • Open regulatory data • Zero health data monetization</span>
              </p>
            </div>

            {/* Right Visual Column (Custom Vector Artwork) */}
            <div className="lg:col-span-5 flex justify-center">
              <HeroIllustration className="w-full max-w-lg lg:max-w-none" />
            </div>
          </div>
        </Container>
      </section>

      {/* =====================================================================
          2. LIVE SMOG AWARENESS ALERT BANNER (SAMPLE PREVIEW FIXTURE)
          ===================================================================== */}
      <section className="bg-[#EEF3EA] py-3.5 border-b border-[#E2E8DE]">
        <Container size="wide">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2.5 text-[#27352D]">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A86B16] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#A86B16]"></span>
              </span>
              <span className="font-semibold text-[#A86B16]">Winter Inversion Advisory:</span>
              <span className="text-[#68766C] hidden md:inline">
                Atmospheric boundary layer height is compressed. Particulates accumulate between 06:00 and 09:30.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#397A55] bg-white px-2.5 py-1 rounded-full border border-[#CDE0D3]">
                Safe Vent Window: 13:00 – 15:30
              </span>
              <Link href="/dashboard" className="text-xs font-semibold text-[#397A55] hover:underline flex items-center gap-0.5">
                View Radar <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* =====================================================================
          3. SIX CORE FEATURE CAPABILITIES
          ===================================================================== */}
      <section id="features" className="py-16 lg:py-24 bg-white border-b border-[#E2E8DE]">
        <Container size="wide">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <Badge variant="default" size="md">
              Comprehensive Environmental Defense
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#27352D] font-[var(--font-heading)]">
              Engineered for Real Urban Pollution Challenges
            </h2>
            <p className="text-base sm:text-lg text-[#68766C] leading-relaxed">
              Every feature is built on verified atmospheric physics, medical vulnerability standards, and auditable emission calculation models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1: Air Quality Intelligence */}
            <Card className="hover:border-[#397A55] transition-all duration-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-[10px] bg-[#EEF3EA] text-[#397A55] flex items-center justify-center mb-2">
                  <Gauge className="w-6 h-6" />
                </div>
                <CardTitle>Air Quality Intelligence</CardTitle>
                <CardDescription>
                  Continuous location-aware monitoring of PM2.5, PM10, NO2, and Ozone with physical 72-hour Copernicus CAMS dispersion modeling.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-[#68766C] space-y-2 border-t border-[#E2E8DE] pt-3">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" />
                    <span>Station attribution, distances & timestamps</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" />
                    <span>Clear stale-data and offline warnings</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 2: AI Family Assistant */}
            <Card className="hover:border-[#397A55] transition-all duration-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-[10px] bg-[#EEF3EA] text-[#397A55] flex items-center justify-center mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <CardTitle>AI Family Assistant</CardTitle>
                <CardDescription>
                  Personalized guidance accounting for children, elderly family members, asthma, pets, and home floorplan dimensions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-[#68766C] space-y-2 border-t border-[#E2E8DE] pt-3">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" />
                    <span>6-field explainability architecture</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" />
                    <span>Strict prohibition of medical hallucinations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 3: Indoor Air Quality */}
            <Card className="hover:border-[#397A55] transition-all duration-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-[10px] bg-[#EEF3EA] text-[#397A55] flex items-center justify-center mb-2">
                  <Home className="w-6 h-6" />
                </div>
                <CardTitle>Indoor Air Quality & CADR</CardTitle>
                <CardDescription>
                  Scientific Clean Air Delivery Rate (CADR) calculations, diurnal ventilation timing, and indoor source mitigation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-[#68766C] space-y-2 border-t border-[#E2E8DE] pt-3">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" />
                    <span>5.0 ACH target sizing for winter smog</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" />
                    <span>Evidence-based debunking of houseplant myths</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 4: Low-Emission Daily Routines */}
            <Card className="hover:border-[#397A55] transition-all duration-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-[10px] bg-[#EEF3EA] text-[#397A55] flex items-center justify-center mb-2">
                  <Bike className="w-6 h-6" />
                </div>
                <CardTitle>Routine & Commute Optimizer</CardTitle>
                <CardDescription>
                  Smog-aware commute scheduling that evaluates inhaled particulate dosage against transport emissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-[#68766C] space-y-2 border-t border-[#E2E8DE] pt-3">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" />
                    <span>Safety strictly overrides emissions in hazardous air</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" />
                    <span>Errand chaining & filtered transit options</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 5: Sustainable Everyday Alternatives */}
            <Card className="hover:border-[#397A55] transition-all duration-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-[10px] bg-[#EEF3EA] text-[#397A55] flex items-center justify-center mb-2">
                  <Flame className="w-6 h-6" />
                </div>
                <CardTitle>Sustainable Alternatives</CardTitle>
                <CardDescription>
                  Practical home heating, cooking, and consumption alternatives with transparent trade-offs and honest friction metrics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-[#68766C] space-y-2 border-t border-[#E2E8DE] pt-3">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" />
                    <span>Induction vs Gas NO2 comparisons</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" />
                    <span>Transparent upfront and operational costs</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 6: Environmental Impact Tracker */}
            <Card className="hover:border-[#397A55] transition-all duration-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-[10px] bg-[#EEF3EA] text-[#397A55] flex items-center justify-center mb-2">
                  <LineChart className="w-6 h-6" />
                </div>
                <CardTitle>Audit-Grade Impact Tracker</CardTitle>
                <CardDescription>
                  Verifiable calculations of avoided vehicle emissions and primary PM2.5 using standardized DEFRA/EPA constants.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-[#68766C] space-y-2 border-t border-[#E2E8DE] pt-3">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" />
                    <span>Full formula & baseline transparency</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#397A55]" />
                    <span>Explicit ±15% uncertainty disclosures</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* =====================================================================
          4. HOW IT WORKS (FOUR SYSTEMATIC STEPS)
          ===================================================================== */}
      <section id="how-it-works" className="py-16 lg:py-24 bg-[#F7F8F3] border-b border-[#E2E8DE]">
        <Container size="wide">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <Badge variant="default" size="md">
              Systematic Method
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#27352D] font-[var(--font-heading)]">
              How BreatheWise AI Protects Your Family
            </h2>
            <p className="text-base sm:text-lg text-[#68766C] leading-relaxed">
              From atmospheric sensor reading to household execution in four clear stages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-[12px] p-6 border border-[#E2E8DE] relative space-y-3 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-[#397A55] text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-lg font-bold text-[#27352D] font-[var(--font-heading)]">
                Understand Local Air
              </h3>
              <p className="text-sm text-[#68766C] leading-relaxed">
                Connects to OpenAQ regulatory stations and Copernicus physical dispersion models to analyze ground-level PM2.5, PM10, and diurnal inversion patterns.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-[12px] p-6 border border-[#E2E8DE] relative space-y-3 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-[#397A55] text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-lg font-bold text-[#27352D] font-[var(--font-heading)]">
                Personalize Guidance
              </h3>
              <p className="text-sm text-[#68766C] leading-relaxed">
                Adapts advice to your family composition—identifying vulnerable members (infants, asthmatics, seniors) and specific room filtration capacities.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-[12px] p-6 border border-[#E2E8DE] relative space-y-3 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-[#397A55] text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="text-lg font-bold text-[#27352D] font-[var(--font-heading)]">
                Execute Daily Actions
              </h3>
              <p className="text-sm text-[#68766C] leading-relaxed">
                Follow actionable schedules: exact 20-minute ventilation windows, purifier CADR fan speeds, and safer commute corridors with filtered transit.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-[12px] p-6 border border-[#E2E8DE] relative space-y-3 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-[#397A55] text-white flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h3 className="text-lg font-bold text-[#27352D] font-[var(--font-heading)]">
                Track Real Impact
              </h3>
              <p className="text-sm text-[#68766C] leading-relaxed">
                Log emissions avoided (kg CO2e and grams PM2.5) with transparent formulas, DEFRA baseline coefficients, and stated uncertainty intervals.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* =====================================================================
          5. TRUST & SCIENTIFIC ETHICS SECTION
          ===================================================================== */}
      <section id="about" className="py-16 lg:py-20 bg-white border-b border-[#E2E8DE]">
        <Container size="wide">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-3">
              <Badge variant="default" size="md">
                Responsible Environmental Technology
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-[#27352D] font-[var(--font-heading)]">
                Our Commitment to Scientific Integrity
              </h2>
              <p className="text-base text-[#68766C]">
                Built from first principles to counteract the widespread problem of AI hallucinations and pseudoscientific wellness claims.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-[12px] bg-[#EEF3EA] border border-[#CDE0D3] space-y-2">
                <h4 className="font-bold text-base text-[#27352D] font-[var(--font-heading)] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#397A55]" />
                  Zero Environmental Hallucinations
                </h4>
                <p className="text-xs text-[#68766C] leading-relaxed">
                  The AI assistant consumes immutable, server-verified environmental context from OpenAQ and Copernicus CAMS. It is strictly prohibited by schema guards from inventing current AQI numbers or fabricating forecasts.
                </p>
              </div>

              <div className="p-5 rounded-[12px] bg-[#EEF3EA] border border-[#CDE0D3] space-y-2">
                <h4 className="font-bold text-base text-[#27352D] font-[var(--font-heading)] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#397A55]" />
                  True Physical Filtration (No Plant Myths)
                </h4>
                <p className="text-xs text-[#68766C] leading-relaxed">
                  We explicitly clarify that common indoor houseplants have negligible Clean Air Delivery Rates during severe smog emergencies. We base all room recommendations on true mechanical HEPA filtration and airtightness.
                </p>
              </div>

              <div className="p-5 rounded-[12px] bg-[#EEF3EA] border border-[#CDE0D3] space-y-2">
                <h4 className="font-bold text-base text-[#27352D] font-[var(--font-heading)] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#397A55]" />
                  Privacy-Preserving Geolocation
                </h4>
                <p className="text-xs text-[#68766C] leading-relaxed">
                  Community smog reports truncate coordinates to 2 decimal places (~1.1 km precision) to protect home privacy. User medical profile flags are stored securely and never broadcast to public networks.
                </p>
              </div>

              <div className="p-5 rounded-[12px] bg-[#EEF3EA] border border-[#CDE0D3] space-y-2">
                <h4 className="font-bold text-base text-[#27352D] font-[var(--font-heading)] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#397A55]" />
                  Formula-Backed Impact Accounting
                </h4>
                <p className="text-xs text-[#68766C] leading-relaxed">
                  We never claim arbitrary &quot;trees saved&quot; or mystical carbon offsets. Every calculation references peer-reviewed DEFRA/EPA constants with transparent math and explicit &plusmn;15% uncertainty bounds.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* =====================================================================
          6. INTERACTIVE HOUSEHOLD GUIDANCE MODAL
          ===================================================================== */}
      <Modal
        isOpen={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        title="Personalized Household Smog Action Planner"
        description="Select your family composition to preview tailored indoor and outdoor recommendations."
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Sensitivity Tier Selector */}
          <div>
            <label className="block text-sm font-semibold text-[#27352D] mb-2 font-[var(--font-heading)]">
              Select Primary Household Sensitivity Profile:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'asthma', label: 'Asthma / Bronchial', icon: '🫁' },
                { id: 'infants', label: 'Infants & Kids', icon: '👶' },
                { id: 'elderly', label: 'Seniors (65+)', icon: '👵' },
                { id: 'general', label: 'General Adults', icon: '🏡' },
              ].map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedSensitivity(tier.id as any)}
                  className={`p-3 rounded-[8px] border text-left text-xs transition-all cursor-pointer ${
                    selectedSensitivity === tier.id
                      ? 'border-[#397A55] bg-[#EEF3EA] text-[#397A55] font-bold ring-1 ring-[#397A55]'
                      : 'border-[#E2E8DE] bg-white text-[#27352D] hover:bg-[#F7F8F3]'
                  }`}
                >
                  <div className="text-lg mb-1">{tier.icon}</div>
                  <div>{tier.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Room CADR Quick Calculator */}
          <div className="p-4 rounded-[10px] bg-[#F7F8F3] border border-[#E2E8DE] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[#27352D]">Room Floor Area: {selectedRoomSize} sq ft</span>
              <span className="text-[#397A55] font-bold">Required CADR: {calculatedCADR} CFM ({Math.round(calculatedCADR * 1.7)} m³/h)</span>
            </div>
            <input
              type="range"
              min="100"
              max="600"
              step="25"
              value={selectedRoomSize}
              onChange={(e) => setSelectedRoomSize(Number(e.target.value))}
              className="w-full accent-[#397A55] cursor-pointer"
              aria-label="Room Floor Area in square feet"
            />
            <p className="text-[11px] text-[#68766C]">
              Calculated for 5.0 Air Changes per Hour (ACH) assuming 9 ft ceilings during acute winter smog conditions.
            </p>
          </div>

          {/* Dynamic Advice Card */}
          <div className="p-4 rounded-[10px] bg-white border border-[#E2E8DE] space-y-2.5">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-sm text-[#27352D] font-[var(--font-heading)]">
                {sensitivityGuidance[selectedSensitivity].title}
              </h5>
              <Badge variant={sensitivityGuidance[selectedSensitivity].badgeVariant} size="sm">
                {sensitivityGuidance[selectedSensitivity].badge}
              </Badge>
            </div>
            <p className="text-xs text-[#68766C] leading-relaxed">
              {sensitivityGuidance[selectedSensitivity].advice}
            </p>
            <div className="pt-2 border-t border-[#E2E8DE] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#397A55]">Recommended Action:</span>
              <span className="text-[#27352D] font-medium">{sensitivityGuidance[selectedSensitivity].action}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-[#68766C]">
              Full AI Assistant reasoning engine activates in Module M5.
            </span>
            <div className="flex gap-2">
              <Link href="/dashboard" onClick={() => setPlannerOpen(false)}>
                <Button variant="outline" size="md">
                  View Air Quality Radar
                </Button>
              </Link>
              <Button variant="primary" size="md" onClick={() => setPlannerOpen(false)}>
                Close Planner
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
