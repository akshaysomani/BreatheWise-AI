'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AirQualityRadar } from '@/components/dashboard/AirQualityRadar';
import { AssistantWorkspace } from '@/components/dashboard/AssistantWorkspace';
import { ImpactWorkspace } from '@/components/dashboard/ImpactWorkspace';
import { CommunityWorkspace } from '@/components/dashboard/CommunityWorkspace';
import {
  Wind,
  ShieldCheck,
  Home,
  User,
  Users,
  LogOut,
  Sparkles,
  Info,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Route,
  Activity,
  Settings,
  ChevronRight,
  TrendingDown,
  Gauge,
  MapPin,
  RefreshCw,
} from 'lucide-react';

interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  Ahmedabad: { lat: 23.0225, lon: 72.5714 },
  Gandhinagar: { lat: 23.2156, lon: 72.6369 },
  Surat: { lat: 21.1702, lon: 72.8311 },
  Vadodara: { lat: 22.3072, lon: 73.1812 },
  Rajkot: { lat: 22.3039, lon: 70.8022 },
  Delhi: { lat: 28.6139, lon: 77.2090 },
  Noida: { lat: 28.5355, lon: 77.3910 },
  Gurugram: { lat: 28.4595, lon: 77.0266 },
  Ghaziabad: { lat: 28.6692, lon: 77.4538 },
  Faridabad: { lat: 28.4089, lon: 77.3178 },
  Mumbai: { lat: 19.0760, lon: 72.8777 },
  Pune: { lat: 18.5204, lon: 73.8567 },
  Bengaluru: { lat: 12.9716, lon: 77.5946 },
  Hyderabad: { lat: 17.3850, lon: 78.4867 },
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Kolkata: { lat: 22.5726, lon: 88.3639 },
  Jaipur: { lat: 26.9124, lon: 75.7873 },
  Lucknow: { lat: 26.8467, lon: 80.9462 },
  Chandigarh: { lat: 30.7333, lon: 76.7794 },
  Patna: { lat: 25.5941, lon: 85.1376 },
};

interface HouseholdData {
  profile: {
    id: string;
    city: string;
    neighborhood?: string;
    homeType: string;
    floorAreaSqFt: number;
    ceilingHeightFt: number;
    hasHEPAFilter: boolean;
    hepaCADR?: number | null;
    windowSealing: string;
    primaryCookingFuel: string;
    members: Array<{
      id: string;
      nameOrAlias: string;
      ageGroup: string;
      hasAsthma: boolean;
      hasHeartCondition: boolean;
      isPregnant: boolean;
    }>;
  };
  cadrAnalysis: {
    roomVolumeCuFt: number;
    targetACH: number;
    requiredCADR_CFM: number;
    requiredCADR_M3H: number;
    isCurrentPurifierAdequate: boolean;
    actualACHWithCurrentPurifier: number | null;
    deficitCADR_CFM: number;
    scientificPlantNotice: string;
    standardsNote: string;
  };
  vulnerabilityAssessment: {
    tier: string;
    label: string;
    targetACH: number;
    indoorPM25Target: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();

  // Authentication State
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Dashboard Data States
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [loadingHousehold, setLoadingHousehold] = useState(true);
  const [routines, setRoutines] = useState<any[]>([]);
  const [impactLogs, setImpactLogs] = useState<any[]>([]);
  const [impactAggregates, setImpactAggregates] = useState<{
    totalCO2AvoidedKg: number;
    totalPM25AvoidedGrams: number;
    totalDistanceShiftedKm: number;
    totalLogsCount: number;
  } | null>(null);
  const [aqiCache, setAqiCache] = useState<any>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'overview' | 'assistant' | 'household' | 'routines' | 'impact' | 'community' | 'settings'>('overview');

  // Household Setup Form State
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [setupForm, setSetupForm] = useState({
    city: 'Delhi',
    neighborhood: '',
    latitude: 28.6139,
    longitude: 77.209,
    homeType: 'APARTMENT',
    floorAreaSqFt: '1000',
    ceilingHeightFt: '9.0',
    hasHEPAFilter: true,
    hepaCADR: '200',
    windowSealing: 'MODERATE',
    primaryCookingFuel: 'LPG_GAS',
    hasAsthmaticMember: false,
    hasInfantOrPregnant: false,
  });
  const [savingHousehold, setSavingHousehold] = useState(false);
  const [householdError, setHouseholdError] = useState<string | null>(null);

  // Routine Creation Modal State
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [routineForm, setRoutineForm] = useState({
    title: 'Daily Commute',
    origin: 'Home',
    destination: 'Office',
    distanceKm: '12.0',
    departureTime: '08:30',
    baselineMode: 'SOLO_CAR',
    optimizedMode: 'METRO',
  });
  const [savingRoutine, setSavingRoutine] = useState(false);

  // 1. Initial Authentication Guard Check
  useEffect(() => {
    async function verifyAuthAndFetch() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok || !json?.data?.authenticated || !json?.data?.user) {
          // Unauthenticated -> Redirect to login with returnUrl
          router.replace('/login?returnUrl=/dashboard');
          return;
        }

        setUser(json.data.user);
        setAuthLoading(false);

        // Fetch user data in parallel
        fetchHouseholdData();
        fetchRoutinesData();
        fetchImpactData();
        fetchAqiData();
      } catch {
        router.replace('/login?returnUrl=/dashboard');
      }
    }

