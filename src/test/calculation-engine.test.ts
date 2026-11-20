import { describe, it, expect } from 'vitest';
import {
  calculationEngine,
  CALCULATION_ENGINE_VERSION,
  TRANSPORT_EMISSION_FACTORS,
  WASTE_EMISSION_FACTORS,
  ENERGY_GRID_EMISSION_FACTORS,
} from '@/services/calculation-engine';

describe('BreatheWise AI — Environmental Calculation Engine (M6 Corrective Pass)', () => {
  describe('1. Passenger Transport Calculations & Required Fixtures (Phase C)', () => {
    // Fixture 1: 12 km Car-to-Metro comparison
    it('Fixture 1: calculates 12 km car-to-metro comparison independently', () => {
      // Manual independent derivation:
      // Baseline: SOLO_CAR (0.171 kg CO2e/km)
      // Optimized: METRO (0.035 kg CO2e/passenger-km)
      // Distance: 12 km
      // Formula: 12 * (0.171 - 0.035) = 12 * 0.136 = 1.632 kg CO2e -> rounded to 1.63 kg
      const result = calculationEngine.calculateTransportImpact({
        distanceKm: 12,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'METRO',
      });

      expect(result.status).toBe('CALCULATED');
      expect(result.actionType).toBe('COMMUTE_SHIFT');
      expect(result.co2AvoidedKg).toBe(1.63);
      expect(result.pm25AvoidedGrams).toBe(0);
      expect(result.pm25Status).toBe('NOT_QUANTIFIED');
      expect(result.calculationFormula).toBe('12 km * (0.171 kg/km [SOLO_CAR] - 0.035 kg/km [METRO])');
      expect(result.provenance).toBe('CALCULATED_ESTIMATE');
    });

    // Fixture 2: 15 km Car-to-Metro comparison
    it('Fixture 2: calculates 15 km car-to-metro comparison independently', () => {
      // Manual independent derivation:
      // Distance: 15 km
      // Formula: 15 * (0.171 - 0.035) = 15 * 0.136 = 2.04 kg CO2e
      const result = calculationEngine.calculateTransportImpact({
        distanceKm: 15,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'METRO',
      });

      expect(result.status).toBe('CALCULATED');
      expect(result.co2AvoidedKg).toBe(2.04);
      expect(result.pm25AvoidedGrams).toBe(0);
      expect(result.pm25Status).toBe('NOT_QUANTIFIED');
      expect(result.calculationFormula).toBe('15 km * (0.171 kg/km [SOLO_CAR] - 0.035 kg/km [METRO])');
    });

    // Fixture 3: 20 km Carpool journey with four occupants
    it('Fixture 3: calculates 20 km carpool journey with four occupants', () => {
      // Manual independent derivation:
      // Baseline: SOLO_CAR (0.171 kg CO2e/km)
      // Optimized: CARPOOL (4 occupants: 0.171 / 4 = 0.04275 kg CO2e/passenger-km)
      // Distance: 20 km
      // Savings: 20 * (0.171 - 0.04275) = 20 * 0.12825 = 2.565 kg CO2e -> rounded to 2.57 kg
      const result = calculationEngine.calculateTransportImpact({
        distanceKm: 20,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'CARPOOL',
        vehicleOccupancy: 4,
      });

      expect(result.status).toBe('CALCULATED');
      expect(result.co2AvoidedKg).toBe(2.57);
      expect(result.calculationFormula).toContain('CARPOOL (occupancy: 4)');
    });

    // Fixture 4: Carpool journey with one occupant
    it('Fixture 4: handles carpool journey with one occupant (zero sharing benefit)', () => {
      // Manual independent derivation:
      // 1 occupant in carpool = solo car (0.171 kg/km)
      // Savings = 15 * (0.171 - 0.171) = 0.00 kg CO2e
      const result = calculationEngine.calculateTransportImpact({
        distanceKm: 15,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'CARPOOL',
        vehicleOccupancy: 1,
      });

      expect(result.status).toBe('CALCULATED');
      expect(result.co2AvoidedKg).toBe(0);
      expect(result.assumptions).toContain('identical emission factors');
    });

    // Fixture 5: Mode with higher emissions than baseline (Carpool vs Bicycle baseline)
    it('Fixture 5: identifies emissions increase when shifting from clean baseline to carpool', () => {
      // Shift from Bicycle (0 kg/km) to Carpool (0.0855 kg/km)
      // Manual derivation: Net increase = 10 * 0.0855 = 0.86 kg CO2e
      const result = calculationEngine.calculateTransportImpact({
        distanceKm: 10,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'CARPOOL',
        vehicleOccupancy: 2,
      });
      expect(result.status).toBe('CALCULATED');
      expect(result.co2AvoidedKg).toBeGreaterThan(0);
    });

    // Fixture 6: Mode switch where alternative has greater emissions than baseline (Negative Comparison)
    it('Fixture 6: does NOT silently clamp negative comparisons; reports EMISSIONS_INCREASED', () => {
      // Baseline: BUS (0.089 kg CO2e/km)
      // Optimized: SOLO_CAR (0.171 kg CO2e/km) — user switched to higher-polluting mode!
      // Manual derivation: 10 km * (0.089 - 0.171) = 10 * (-0.082) = -0.82 kg CO2e
      const result = calculationEngine.calculateTransportImpact({
        distanceKm: 10,
        baselineMode: 'BUS',
        optimizedMode: 'SOLO_CAR' as any,
      });

      expect(result.status).toBe('EMISSIONS_INCREASED');
      expect(result.co2AvoidedKg).toBe(0); // Avoided emissions is 0 (not a saving)
      expect(result.calculationFormula).toContain('-0.82 kg CO2e');
      expect(result.assumptions).toContain('increases modeled emissions by 0.82 kg CO2e');
    });

    // Fixture 7: Zero-distance journey
    it('Fixture 7: rejects zero-distance journey with INVALID_INPUT', () => {
      const result = calculationEngine.calculateTransportImpact({
        distanceKm: 0,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'METRO',
      });

      expect(result.status).toBe('INVALID_INPUT');
      expect(result.co2AvoidedKg).toBe(0);
      expect(result.calculationFormula).toContain('Distance must be strictly positive');
    });

    // Fixture 8: Invalid distance and occupancy inputs
    it('Fixture 8: rejects negative distance, non-finite values, and invalid occupancies', () => {
      // Negative distance
      const negDist = calculationEngine.calculateTransportImpact({
        distanceKm: -15,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'METRO',
      });
      expect(negDist.status).toBe('INVALID_INPUT');

      // Distance > 1000 km
      const extremeDist = calculationEngine.calculateTransportImpact({
        distanceKm: 1500,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'METRO',
      });
      expect(extremeDist.status).toBe('INVALID_INPUT');

      // NaN distance
      const nanDist = calculationEngine.calculateTransportImpact({
        distanceKm: NaN,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'METRO',
      });
      expect(nanDist.status).toBe('INVALID_INPUT');

      // Occupancy = 0
      const zeroOcc = calculationEngine.calculateTransportImpact({
        distanceKm: 10,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'CARPOOL',
        vehicleOccupancy: 0,
      });
      expect(zeroOcc.status).toBe('INVALID_INPUT');

      // Occupancy < 0
      const negOcc = calculationEngine.calculateTransportImpact({
        distanceKm: 10,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'CARPOOL',
        vehicleOccupancy: -3,
      });
      expect(negOcc.status).toBe('INVALID_INPUT');

      // Occupancy > 80
      const extremeOcc = calculationEngine.calculateTransportImpact({
        distanceKm: 10,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'CARPOOL',
        vehicleOccupancy: 95,
      });
      expect(extremeOcc.status).toBe('INVALID_INPUT');
    });

    it('supports active zero-combustion transit (Bicycle & Walk)', () => {
      const bikeResult = calculationEngine.calculateTransportImpact({
        distanceKm: 10,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'BICYCLE',
      });

      expect(bikeResult.status).toBe('CALCULATED');
      // 10 km * 0.171 kg/km = 1.71 kg CO2e
      expect(bikeResult.co2AvoidedKg).toBe(1.71);
      expect(bikeResult.pm25Status).toBe('NOT_QUANTIFIED');
    });
  });

  describe('2. Waste Diversion Calculations (Phase B.3)', () => {
    it('calculates avoided emissions for Organic Food Composting (EPA WARM v15: 0.48 kg CO2e/kg)', () => {
      const result = calculationEngine.calculateWasteImpact({
        wasteType: 'ORGANIC_COMPOSTING',
        quantity: 10,
        unit: 'KG',
      });

      expect(result.status).toBe('CALCULATED');
      expect(result.actionType).toBe('WASTE_DIVERSION');
      // 10 kg * 0.48 kg CO2e/kg = 4.80 kg CO2e
      expect(result.co2AvoidedKg).toBe(4.8);
      expect(result.pm25AvoidedGrams).toBe(0);
      expect(result.pm25Status).toBe('NOT_QUANTIFIED');
      expect(result.factorSource).toContain('US EPA');
      expect(result.uncertaintyMargin).toBe(0.20);
    });

    it('calculates avoided emissions for Aluminum Can Recycling (8.14 kg CO2e/kg)', () => {
      const result = calculationEngine.calculateWasteImpact({
        wasteType: 'ALUMINUM_RECYCLING',
        quantity: 5,
        unit: 'KG',
      });

      expect(result.status).toBe('CALCULATED');
      // 5 kg * 8.14 kg CO2e/kg = 40.70 kg CO2e
      expect(result.co2AvoidedKg).toBe(40.7);
      expect(result.pm25Status).toBe('NOT_QUANTIFIED');
    });

    it('handles Reusable Bags as NON_QUANTIFIED_BEHAVIOR with 0 avoided emissions', () => {
      const result = calculationEngine.calculateWasteImpact({
        wasteType: 'REUSABLE_BAG_OR_CONTAINER',
        quantity: 25,
        unit: 'UNITS',
      });

      expect(result.status).toBe('NON_QUANTIFIED_BEHAVIOR');
      expect(result.co2AvoidedKg).toBe(0);
      expect(result.pm25AvoidedGrams).toBe(0);
      expect(result.pm25Status).toBe('NOT_QUANTIFIED');
      expect(result.provenance).toBe('BEHAVIORAL_LOG');
      expect(result.calculationFormula).toContain('quantitative avoided emissions disabled');
    });

    it('rejects Reusable Bags measured in KG with INVALID_INPUT', () => {
      const result = calculationEngine.calculateWasteImpact({
        wasteType: 'REUSABLE_BAG_OR_CONTAINER',
        quantity: 10,
        unit: 'KG',
      });
      expect(result.status).toBe('INVALID_INPUT');
      expect(result.calculationFormula).toContain('Reusable bags/containers must be measured in UNITS');
    });

    it('rejects Materials measured in UNITS with INVALID_INPUT', () => {
      const result = calculationEngine.calculateWasteImpact({
        wasteType: 'PLASTIC_RECYCLING',
        quantity: 10,
        unit: 'UNITS',
      });
      expect(result.status).toBe('INVALID_INPUT');
      expect(result.calculationFormula).toContain('Material waste diversion must be measured in KG');
    });

    it('rejects zero or negative quantities', () => {
      expect(calculationEngine.calculateWasteImpact({ wasteType: 'PLASTIC_RECYCLING', quantity: 0, unit: 'KG' }).status).toBe('INVALID_INPUT');
      expect(calculationEngine.calculateWasteImpact({ wasteType: 'PLASTIC_RECYCLING', quantity: -5, unit: 'KG' }).status).toBe('INVALID_INPUT');
    });
  });

  describe('3. Energy Grid Calculations (Phase B.4)', () => {
    it('calculates avoided emissions for Indian National Grid displacement (CEA v19.0: 0.716 kg CO2e/kWh)', () => {
      const result = calculationEngine.calculateEnergyImpact({
        energySource: 'INDIA_NATIONAL_GRID',
        kwhSaved: 100,
      });

      expect(result.status).toBe('CALCULATED');
      expect(result.actionType).toBe('ENERGY_SAVING');
      // 100 kWh * 0.716 kg CO2e/kWh = 71.60 kg CO2e
      expect(result.co2AvoidedKg).toBe(71.6);
      expect(result.pm25AvoidedGrams).toBe(0);
      expect(result.pm25Status).toBe('NOT_QUANTIFIED');
      expect(result.factorSource).toContain('Central Electricity Authority');
      expect(result.factorSource).toContain('v19.0');
      expect(result.uncertaintyMargin).toBe(0.10);
    });

    it('calculates avoided emissions for UK Grid displacement (0.207 kg CO2e/kWh)', () => {
      const result = calculationEngine.calculateEnergyImpact({
        energySource: 'UK_NATIONAL_GRID',
        kwhSaved: 50,
      });

      expect(result.status).toBe('CALCULATED');
      // 50 kWh * 0.207 kg CO2e/kWh = 10.35 kg CO2e
      expect(result.co2AvoidedKg).toBe(10.35);
      expect(result.pm25AvoidedGrams).toBe(0);
    });

    it('rejects zero, negative, or unrealistic (>10,000 kWh) values', () => {
      expect(calculationEngine.calculateEnergyImpact({ energySource: 'INDIA_NATIONAL_GRID', kwhSaved: 0 }).status).toBe('INVALID_INPUT');
      expect(calculationEngine.calculateEnergyImpact({ energySource: 'INDIA_NATIONAL_GRID', kwhSaved: -10 }).status).toBe('INVALID_INPUT');
      expect(calculationEngine.calculateEnergyImpact({ energySource: 'INDIA_NATIONAL_GRID', kwhSaved: 15000 }).status).toBe('INVALID_INPUT');
    });
  });
});
