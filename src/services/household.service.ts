import { householdRepository, CreateHouseholdInput } from '@/repositories/household.repository';

export interface CadrAnalysis {
  roomVolumeCuFt: number;
  targetACH: number;
  requiredCADR_CFM: number;
  requiredCADR_M3H: number;
  isCurrentPurifierAdequate: boolean;
  actualACHWithCurrentPurifier: number | null;
  deficitCADR_CFM: number;
  scientificPlantNotice: string;
  standardsNote: string;
}

export const householdService = {
  async getProfile(userId: string) {
    return householdRepository.getByUserId(userId);
  },

  async saveProfile(userId: string, data: CreateHouseholdInput) {
    return householdRepository.upsert(userId, data);
  },

  /**
   * Calculates Clean Air Delivery Rate (CADR) requirements.
   * 
   * SCIENTIFIC BASIS & STANDARDS AUDIT:
   * - DESIGN TARGET: 5.0 Air Changes per Hour (ACH) is an acute indoor particulate/smoke filtration
   *   design target referenced in the CDC Clean Air in Buildings Challenge and AHAM CADR sizing guidelines.
   *   It is an engineering design target, not a universal household legal mandate.
   * - STANDARDS DISTINCTION: ASHRAE Standard 62.2 specifies baseline outdoor air exchange rates
   *   (~0.35 ACH outdoor air ventilation for residential spaces), distinct from recirculated
   *   HEPA particulate filtration CADR.
   * - UNIT CONVERSIONS: 1 CFM (cubic feet per minute) = 1.69901 m³/h (cubic meters per hour).
   *   Formula (CFM): CADR (CFM) = (Room Volume in cu ft * Target ACH) / 60 minutes.
   *   Formula (m³/h): CADR (m³/h) = Room Volume in m³ * Target ACH.
   * - BOUNDS: Inputs are bounded to physically plausible residential dimensions (10-10,000 sq ft, 5-30 ft height).
   */
  calculateCadrRequirements(
    floorAreaSqFt: number,
    ceilingHeightFt = 9.0,
    currentPurifierCADR: number | null = null,
    targetACH = 5.0 // Particulate filtration design target during acute smog episodes
  ): CadrAnalysis {
    // Defensive physical bounding
    const safeArea = Math.max(10, Math.min(10000, Number.isFinite(floorAreaSqFt) ? floorAreaSqFt : 200));
    const safeHeight = Math.max(5, Math.min(30, Number.isFinite(ceilingHeightFt) ? ceilingHeightFt : 9.0));
    const safeTargetACH = Math.max(1, Math.min(12, Number.isFinite(targetACH) ? targetACH : 5.0));

    const roomVolume = Math.round(safeArea * safeHeight);
    const requiredCFM = Math.round((roomVolume * safeTargetACH) / 60);
    const requiredM3H = Math.round(requiredCFM * 1.69901);

    let isCurrentPurifierAdequate = false;
    let actualACH: number | null = null;
    let deficit = requiredCFM;

    if (currentPurifierCADR !== null && currentPurifierCADR > 0) {
      const safePurifierCADR = Math.max(0, Math.min(5000, currentPurifierCADR));
      actualACH = Math.round(((safePurifierCADR * 60) / roomVolume) * 10) / 10;
      isCurrentPurifierAdequate = safePurifierCADR >= requiredCFM;
      deficit = Math.max(0, requiredCFM - safePurifierCADR);
    }

    return {
      roomVolumeCuFt: roomVolume,
      targetACH: safeTargetACH,
      requiredCADR_CFM: requiredCFM,
      requiredCADR_M3H: requiredM3H,
      isCurrentPurifierAdequate,
      actualACHWithCurrentPurifier: actualACH,
      deficitCADR_CFM: deficit,
      scientificPlantNotice:
        'Indoor houseplants produce negligible Clean Air Delivery Rates (<0.05 CADR) in residential spaces (Waring et al., 2020). Rely exclusively on mechanical True HEPA filtration (H13/H14) for particulate smog defense.',
      standardsNote:
        '5.0 ACH is an engineering design target for acute particulate/smoke mitigation (referenced in CDC Clean Air in Buildings Challenge / AHAM CADR guidelines), distinct from ASHRAE 62.2 outdoor air ventilation minimums (~0.35 ACH). It is not a universal legal mandate.',
    };
  },

  evaluateVulnerabilityTier(
    members: Array<{ ageGroup: string; hasAsthma: boolean; hasHeartCondition: boolean; isPregnant: boolean }>
  ) {
    const hasInfant = members.some((m) => m.ageGroup === 'INFANT');
    const hasSenior = members.some((m) => m.ageGroup === 'SENIOR');
    const hasAsthma = members.some((m) => m.hasAsthma);
    const hasHeartCondition = members.some((m) => m.hasHeartCondition);
    const hasPregnancy = members.some((m) => m.isPregnant);

    if (hasAsthma || hasHeartCondition) {
      return {
        tier: 'CRITICAL_RESPIRATORY',
        label: 'Priority Respiratory & Vascular Defense',
        targetACH: 5.5,
        indoorPM25Target: 10.0, // µg/m³
      };
    }

    if (hasInfant || hasPregnancy) {
      return {
        tier: 'PEDIATRIC_VULNERABILITY',
        label: 'High Pediatric & Maternal Protection',
        targetACH: 5.0,
        indoorPM25Target: 12.0,
      };
    }

    if (hasSenior) {
      return {
        tier: 'SENIOR_CARE',
        label: 'Senior Cardiovascular Care',
        targetACH: 4.5,
        indoorPM25Target: 15.0,
      };
    }

    return {
      tier: 'STANDARD_HOUSEHOLD',
      label: 'Standard Urban Living',
      targetACH: 4.0,
      indoorPM25Target: 20.0,
    };
  },
};