    verifyAuthAndFetch();
  }, [router]);

  const fetchHouseholdData = async () => {
    setLoadingHousehold(true);
    try {
      const res = await fetch('/api/household');
      if (res.ok) {
        const json = await res.json();
        setHousehold(json.data);
      } else {
        setHousehold(null);
      }
    } catch {
      setHousehold(null);
    } finally {
      setLoadingHousehold(false);
    }
  };

  const fetchRoutinesData = async () => {
    try {
      const res = await fetch('/api/routines');
      if (res.ok) {
        const json = await res.json();
        setRoutines(json.data.routines || []);
      }
    } catch {}
  };

  const fetchImpactData = async () => {
    try {
      const res = await fetch('/api/impact');
      if (res.ok) {
        const json = await res.json();
        setImpactLogs(json.data.logs || []);
        setImpactAggregates(json.data.aggregates || null);
      }
    } catch {}
  };

  const fetchAqiData = async () => {
    try {
      const res = await fetch('/api/aqi?lat=28.61&lon=77.20');
      if (res.ok) {
        const json = await res.json();
        setAqiCache(json.data);
      }
    } catch {}
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const handleSaveHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHousehold(true);
    setHouseholdError(null);

    try {
      const members = [];
      if (setupForm.hasAsthmaticMember) {
        members.push({
          nameOrAlias: 'Vulnerable Family Member',
          ageGroup: 'ADULT',
          hasAsthma: true,
          hasHeartCondition: false,
          isPregnant: false,
          outdoorHoursPerDay: 1.0,
        });
      }
      if (setupForm.hasInfantOrPregnant) {
        members.push({
          nameOrAlias: 'Pediatric / Maternal',
          ageGroup: 'INFANT',
          hasAsthma: false,
          hasHeartCondition: false,
          isPregnant: true,
          outdoorHoursPerDay: 0.5,
        });
      }

      // Match coordinate lookup by city name (case-insensitive) or preserve detected GPS
      const cityKey = Object.keys(CITY_COORDINATES).find(
        (c) => c.toLowerCase() === setupForm.city.trim().toLowerCase()
      );
      const matchedCoords = cityKey ? CITY_COORDINATES[cityKey] : null;

      const latitude =
        setupForm.latitude && setupForm.latitude !== 28.6139
          ? setupForm.latitude
          : matchedCoords
          ? matchedCoords.lat
          : 28.6139;

      const longitude =
        setupForm.longitude && setupForm.longitude !== 77.209
          ? setupForm.longitude
          : matchedCoords
          ? matchedCoords.lon
          : 77.209;

      const payload = {
        city: setupForm.city,
        neighborhood: setupForm.neighborhood || undefined,
        latitude,
        longitude,
        homeType: setupForm.homeType,
        floorAreaSqFt: Number(setupForm.floorAreaSqFt),
        ceilingHeightFt: Number(setupForm.ceilingHeightFt),
        hasHEPAFilter: setupForm.hasHEPAFilter,
        hepaCADR: setupForm.hasHEPAFilter ? Number(setupForm.hepaCADR) : null,
        windowSealing: setupForm.windowSealing,
        primaryCookingFuel: setupForm.primaryCookingFuel,
        members,
      };

      const res = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        setHouseholdError(errJson?.error?.message || 'Failed to save household profile.');
        setSavingHousehold(false);
        return;
      }

      setSetupModalOpen(false);
      await fetchHouseholdData();
    } catch {
      setHouseholdError('A network error occurred while saving.');
    } finally {
      setSavingHousehold(false);
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRoutine(true);
    try {
      const res = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: routineForm.title,
          origin: routineForm.origin,
          destination: routineForm.destination,
          distanceKm: Number(routineForm.distanceKm),
          departureTime: routineForm.departureTime,
          baselineMode: routineForm.baselineMode,
          optimizedMode: routineForm.optimizedMode,
        }),
      });

      if (res.ok) {
        setRoutineModalOpen(false);
        await fetchRoutinesData();
      }
    } finally {
      setSavingRoutine(false);
    }
  };

  if (authLoading) {
    return (
      <div className="py-24 bg-[#F7F8F3] min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-[#397A55]" />
          <p className="text-sm font-medium text-[#68766C]">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 lg:py-12 bg-[#F7F8F3] min-h-screen">
      <Container size="wide" className="space-y-8">
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2E8DE]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="success" size="sm">
                Verified Account
              </Badge>
              <span className="text-xs text-[#68766C]">Server-side authenticated session</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
              Welcome back, {user?.name || user?.email.split('@')[0]}
            </h1>
            <p className="text-sm text-[#68766C] mt-0.5">
              Account: <span className="font-mono text-xs">{user?.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-3.5 h-3.5 text-[#B8423D]" />}
              className="text-[#B8423D] border-[#E2E8DE]"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E2E8DE]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-[#397A55] text-white shadow-sm'
                : 'text-[#27352D] hover:bg-[#EEF3EA]'
            }`}
          >
            <Gauge className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'assistant'
                ? 'bg-[#397A55] text-white shadow-sm'
                : 'text-[#27352D] hover:bg-[#EEF3EA]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#D69B47]" />
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab('household')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'household'
                ? 'bg-[#397A55] text-white shadow-sm'
                : 'text-[#27352D] hover:bg-[#EEF3EA]'
            }`}
          >
            <Home className="w-4 h-4" />
            Household Profile & CADR
          </button>
          <button
            onClick={() => setActiveTab('routines')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'routines'
                ? 'bg-[#397A55] text-white shadow-sm'
                : 'text-[#27352D] hover:bg-[#EEF3EA]'
            }`}
          >
            <Route className="w-4 h-4" />
            Commute Routines ({routines.length})
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'impact'
                ? 'bg-[#397A55] text-white shadow-sm'
                : 'text-[#27352D] hover:bg-[#EEF3EA]'
            }`}
          >
            <Activity className="w-4 h-4" />
            Impact Tracker
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'community'
                ? 'bg-[#397A55] text-white shadow-sm'
                : 'text-[#27352D] hover:bg-[#EEF3EA]'
            }`}
          >
            <Users className="w-4 h-4" />
            Community
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-[#397A55] text-white shadow-sm'
                : 'text-[#27352D] hover:bg-[#EEF3EA]'
            }`}
          >
            <Settings className="w-4 h-4" />
            Account & Privacy
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Household Setup Prompt or Active Status */}
            {!household ? (
              <div className="p-6 bg-white border border-[#D69B47]/30 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#A86B16] font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Household Configuration Required
                  </div>
                  <h3 className="text-lg font-bold text-[#27352D]">
                    Configure your home specifications to unlock personalized air filtration guidance.
                  </h3>
                  <p className="text-xs text-[#68766C] max-w-xl">
                    BreatheWise AI requires your room dimensions and window sealing characteristics to compute exact CADR clean air requirements.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setSetupModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Configure Household Now
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-[#E2E8DE]">
                  <CardContent className="p-5 space-y-2">
                    <span className="text-xs font-semibold text-[#68766C]">Clean Air Delivery Rate</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
                        {household.cadrAnalysis.requiredCADR_CFM}
                      </span>
                      <span className="text-xs font-medium text-[#68766C]">CFM required</span>
                    </div>
                    <Badge variant={household.cadrAnalysis.isCurrentPurifierAdequate ? 'success' : 'warning'} size="sm">
                      {household.cadrAnalysis.isCurrentPurifierAdequate ? 'Purifier Capacity Adequate' : `Deficit: ${household.cadrAnalysis.deficitCADR_CFM} CFM`}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#E2E8DE]">
                  <CardContent className="p-5 space-y-2">
                    <span className="text-xs font-semibold text-[#68766C]">Family Vulnerability Tier</span>
                    <div className="text-xl font-bold text-[#27352D] font-[var(--font-heading)]">
                      {household.vulnerabilityAssessment.label}
                    </div>
                    <p className="text-xs text-[#397A55] font-medium">
                      Indoor Target: &lt;{household.vulnerabilityAssessment.indoorPM25Target} µg/m³ PM2.5
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#E2E8DE]">
                  <CardContent className="p-5 space-y-2">
                    <span className="text-xs font-semibold text-[#68766C]">Persisted Commute Routines</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-[#27352D] font-[var(--font-heading)]">
                        {routines.length}
                      </span>
                      <span className="text-xs font-medium text-[#68766C]">saved pathways</span>
                    </div>
                    <p className="text-xs text-[#68766C]">
                      {impactAggregates ? `${impactAggregates.totalCO2AvoidedKg} kg CO2e saved to date` : 'No impact records yet'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Air Quality Telemetry & CPCB Intelligence Radar (M4 Activated) */}
            <AirQualityRadar
              householdLat={(household?.profile as any)?.latitude}
              householdLon={(household?.profile as any)?.longitude}
              householdCity={household?.profile?.city}
            />

            {/* M5 AI Assistant Quick Access Banner */}
            <div className="p-5 bg-gradient-to-r from-[#EEF3EA] to-[#F7F8F3] rounded-xl border border-[#397A55]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#397A55] font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-[#D69B47]" />
                  AI Assistant & Daily Action Planner
                </div>
                <h4 className="text-base font-bold text-[#27352D] font-[var(--font-heading)]">
                  Need personalized advice on outdoor walks, ventilation windows, or purifier sizing?
                </h4>
                <p className="text-xs text-[#68766C]">
                  Our context-grounded environmental assistant converts your household profile and telemetry into 6-field explainable recommendations.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => setActiveTab('assistant')}
                leftIcon={<Sparkles className="w-4 h-4 text-[#D69B47]" />}
                className="shrink-0"
              >
                Open AI Assistant
              </Button>
            </div>
          </div>
        )}

        {/* Tab: AI Assistant & Recommendations (M5 Activated) */}
        {activeTab === 'assistant' && (
          <AssistantWorkspace
            initialLat={(household?.profile as any)?.latitude}
            initialLon={(household?.profile as any)?.longitude}
            userCity={household?.profile?.city}
          />
        )}

        {/* Tab 2: Household Profile & CADR */}
        {activeTab === 'household' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#27352D] font-[var(--font-heading)]">
                  Household Air & Ventilation Profile
                </h2>
                <p className="text-xs text-[#68766C]">
                  Customized parameters governing clean air delivery calculations and health defenses.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSetupModalOpen(true)}
                leftIcon={<Settings className="w-3.5 h-3.5" />}
              >
                {household ? 'Edit Household Data' : 'Configure Household'}
              </Button>
            </div>

            {loadingHousehold ? (
              <div className="p-12 text-center">
                <Spinner size="md" className="mx-auto" />
              </div>
            ) : household ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white border-[#E2E8DE]">
                  <CardHeader>
                    <CardTitle className="text-base">Home Structure & Purifier Sizing</CardTitle>
                    <CardDescription>ASHRAE/EPA filtration CADR algorithms</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-[#E2E8DE]">
                      <span className="text-[#68766C]">Location:</span>
                      <span className="font-semibold text-[#27352D]">{household.profile.city} {household.profile.neighborhood && `(${household.profile.neighborhood})`}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#E2E8DE]">
                      <span className="text-[#68766C]">Housing Type:</span>
                      <span className="font-semibold text-[#27352D]">{household.profile.homeType}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#E2E8DE]">
                      <span className="text-[#68766C]">Floor Area:</span>
                      <span className="font-semibold text-[#27352D]">{household.profile.floorAreaSqFt} sq ft</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#E2E8DE]">
                      <span className="text-[#68766C]">Calculated Room Volume:</span>
                      <span className="font-semibold text-[#27352D]">{household.cadrAnalysis.roomVolumeCuFt} cu ft</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#E2E8DE]">
                      <span className="text-[#68766C]">Current HEPA Purifier:</span>
                      <span className="font-semibold text-[#27352D]">{household.profile.hepaCADR ? `${household.profile.hepaCADR} CFM` : 'None reported'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[#68766C]">Required CADR for Smog (5.0 ACH):</span>
                      <span className="font-bold text-[#397A55]">{household.cadrAnalysis.requiredCADR_CFM} CFM ({household.cadrAnalysis.requiredCADR_M3H} m³/h)</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#E2E8DE]">
                  <CardHeader>
                    <CardTitle className="text-base">Scientific Guidance & Myth Debunking</CardTitle>
                    <CardDescription>Evidence-based indoor air purification</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs text-[#27352D]">
                    <div className="p-3 bg-[#EEF3EA] rounded-lg">
                      <span className="font-semibold text-[#397A55] block mb-1">Houseplant Myth Debunking:</span>
                      <p className="text-[#68766C] leading-relaxed">
                        {household.cadrAnalysis.scientificPlantNotice}
                      </p>
                    </div>

                    <div className="p-3 bg-[#F7F8F3] rounded-lg border border-[#E2E8DE]">
                      <span className="font-semibold text-[#27352D] block mb-1">Standards Provenance:</span>
                      <p className="text-[#68766C] leading-relaxed">
                        {household.cadrAnalysis.standardsNote}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <EmptyState
                icon={<Home className="w-8 h-8 text-[#68766C]" />}
                title="No Household Profile Configured"
                description="Setup your apartment or standalone house dimensions so BreatheWise AI can compute your family's exact air changes per hour (ACH)."
                action={
                  <Button variant="primary" size="md" onClick={() => setSetupModalOpen(true)}>
                    Configure Household Now
                  </Button>
                }
              />
            )}
          </div>
        )}

        {/* Tab 3: Commute Routines */}
        {activeTab === 'routines' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#27352D] font-[var(--font-heading)]">
                  Saved Commute Routines
                </h2>
                <p className="text-xs text-[#68766C]">
                  Real transit routes evaluated for inhaled particulate dose reduction and CO2e avoidance.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setRoutineModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Commute Route
              </Button>
            </div>

            {routines.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {routines.map((r) => (
                  <Card key={r.id} className="bg-white border-[#E2E8DE]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{r.title}</CardTitle>
                        <Badge variant="accent" size="sm">
                          {r.distanceKm} km
                        </Badge>
                      </div>
                      <CardDescription>
                        {r.origin} → {r.destination} (Departs: {r.departureTime})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-[#E2E8DE]">
                        <span className="text-[#68766C]">Baseline Transit:</span>
                        <span className="font-semibold text-[#27352D]">{r.baselineMode}</span>
                      </div>
                      {r.optimizedMode && (
                        <div className="flex justify-between py-1 border-b border-[#E2E8DE]">
                          <span className="text-[#68766C]">Optimized Transit:</span>
                          <span className="font-semibold text-[#397A55]">{r.optimizedMode}</span>
                        </div>
                      )}
                      {r.estimatedCO2SavingsKg && (
                        <div className="flex justify-between py-1">
                          <span className="text-[#68766C]">CO2 Avoided per trip:</span>
                          <span className="font-bold text-[#397A55]">{r.estimatedCO2SavingsKg} kg CO2e</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Route className="w-8 h-8 text-[#68766C]" />}
                title="No Commute Routines Saved"
                description="Save your daily work, school, or errand routes to compare exposure differences between car, bus, and sealed metro."
                action={
                  <Button variant="primary" size="md" onClick={() => setRoutineModalOpen(true)}>
                    Save First Commute
                  </Button>
                }
              />
            )}
          </div>
        )}

        {/* Tab 4: Impact Tracker */}
        {activeTab === 'impact' && <ImpactWorkspace />}

        {/* Tab 5: Community Environmental Intelligence */}
        {activeTab === 'community' && (
          <CommunityWorkspace
            userLat={28.61}
            userLon={77.20}
            userCity={household?.profile?.city || 'Delhi'}
          />
        )}

        {/* Tab 5: Account & Privacy Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-xl font-bold text-[#27352D] font-[var(--font-heading)]">
                Account & Privacy Settings
              </h2>
              <p className="text-xs text-[#68766C]">
                Your personal security identifiers and cryptographic session status.
              </p>
            </div>

            <Card className="bg-white border-[#E2E8DE]">
              <CardHeader>
                <CardTitle className="text-base">User Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-[#E2E8DE]">
                  <span className="text-[#68766C]">User ID:</span>
                  <span className="font-mono text-xs text-[#27352D]">{user?.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#E2E8DE]">
                  <span className="text-[#68766C]">Email:</span>
                  <span className="font-semibold text-[#27352D]">{user?.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#E2E8DE]">
                  <span className="text-[#68766C]">Role:</span>
                  <Badge variant="secondary" size="sm">{user?.role}</Badge>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#68766C]">Session Type:</span>
                  <span className="text-xs font-semibold text-[#397A55]">Server-Side Opaque Database Token</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-[#E2E8DE]">
              <CardHeader>
                <CardTitle className="text-base">Privacy & Retention Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-[#68766C] leading-relaxed">
                <p>
                  BreatheWise AI processes household floor areas and vulnerability tiers exclusively to compute clean air delivery requirements and generate personalized protective routines.
                </p>
                <p>
                  All community observation submissions are geographically quantized to 2 decimal places (~1.1 km neighborhood centroid) and never expose your real name, email, or exact residence coordinates.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </Container>

      {/* Household Setup Modal */}
      <Modal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        title="Setup Household Air Profile"
        size="lg"
      >
        <form onSubmit={handleSaveHousehold} className="space-y-4">
          {householdError && (
            <Alert variant="danger" title="Error Saving Profile">
              {householdError}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                id="h-city"
                label="City"
                value={setupForm.city}
                onChange={(e) => {
                  const newCity = e.target.value;
                  const matched = CITY_COORDINATES[newCity.trim()];
                  setSetupForm({
                    ...setupForm,
                    city: newCity,
                    latitude: matched ? matched.lat : setupForm.latitude,
                    longitude: matched ? matched.lon : setupForm.longitude,
                  });
                }}
                required
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-[#68766C]">
                <span>
                  Coords: {setupForm.latitude.toFixed(2)}°N, {setupForm.longitude.toFixed(2)}°E
                </span>
                <button
                  type="button"
                  disabled={detectingGps}
                  onClick={() => {
                    if (typeof window !== 'undefined' && navigator.geolocation) {
                      setDetectingGps(true);
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const lat = pos.coords.latitude;
                          const lon = pos.coords.longitude;
                          try {
                            const res = await fetch(`/api/location/coordinates?lat=${lat}&lon=${lon}`);
                            const json = await res.json();
                            const detectedCity = json?.data?.city || setupForm.city;
                            setSetupForm((prev) => ({
                              ...prev,
                              city: detectedCity,
                              latitude: lat,
                              longitude: lon,
                            }));
                          } catch {
                            setSetupForm((prev) => ({
                              ...prev,
                              latitude: lat,
                              longitude: lon,
                            }));
                          } finally {
                            setDetectingGps(false);
                          }
                        },
                        () => setDetectingGps(false),
                        { timeout: 8000 }
                      );
                    }
                  }}
                  className="text-[#397A55] font-semibold hover:underline flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  {detectingGps ? 'Detecting...' : 'Auto-detect GPS'}
                </button>
              </div>
            </div>
            <Input
              id="h-neighborhood"
              label="Neighborhood / Sector"
              placeholder="e.g. Rohini or Indirapuram"
              value={setupForm.neighborhood}
              onChange={(e) => setSetupForm({ ...setupForm, neighborhood: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="h-type"
              label="Housing Type"
              value={setupForm.homeType}
              onChange={(e) => setSetupForm({ ...setupForm, homeType: e.target.value })}
              options={[
                { value: 'APARTMENT', label: 'Apartment' },
                { value: 'STANDALONE_HOUSE', label: 'Standalone House' },
                { value: 'MULTI_STORY', label: 'Multi-Story Villa' },
              ]}
            />
            <Input
              id="h-area"
              type="number"
              label="Floor Area (sq ft)"
              value={setupForm.floorAreaSqFt}
              onChange={(e) => setSetupForm({ ...setupForm, floorAreaSqFt: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="h-sealing"
              label="Window Sealing Quality"
              value={setupForm.windowSealing}
              onChange={(e) => setSetupForm({ ...setupForm, windowSealing: e.target.value })}
              options={[
                { value: 'POOR', label: 'Poor (Drafty, single-pane)' },
                { value: 'MODERATE', label: 'Moderate (Standard sliding windows)' },
                { value: 'TIGHT', label: 'Airtight (Weather-stripped, double glazed)' },
              ]}
            />
            <Input
              id="h-purifier"
              type="number"
              label="HEPA Purifier CADR (CFM)"
              placeholder="e.g. 250"
              value={setupForm.hepaCADR}
              onChange={(e) => setSetupForm({ ...setupForm, hepaCADR: e.target.value })}
              helperText="Check purifier specification sticker (CFM or m³/h ÷ 1.7)"
            />
          </div>

          <div className="pt-2 border-t border-[#E2E8DE] space-y-2">
            <span className="text-xs font-bold text-[#27352D] block">Vulnerable Household Flags (Optional):</span>
            <label className="flex items-center gap-2 text-xs text-[#27352D] cursor-pointer">
              <input
                type="checkbox"
                checked={setupForm.hasAsthmaticMember}
                onChange={(e) => setSetupForm({ ...setupForm, hasAsthmaticMember: e.target.checked })}
                className="rounded border-[#E2E8DE] text-[#397A55] focus:ring-[#397A55]"
              />
              Household member with asthma or chronic respiratory conditions
            </label>
            <label className="flex items-center gap-2 text-xs text-[#27352D] cursor-pointer">
              <input
                type="checkbox"
                checked={setupForm.hasInfantOrPregnant}
                onChange={(e) => setSetupForm({ ...setupForm, hasInfantOrPregnant: e.target.checked })}
                className="rounded border-[#E2E8DE] text-[#397A55] focus:ring-[#397A55]"
              />
              Infant under 2 years old or pregnant mother in residence
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8DE]">
            <Button variant="outline" size="sm" type="button" onClick={() => setSetupModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingHousehold}>
              Save Household Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Routine Creation Modal */}
      <Modal
        isOpen={routineModalOpen}
        onClose={() => setRoutineModalOpen(false)}
        title="Add Commute Routine"
        size="md"
      >
        <form onSubmit={handleCreateRoutine} className="space-y-4">
          <Input
            id="r-title"
            label="Routine Name"
            placeholder="e.g. Office Commute"
            value={routineForm.title}
            onChange={(e) => setRoutineForm({ ...routineForm, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="r-orig"
              label="Origin"
              value={routineForm.origin}
              onChange={(e) => setRoutineForm({ ...routineForm, origin: e.target.value })}
              required
            />
            <Input
              id="r-dest"
              label="Destination"
              value={routineForm.destination}
              onChange={(e) => setRoutineForm({ ...routineForm, destination: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="r-dist"
              type="number"
              label="Distance (km)"
              value={routineForm.distanceKm}
              onChange={(e) => setRoutineForm({ ...routineForm, distanceKm: e.target.value })}
              required
            />
            <Input
              id="r-dep"
              label="Departure Time (24h)"
              value={routineForm.departureTime}
              onChange={(e) => setRoutineForm({ ...routineForm, departureTime: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              id="r-base"
              label="Baseline Transit"
              value={routineForm.baselineMode}
              onChange={(e) => setRoutineForm({ ...routineForm, baselineMode: e.target.value })}
              options={[
                { value: 'SOLO_CAR', label: 'Solo Car' },
                { value: 'MOTORCYCLE', label: 'Motorcycle' },
                { value: 'BUS', label: 'Bus' },
              ]}
            />
            <Select
              id="r-opt"
              label="Optimized Alternative"
              value={routineForm.optimizedMode}
              onChange={(e) => setRoutineForm({ ...routineForm, optimizedMode: e.target.value })}
              options={[
                { value: 'METRO', label: 'Metro (Sealed filtration)' },
                { value: 'CARPOOL', label: 'Carpool' },
                { value: 'BUS', label: 'Electric Bus' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8DE]">
            <Button variant="outline" size="sm" type="button" onClick={() => setRoutineModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingRoutine}>
              Save Commute
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
