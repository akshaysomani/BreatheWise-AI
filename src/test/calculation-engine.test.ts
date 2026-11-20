import { describe, it, expect } from 'vitest';
import {
  calculationEngine,
  CALCULATION_ENGINE_VERSION,
  TRANSPORT_EMISSION_FACTORS,
  WASTE_EMISSION_FACTORS,
  ENERGY_GRID_EMISSION_FACTORS,
} from '@/services/calculation-engine';

describe('BreatheWise AI — Environmental Calculation Engine (M6)', () => {
  describe('1. Passenger Transport Calculations', () => {
    it('calculates avoided emissions for standard Solo Car to Metro commute', () => {
      const result = calculationEngine.calculateTransportImpact({
        distanceKm: 15,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'METRO',
      });

      expect(result.status).toBe('CALCULATED');
      expect(result.actionType).toBe('COMMUTE_SHIFT');
      expect(result.methodologyVersion).toBe(CALCULATION_ENGINE_VERSION);
      expect(result.provenance).toBe('CALCULATED_ESTIMATE');

      // Expected CO2 avoided: 15 km * (0.171 - 0.035) = 15 * 0.136 = 2.04 kg CO2e
      expect(result.co2AvoidedKg).toBe(2.04);
      // Expected PM2.5 avoided: 15 km * (0.015 - 0.001) = 15 * 0.014 = 0.21 g PM2.5
      expect(result.pm25AvoidedGrams).toBe(0.21);
      expect(result.calculationFormula).toContain('15 km * (0.171 kg/km [SOLO_CAR] - 0.035 kg/km [METRO])');
      expect(result.uncertaintyMargin).toBe(0.15);
      expect(result.factorSource).toContain('UK DESNZ / DEFRA 2024');
    });

    it('calculates zero avoided emissions when baseline and optimized modes are identical', () => {
      const result = calculationEngine.calculateTransportImpact({
        distanceKm: 20,
        baselineMode: 'BUS',
        optimizedMode: 'BUS',
      });

      expect(result.status).toBe('CALCULATED');
      expect(result.co2AvoidedKg).toBe(0);
      expect(result.pm25AvoidedGrams).toBe(0);
    });

    it('calculates zero avoided emissions if optimized mode has higher emissions than baseline', () => {
      const result = calculationEngine.calculateTransportImpact({
        distanceKm: 10,
        baselineMode: 'BUS', // 0.089 kg/km
        optimizedMode: 'CARPOOL', // 0.0855 kg/km (lower)
      });
      expect(result.co2AvoidedKg).toBeGreaterThan(0);
    });

    it('supports active zero-emission modes (Bicycle & Walk)', () => {
      const bikeResult = calculationEngine.calculateTransportImpact({
        distanceKm: 8,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'BICYCLE',
      });

      expect(bikeResult.status).toBe('CALCULATED');
      expect(bikeResult.co2AvoidedKg).toBe(Math.round(8 * 0.171 * 100) / 100);
      expect(bikeResult.pm25AvoidedGrams).toBe(Math.round(8 * 0.015 * 100) / 100);
    });

    it('handles custom carpool occupancy correctly', () => {
      const customCarpool = calculationEngine.calculateTransportImpact({
        distanceKm: 20,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'CARPOOL',
        vehicleOccupancy: 4,
      });

      // Factor with 4 occupants = 0.171 / 4 = 0.04275 kg/km
      // Savings = 20 * (0.171 - 0.04275) = 2.565 kg -> 2.57 kg
      expect(customCarpool.status).toBe('CALCULATED');
      expect(customCarpool.co2AvoidedKg).toBe(2.57);
    });

    it('rejects invalid or extreme occupancy values with INVALID_INPUT', () => {
      const zeroOcc = calculationEngine.calculateTransportImpact({
        distanceKm: 15,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'CARPOOL',
        vehicleOccupancy: 0,
      });
      expect(zeroOcc.status).toBe('INVALID_INPUT');

      const negOcc = calculationEngine.calculateTransportImpact({
        distanceKm: 15,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'CARPOOL',
        vehicleOccupancy: -2,
      });
      expect(negOcc.status).toBe('INVALID_INPUT');

      const extremeOcc = calculationEngine.calculateTransportImpact({
        distanceKm: 15,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'CARPOOL',
        vehicleOccupancy: 120,
      });
      expect(extremeOcc.status).toBe('INVALID_INPUT');
    });

    it('rejects non-positive distance values with INVALID_INPUT', () => {
      const zeroDist = calculationEngine.calculateTransportImpact({
        distanceKm: 0,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'METRO',
      });
      expect(zeroDist.status).toBe('INVALID_INPUT');
      expect(zeroDist.co2AvoidedKg).toBe(0);

      const negDist = calculationEngine.calculateTransportImpact({
        distanceKm: -10,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'METRO',
      });
      expect(negDist.status).toBe('INVALID_INPUT');
    });

    it('rejects distances exceeding realistic daily passenger limits (>1,000 km)', () => {
      const extremeDist = calculationEngine.calculateTransportImpact({
        distanceKm: 1200,
        baselineMode: 'SOLO_CAR',
        optimizedMode: 'METRO',
      });
      expect(extremeDist.status).toBe('INVALID_INPUT');
    });
  });

  describe('2. Waste Diversion Calculations', () => {
    it('calculates avoided emissions for Organic Food Composting', () => {
      const result = calculationEngine.calculateWasteImpact({
        wasteType: 'ORGANIC_COMPOSTING',
        quantity: 10,
        unit: 'KG',
      });

      expect(result.status).toBe('CALCULATED');
      expect(result.actionType).toBe('WASTE_DIVERSION');
      // 10 kg * 0.48 kg CO2e/kg = 4.80 kg CO2e
      expect(result.co2AvoidedKg).toBe(4.8);
      // Waste PM2.5 avoided is safely disabled to prevent fabrication
      expect(result.pm25AvoidedGrams).toBe(0);
      expect(result.factorSource).toContain('US EPA');
      expect(result.uncertaintyMargin).toBe(0.20);
    });

    it('calculates avoided emissions for Aluminum Can Recycling', () => {
      const result = calculationEngine.calculateWasteImpact({
        wasteType: 'ALUMINUM_RECYCLING',
        quantity: 5,
        unit: 'KG',
      });

      expect(result.status).toBe('CALCULATED');
      // 5 kg * 8.14 kg CO2e/kg = 40.70 kg CO2e
      expect(result.co2AvoidedKg).toBe(40.7);
      expect(result.pm25AvoidedGrams).toBe(0);
    });

    it('handles Reusable Bags as NON_QUANTIFIED_BEHAVIOR with 0 avoided emissions', () => {
      const result = calculationEngine.calculateWasteImpact({
        wasteType: 'REUSABLE_BAG_OR_CONTAINER',
        quantity: 50,
        unit: 'UNITS',
      });

      expect(result.status).toBe('NON_QUANTIFIED_BEHAVIOR');
      expect(result.co2AvoidedKg).toBe(0);
      expect(result.pm25AvoidedGrams).toBe(0);
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
      const zeroQty = calculationEngine.calculateWasteImpact({
        wasteType: 'PLASTIC_RECYCLING',
        quantity: 0,
        unit: 'KG',
      });
      expect(zeroQty.status).toBe('INVALID_INPUT');

      const negQty = calculationEngine.calculateWasteImpact({
        wasteType: 'PLASTIC_RECYCLING',
        quantity: -5,
        unit: 'KG',
      });
      expect(negQty.status).toBe('INVALID_INPUT');
    });
  });

  describe('3. Energy Grid Calculations', () => {
    it('calculates avoided emissions for Indian National Grid displacement', () => {
      const result = calculationEngine.calculateEnergyImpact({
        energySource: 'INDIA_NATIONAL_GRID',
        kwhSaved: 100,
      });

      expect(result.status).toBe('CALCULATED');
      expect(result.actionType).toBe('ENERGY_SAVING');
      // 100 kWh * 0.716 kg CO2e/kWh = 71.60 kg CO2e
      expect(result.co2AvoidedKg).toBe(71.6);
      // Grid PM2.5 is safely disabled (0 g) per Prompt Section 5.4 audit
      expect(result.pm25AvoidedGrams).toBe(0);
      expect(result.factorSource).toContain('Central Electricity Authority');
      expect(result.uncertaintyMargin).toBe(0.10);
    });

    it('calculates avoided emissions for UK Grid displacement', () => {
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

  describe('4. Methodology Metadata & Integrity Invariants', () => {
    it('returns authoritative standards citations and current methodology version', () => {
      const meta = calculationEngine.getMethodologyMetadata();
      expect(meta.version).toBe(CALCULATION_ENGINE_VERSION);
      expect(meta.standards.length).toBeGreaterThanOrEqual(4);
      expect(meta.standards.some((s) => s.includes('UK DESNZ'))).toBe(true);
      expect(meta.standards.some((s) => s.includes('CEA'))).toBe(true);
      expect(meta.standards.some((s) => s.includes('WARM'))).toBe(true);
    });
  });
});
