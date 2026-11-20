import { impactRepository, CreateImpactLogInput } from '@/repositories/impact.repository';

// Standard UK DEFRA / US EPA Light Vehicle Passenger Conversion Factors (kg CO2e per km)
export const EMISSION_FACTORS: Record<string, { co2PerKm: number; pm25GramsPerKm: number }> = {
  SOLO_CAR: { co2PerKm: 0.171, pm25GramsPerKm: 0.015 },
  DIESEL_CAR: { co2PerKm: 0.165, pm25GramsPerKm: 0.025 },
  MOTORCYCLE: { co2PerKm: 0.105, pm25GramsPerKm: 0.012 },
  BUS: { co2PerKm: 0.089, pm25GramsPerKm: 0.006 },
  METRO: { co2PerKm: 0.035, pm25GramsPerKm: 0.001 },
  CARPOOL: { co2PerKm: 0.085, pm25GramsPerKm: 0.007 },
  BICYCLE: { co2PerKm: 0.0, pm25GramsPerKm: 0.0 },
  WALK: { co2PerKm: 0.0, pm25GramsPerKm: 0.0 },
};

export const impactService = {
  async getLogs(userId: string, limit?: number) {
    return impactRepository.getByUserId(userId, limit);
  },

  async recordLog(userId: string, data: CreateImpactLogInput) {
    return impactRepository.create(userId, data);
  },

  async getAggregates(userId: string) {
    return impactRepository.getAggregates(userId);
  },

  calculateTransitSavings(distanceKm: number, baselineMode: string, optimizedMode: string) {
    const base = EMISSION_FACTORS[baselineMode] || EMISSION_FACTORS.SOLO_CAR;
    const opt = EMISSION_FACTORS[optimizedMode] || EMISSION_FACTORS.METRO;

    const co2SavedKg = Math.max(0, distanceKm * (base.co2PerKm - opt.co2PerKm));
    const pm25SavedGrams = Math.max(0, distanceKm * (base.pm25GramsPerKm - opt.pm25GramsPerKm));

    const formula = `${distanceKm} km * (${base.co2PerKm} kg/km [${baselineMode}] - ${opt.co2PerKm} kg/km [${optimizedMode}])`;

    return {
      co2AvoidedKg: Math.round(co2SavedKg * 100) / 100,
      pm25AvoidedGrams: Math.round(pm25SavedGrams * 100) / 100,
      distanceShiftedKm: distanceKm,
      calculationFormula: formula,
      uncertaintyMargin: 0.15, // Stated ±15% standard error margin
    };
  },
};
