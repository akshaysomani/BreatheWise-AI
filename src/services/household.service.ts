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
   * SCIENTIFIC BASIS & STANDARDS AUDIT (M2.1):
   * - DESIGN TARGET: 5.0 Air Changes per Hour (ACH) is an acute indoor smog and wildfire smoke
   *   filtration design target recommended by US EPA, CDC, and Harvard T.H. Chan School of Public Health.
   * - STANDARDS DISTINCTION: ASHRAE Standard 62.2 specifies minimum outdoor ventilation rates
   *   (~0.35 ACH outdoor air exchange for acceptable IAQ), which is distinct from recirculated
   *   HEPA particulate filtration CADR.
   * - UNIT CONVERSIONS: 1 CFM (cubic feet per minute) = 1.69901 m³/h (cubic meters per hour).
   *   Formula: CADR (CFM) = (Room Volume in cu ft * Target ACH) / 60 minutes.
   */
  calculateCadrRequirements(
    floorAreaSqFt: number,
    ceilingHeightFt = 9.0,
    currentPurifierCADR: number | null = null,
    targetACH = 5.0 // Particulate filtration design target during acute smog episodes
  ): CadrAnalysis {
    const roomVolume = floorAreaSqFt * ceilingHeightFt;
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
        'Indoor houseplants produce negligible Clean Air Delivery Rates (<0.05 CADR) in residential spaces. Rely exclusively on mechanical true HEPA filtration (H13/H14) for particulate smog defense.',
      standardsNote:
        'Target ACH is an EPA/CDC air cleaning guideline for acute particulate defense, distinct from ASHRAE 62.2 outdoor air ventilation minimums.',
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
