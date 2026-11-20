import { routineRepository, CreateRoutineInput, UpdateRoutineInput } from '@/repositories/routine.repository';
import { impactService } from './impact.service';

/**
 * Commute Routine & Inhaled Dose Exposure Service
 * 
 * SCIENTIFIC INHALED DOSE MODEL (M2.1):
 * - Formula: Inhaled Dose (µg) = Concentration (µg/m³) * Minute Ventilation Ve (m³/min) * Duration (min) * (1 - FilterEfficiency)
 * - ASSUMPTIONS:
 *   - Active commuters (cyclists/pedestrians) exert higher physical effort, increasing minute ventilation
 *     (Ve ≈ 35–55 L/min vs 10–14 L/min for seated vehicular passengers).
 *   - Sealed metro carriages equipped with HVAC filtration typically reduce interior particulate concentrations
 *     by 40–70% relative to roadway curbside pollution.
 *   - Modeled dose reduction percentages are approximations based on typical urban commuter exposure ratios.
 */
export const routineService = {
  async getUserRoutines(userId: string) {
    return routineRepository.getByUserId(userId);
  },

  async createRoutine(userId: string, data: CreateRoutineInput) {
    // If not manually provided, automatically calculate estimated CO2 savings
    if (data.optimizedMode && !data.estimatedCO2SavingsKg) {
      const savings = impactService.calculateTransitSavings(
        data.distanceKm,
        data.baselineMode,
        data.optimizedMode
      );
      data.estimatedCO2SavingsKg = savings.co2AvoidedKg;
    }

    // Default modeled inhaled dose reduction approximations
    if (data.optimizedMode && !data.estimatedDoseReduction) {
      if (data.optimizedMode === 'METRO') {
        data.estimatedDoseReduction = 64.0; // Seated lower ventilation + HVAC filtration
      } else if (data.optimizedMode === 'BUS') {
        data.estimatedDoseReduction = 35.0;
      } else if (data.optimizedMode === 'CARPOOL') {
        data.estimatedDoseReduction = 45.0;
      }
    }

    return routineRepository.create(userId, data);
  },

  async updateRoutine(userId: string, routineId: string, data: UpdateRoutineInput) {
    return routineRepository.update(userId, routineId, data);
  },

  async deleteRoutine(userId: string, routineId: string) {
    return routineRepository.delete(userId, routineId);
  },

  evaluateCommuteSafety(baselineMode: string, outdoorAQI: number) {
    const isVeryUnhealthy = outdoorAQI > 150;

    if ((baselineMode === 'BICYCLE' || baselineMode === 'WALK') && isVeryUnhealthy) {
      return {
        isSafe: false,
        warning:
          'Active outdoor exertion during severe smog (AQI > 150) dramatically increases inhaled minute-volume and minute ventilation (Ve ≈ 40–55 L/min), depositing fine particulate matter in deep alveolar tissue. Shift temporarily to sealed filtered transit (metro or rideshare).',
        recommendedAlternative: 'METRO',
      };
    }

    return {
      isSafe: true,
      warning: null,
      recommendedAlternative: null,
    };
  },
};
