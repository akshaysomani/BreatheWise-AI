import {
  StructuredRecommendation,
  AssistantChatResponse,
} from '@/lib/validations/assistant.schema';
import { ProvenanceType, TelemetryProvenanceStatus } from '@/lib/air-quality/types';

export interface EnvironmentalContext {
  aqi: number | null;
  standard: 'CPCB_NAQI' | 'ACUTE_1_HOUR_PROXY' | 'UNAVAILABLE';
  category: string;
  status: 'AVAILABLE' | 'INSUFFICIENT_COMPLETENESS' | 'INSUFFICIENT_POLLUTANTS' | 'OUT_OF_BOUNDS' | 'NO_DATA';
  provenance: ProvenanceType | TelemetryProvenanceStatus | string;
  provenanceType?: ProvenanceType | 'HISTORICAL_UNKNOWN';
  sourceProvider?: string | null;
  isLive: boolean;
  stationName: string | null;
  dominantPollutant: string | null;
  pollutants: Record<
    string,
    {
      concentration: number | null;
      unit: string;
      subIndex: number | null;
      averagingPeriodHours: number;
    }
  >;
  observationTimeUtc: string | null;
  retrievalTimeUtc?: string | null;
  cacheTimeUtc?: string | null;
  freshnessState: 'FRESH' | 'CACHED' | 'STALE' | 'MISSING';
  averagingNotice: string;
}

export interface HouseholdContext {
  hasProfile: boolean;
  city: string | null;
  coarseLocation: string | null;
  homeType: string | null;
  roomVolumeCuFt: number | null;
  targetACH: number | null;
  requiredCADR_CFM: number | null;
  hasHEPAFilter: boolean;
  currentPurifierCADR: number | null;
  purifierCapacityStatus: 'ADEQUATE' | 'DEFICIT' | 'UNKNOWN';
  cadrDeficitCFM: number;
  primaryCookingFuel: string | null;
  vulnerabilityTier: string;
  vulnerabilityLabel: string;
  indoorPM25Target: number;
  vulnerableMemberCount: number;
  hasAsthmaOrRespiratory: boolean;
  hasInfantOrPediatric: boolean;
  hasSeniorMember: boolean;
}

export interface RoutineContext {
  savedRoutinesCount: number;
  routes: Array<{
    title: string;
    origin: string;
    destination: string;
    distanceKm: number;
    baselineMode: string;
    optimizedMode: string | null;
    estimatedDoseReduction: number | null;
    estimatedCO2SavingsKg: number | null;
  }>;
}

export interface AiContextPayload {
  userId: string;
  environment: EnvironmentalContext;
  household: HouseholdContext;
  routine: RoutineContext;
  timestampUtc: string;
}

export interface DailyRoutinePeriod {
  period: 'MORNING' | 'AFTERNOON' | 'EVENING';
  timeRange: string;
  action: string;
  reason: string;
  environmentalEvidence: string;
  expectedBenefit: string;
  implementationSteps: string[];
  assumptions: string;
  uncertainty: string;
  freshnessAndSource: string;
}

export interface DailyRoutinePlan {
  title: string;
  targetDate: string;
  summary: string;
  periods: DailyRoutinePeriod[];
  provenance: 'CALCULATED_ESTIMATE' | 'AI_GENERATED' | 'PRE_REVIEWED_RULE';
  generatedAt: string;
  contextSummary: {
    aqi: number | null;
    category: string;
    dominantPollutant: string | null;
    vulnerabilityTier: string;
  };
  disclaimer: string;
}

export interface IndoorAdviceReport {
  roomType: string;
  cadrAnalysis: {
    roomVolumeCuFt: number;
    targetACH: number;
    requiredCADR_CFM: number;
    requiredCADR_M3H: number;
    isPurifierAdequate: boolean;
    deficitCADR_CFM: number;
  };
  recommendations: StructuredRecommendation[];
  sourceControls: string[];
  scientificNotices: {
    plantMythDebunked: string;
    standardsProvenance: string;
    ventilationTiming: string;
  };
  generatedAt: string;
  disclaimer: string;
}

export interface GeminiGenerateOptions {
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
}
