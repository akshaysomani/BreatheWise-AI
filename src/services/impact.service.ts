import { impactRepository, CreateImpactLogInput } from '@/repositories/impact.repository';

/**
 * Passenger Transport Benchmark Conversion Factors (kg CO2e per passenger-km)
 * 
 * SCIENTIFIC PROVENANCE & LIMITATIONS AUDIT (M2.1):
 * - SOURCE: UK Department for Energy Security and Net Zero (DESNZ) / DEFRA 2023/2024 Greenhouse Gas Conversion Factors.
 * - BASELINE FACTORS:
 *   - SOLO_CAR: 0.171 kg CO2e/km (Average petrol car, single occupancy)
 *   - DIESEL_CAR: 0.165 kg CO2e/km
 *   - MOTORCYCLE: 0.105 kg CO2e/km
 *   - BUS: 0.089 kg CO2e/km (Average local urban bus per passenger-km)
 *   - METRO: 0.035 kg CO2e/km (London Underground / urban light rail per passenger-km)
 *   - CARPOOL: 0.085 kg CO2e/km (Two passengers sharing medium vehicle)
 * - GEOGRAPHIC APPLICABILITY & GRID DEPENDENCY:
 *   Electric transit (metro, electric bus) factors depend on regional electricity grid emission factors.
 *   In coal-heavy electricity grids (e.g. India at ~0.71 kg CO2/kWh vs UK at ~0.207 kg CO2/kWh),
 *   electric transit emissions are proportionally higher.
 * - UNCERTAINTY BOUNDS: A standard error margin of ±15% is attached to reflect variability in vehicle age,
 *   congestion idling, and HVAC power consumption.
 */
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
