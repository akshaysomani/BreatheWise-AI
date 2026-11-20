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
   * - BOUNDS: Inputs are validated against plausible residential dimensions (20-5,000 sq ft, 7-18 ft height).
   *   Out-of-range inputs throw explicit validation errors rather than silently clamping.
   */
  calculateCadrRequirements(
    floorAreaSqFt: number,
    ceilingHeightFt = 9.0,
    currentPurifierCADR: number | null = null,
    targetACH = 5.0 // Particulate filtration design target during acute smog episodes
  ): CadrAnalysis {
    if (typeof floorAreaSqFt !== 'number' || !Number.isFinite(floorAreaSqFt) || floorAreaSqFt < 20 || floorAreaSqFt > 5000) {
      throw new Error(`Invalid room floor area: ${floorAreaSqFt}. Must be a finite number between 20 and 5,000 sq ft.`);
    }
    if (typeof ceilingHeightFt !== 'number' || !Number.isFinite(ceilingHeightFt) || ceilingHeightFt < 7 || ceilingHeightFt > 18) {
      throw new Error(`Invalid ceiling height: ${ceilingHeightFt}. Must be a finite number between 7 and 18 ft.`);
    }
    if (targetACH !== undefined && (typeof targetACH !== 'number' || !Number.isFinite(targetACH) || targetACH < 1 || targetACH > 12)) {
      throw new Error(`Invalid target ACH: ${targetACH}. Must be between 1.0 and 12.0.`);
    }
    if (currentPurifierCADR !== null && currentPurifierCADR !== undefined && (typeof currentPurifierCADR !== 'number' || !Number.isFinite(currentPurifierCADR) || currentPurifierCADR < 0 || currentPurifierCADR > 5000)) {
      throw new Error(`Invalid purifier CADR: ${currentPurifierCADR}. Must be a non-negative number up to 5,000 CFM.`);
    }

    const roomVolume = Math.round(floorAreaSqFt * ceilingHeightFt);
    const requiredCFM = Math.round((roomVolume * targetACH) / 60);
    const requiredM3H = Math.round(requiredCFM * 1.69901);

    let isCurrentPurifierAdequate = false;
    let actualACH: number | null = null;
    let deficit = requiredCFM;

    if (currentPurifierCADR !== null && currentPurifierCADR > 0) {
      actualACH = Math.round(((currentPurifierCADR * 60) / roomVolume) * 10) / 10;
      isCurrentPurifierAdequate = currentPurifierCADR >= requiredCFM;
      deficit = Math.max(0, requiredCFM - currentPurifierCADR);
    }

    return {
      roomVolumeCuFt: roomVolume,
      targetACH,
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
