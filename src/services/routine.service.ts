import { routineRepository, CreateRoutineInput, UpdateRoutineInput } from '@/repositories/routine.repository';
import { impactService } from './impact.service';

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

    // Default inhaled dose reduction approximations based on transit mode filtration
    if (data.optimizedMode && !data.estimatedDoseReduction) {
      if (data.optimizedMode === 'METRO') {
        data.estimatedDoseReduction = 64.0; // Underground filtered air
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
    const isHazardous = outdoorAQI > 200;
    const isVeryUnhealthy = outdoorAQI > 150;

    if ((baselineMode === 'BICYCLE' || baselineMode === 'WALK') && isVeryUnhealthy) {
      return {
        isSafe: false,
        warning:
          'Active outdoor exertion during severe smog (AQI > 150) dramatically increases inhaled minute-volume, depositing toxic fine particulates in deep lung alveoli. Shift temporarily to sealed filtered transit (metro or rideshare).',
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
