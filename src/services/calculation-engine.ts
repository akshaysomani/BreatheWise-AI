/**
 * BreatheWise AI — Scientific Environmental Calculation Engine (M6)
 * 
 * METHODOLOGY & PROVENANCE STANDARDS:
 * 1. Zero-Fabrication Determinism: All calculations use closed-form arithmetic with documented,
 *    peer-reviewed emission factors. No LLM arithmetic or invented percentages.
 * 2. Multi-Category Environmental Accounting:
 *    - Passenger Transport: Mode-shift avoidance based on UK DESNZ / DEFRA 2024 Greenhouse Gas
 *      Conversion Factors and Indian ARAI vehicular emission benchmarks.
 *    - Waste Diversion: Material-specific avoided landfill methane factors derived from US EPA
 *      Waste Reduction Model (WARM v15) and UK DEFRA 2024.
 *    - Energy Efficiency: Grid displacement using India Central Electricity Authority (CEA)
 *      CO2 Baseline Database v19.0 (2024) and regional factors.
 * 3. Transparent Audit Trail: Every calculation returns input values, normalized quantities,
 *    source factor citations, explicit baseline assumptions, and qualitative uncertainty descriptions.
 */

export const CALCULATION_ENGINE_VERSION = '2024.1.0';

export interface TransportCalculationInput {
  distanceKm: number;
  baselineMode: 'SOLO_CAR' | 'DIESEL_CAR' | 'MOTORCYCLE' | 'BUS' | 'AUTO_RICKSHAW_CNG';
  optimizedMode: 'METRO' | 'BUS' | 'CARPOOL' | 'BICYCLE' | 'WALK' | 'ELECTRIC_CAR';
  vehicleOccupancy?: number;
}

export interface WasteCalculationInput {
  wasteType:
    | 'ORGANIC_COMPOSTING'
    | 'PLASTIC_RECYCLING'
    | 'PAPER_CARDBOARD_RECYCLING'
    | 'ALUMINUM_RECYCLING'
    | 'GLASS_RECYCLING'
    | 'REUSABLE_BAG_OR_CONTAINER';
  quantity: number; // kg for materials, or integer count for reusable bags/containers
  unit: 'KG' | 'UNITS';
}

export interface EnergyCalculationInput {
  energySource: 'INDIA_NATIONAL_GRID' | 'SOLAR_ROOFTOP_DISPLACEMENT' | 'UK_NATIONAL_GRID' | 'US_AVERAGE_GRID';
  kwhSaved: number;
}

export interface CalculationResult {
  status: 'CALCULATED' | 'INSUFFICIENT_DATA' | 'UNSUPPORTED_METHOD' | 'INVALID_INPUT';
  actionType: 'COMMUTE_SHIFT' | 'WASTE_DIVERSION' | 'ENERGY_SAVING';
  co2AvoidedKg: number;
  pm25AvoidedGrams: number;
  calculationFormula: string;
  methodologyVersion: string;
  emissionFactorUsed: string;
  factorSource: string;
  assumptions: string;
  uncertaintyDescription: string;
  uncertaintyMargin: number;
  provenance: 'CALCULATED_ESTIMATE';
}

// ============================================================================
// 1. Authoritative Emission Factors Registry
// ============================================================================

export const TRANSPORT_EMISSION_FACTORS = {
  SOLO_CAR: {
    co2PerKm: 0.171,
    pm25GramsPerKm: 0.015,
    description: 'Average petrol passenger car (single occupant, 1.4-2.0L)',
    source: 'UK DESNZ / DEFRA 2024 Conversion Factors (Passenger Vehicles)',
  },
  DIESEL_CAR: {
    co2PerKm: 0.165,
    pm25GramsPerKm: 0.025,
    description: 'Average diesel passenger car (single occupant)',
    source: 'UK DESNZ / DEFRA 2024 Conversion Factors (Diesel Car)',
  },
  MOTORCYCLE: {
    co2PerKm: 0.105,
    pm25GramsPerKm: 0.012,
    description: 'Medium 4-stroke two-wheeler ICE (125-250cc)',
    source: 'ARAI / CPCB Vehicular Emission Inventory Benchmark',
  },
  AUTO_RICKSHAW_CNG: {
    co2PerKm: 0.078,
    pm25GramsPerKm: 0.004,
    description: 'Compressed Natural Gas (CNG) 3-wheeler passenger transit',
    source: 'CPCB Urban Transit Factsheet / MoPNG',
  },
  BUS: {
    co2PerKm: 0.089,
    pm25GramsPerKm: 0.006,
    description: 'Average municipal bus per passenger-km at ~45% occupancy',
    source: 'UK DESNZ / DEFRA 2024 Conversion Factors (Local Bus)',
  },
  METRO: {
    co2PerKm: 0.035,
    pm25GramsPerKm: 0.001,
    description: 'Urban rapid rail transit / DMRC electric metro per passenger-km',
    source: 'DMRC Clean Development Mechanism (CDM) Verification / DESNZ 2024',
  },
  CARPOOL: {
    co2PerKm: 0.085,
    pm25GramsPerKm: 0.007,
    description: 'Passenger car shared between two commuters',
    source: 'DESNZ 2024 (Solo car divided by 2.0 occupancy)',
  },
  ELECTRIC_CAR: {
    co2PerKm: 0.052,
    pm25GramsPerKm: 0.002,
    description: 'Battery Electric Vehicle (BEV) at average grid intensity',
    source: 'DESNZ 2024 Battery Electric Car (Lifecycle operational)',
  },
  BICYCLE: {
    co2PerKm: 0.0,
    pm25GramsPerKm: 0.0,
    description: 'Non-motorized active transit (zero tailpipe emissions)',
    source: 'Physical Invariant (Zero Combustion)',
  },
  WALK: {
    co2PerKm: 0.0,
    pm25GramsPerKm: 0.0,
    description: 'Non-motorized pedestrian transit (zero tailpipe emissions)',
    source: 'Physical Invariant (Zero Combustion)',
  },
} as const;

export const WASTE_EMISSION_FACTORS = {
  ORGANIC_COMPOSTING: {
    co2AvoidedPerKg: 0.48,
    pm25GramsAvoidedPerKg: 0.008,
    description: 'Aerobic composting avoiding anaerobic municipal landfill methane generation & open burning plumes',
    source: 'US EPA Waste Reduction Model (WARM v15) — Food & Yard Waste Composting',
  },
  PLASTIC_RECYCLING: {
    co2AvoidedPerKg: 1.25,
    pm25GramsAvoidedPerKg: 0.005,
    description: 'Recycling rigid mixed plastics (HDPE/PET) displacing virgin fossil resin synthesis',
    source: 'UK DEFRA 2024 Waste Conversion Factors (Plastics: Commercial & Industrial)',
  },
  PAPER_CARDBOARD_RECYCLING: {
    co2AvoidedPerKg: 0.95,
    pm25GramsAvoidedPerKg: 0.003,
    description: 'Recycling corrugated containers & newsprint vs virgin chemical kraft pulping & landfilling',
    source: 'US EPA WARM v15 (Corrugated Containers)',
  },
  ALUMINUM_RECYCLING: {
    co2AvoidedPerKg: 8.14,
    pm25GramsAvoidedPerKg: 0.015,
    description: 'Secondary aluminum remelting saving ~95% electrical energy vs Hall-Héroult bauxite smelting',
    source: 'The International Aluminium Institute (IAI) & US EPA WARM v15',
  },
  GLASS_RECYCLING: {
    co2AvoidedPerKg: 0.28,
    pm25GramsAvoidedPerKg: 0.002,
    description: 'Cullet recycling into container glass displacing limestone/soda ash calcination',
    source: 'European Container Glass Federation (FEVE) / DEFRA 2024',
  },
  REUSABLE_BAG_OR_CONTAINER: {
    co2AvoidedPerUnit: 0.033,
    pm25GramsAvoidedPerUnit: 0.0005,
    description: 'Avoided manufacture, transport, and disposal of a single-use LDPE plastic shopping bag (~6g)',
    source: 'UK Environment Agency Lifecycle Assessment of Supermarket Carrier Bags',
  },
} as const;

export const ENERGY_GRID_EMISSION_FACTORS = {
  INDIA_NATIONAL_GRID: {
    co2PerKwh: 0.716,
    pm25GramsPerKwh: 0.045,
    description: 'Indian National Electricity Grid Combined Margin (Weighted coal, hydro, renewable mix)',
    source: 'Central Electricity Authority (CEA) of India, CO2 Baseline Database for the Power Sector, v19.0 (2024)',
  },
  SOLAR_ROOFTOP_DISPLACEMENT: {
    co2PerKwh: 0.716,
    pm25GramsPerKwh: 0.045,
    description: 'Rooftop distributed photovoltaic generation directly displacing marginal Indian grid thermal power',
    source: 'CEA India v19.0 Marginal Grid Factor (Displacement accounting)',
  },
  UK_NATIONAL_GRID: {
    co2PerKwh: 0.207,
    pm25GramsPerKwh: 0.004,
    description: 'UK National Grid Electricity transmission & generation composite',
    source: 'UK DESNZ 2024 Greenhouse Gas Reporting Factors',
  },
  US_AVERAGE_GRID: {
    co2PerKwh: 0.386,
    pm25GramsPerKwh: 0.012,
    description: 'US eGRID National Average Electricity Emissions Factor',
    source: 'US EPA Emissions & Generation Resource Integrated Database (eGRID 2024)',
  },
} as const;

export const PASSENGER_TRANSPORT_FACTORS = TRANSPORT_EMISSION_FACTORS;
export const WASTE_FACTORS = WASTE_EMISSION_FACTORS;
export const GRID_ELECTRICITY_FACTORS = ENERGY_GRID_EMISSION_FACTORS;

// ============================================================================
// 2. Scientific Calculation Engine Implementation
// ============================================================================

export const calculationEngine = {
  /**
   * Calculates avoided CO2e and primary PM2.5 from passenger transit modal shift.
   */
  calculateTransportImpact(input: TransportCalculationInput): CalculationResult {
    // 1. Boundary & Range Validations
    if (!input || typeof input !== 'object') {
      return this.buildInvalidResult('COMMUTE_SHIFT', 'Missing or malformed input payload.');
    }

    const { distanceKm, baselineMode, optimizedMode, vehicleOccupancy } = input;

    if (typeof distanceKm !== 'number' || isNaN(distanceKm) || !isFinite(distanceKm)) {
      return this.buildInvalidResult('COMMUTE_SHIFT', 'Distance must be a valid, finite number.');
    }

    if (distanceKm <= 0) {
      return this.buildInvalidResult('COMMUTE_SHIFT', 'Distance must be strictly positive (greater than 0 km).');
    }

    if (distanceKm > 1000) {
      return this.buildInvalidResult('COMMUTE_SHIFT', 'Distance exceeds reasonable single commute boundary (max 1,000 km).');
    }

    const baseFactor = TRANSPORT_EMISSION_FACTORS[baselineMode];
    const optFactor = TRANSPORT_EMISSION_FACTORS[optimizedMode];

    if (!baseFactor || !optFactor) {
      return {
        status: 'UNSUPPORTED_METHOD',
        actionType: 'COMMUTE_SHIFT',
        co2AvoidedKg: 0,
        pm25AvoidedGrams: 0,
        calculationFormula: 'Unsupported transit mode combination',
        methodologyVersion: CALCULATION_ENGINE_VERSION,
        emissionFactorUsed: 'NONE',
        factorSource: 'NONE',
        assumptions: 'Invalid transit mode selected.',
        uncertaintyDescription: 'Cannot calculate impact for unknown mode.',
        uncertaintyMargin: 0,
        provenance: 'CALCULATED_ESTIMATE',
      };
    }

    // 2. Mathematical Closed-Form Calculation
    const effectiveOptCo2 =
      optimizedMode === 'CARPOOL' && vehicleOccupancy && vehicleOccupancy > 1
        ? baseFactor.co2PerKm / vehicleOccupancy
        : optFactor.co2PerKm;
    const effectiveOptPm25 =
      optimizedMode === 'CARPOOL' && vehicleOccupancy && vehicleOccupancy > 1
        ? baseFactor.pm25GramsPerKm / vehicleOccupancy
        : optFactor.pm25GramsPerKm;

    const co2DifferencePerKm = baseFactor.co2PerKm - effectiveOptCo2;
    const pm25DifferencePerKm = baseFactor.pm25GramsPerKm - effectiveOptPm25;

    const co2AvoidedKg = Math.max(0, distanceKm * co2DifferencePerKm);
    const pm25AvoidedGrams = Math.max(0, distanceKm * pm25DifferencePerKm);

    const roundedCo2 = Math.round(co2AvoidedKg * 100) / 100;
    const roundedPm25 = Math.round(pm25AvoidedGrams * 100) / 100;

    const formula = `${distanceKm} km * (${baseFactor.co2PerKm} kg/km [${baselineMode}] - ${Math.round(effectiveOptCo2 * 1000) / 1000} kg/km [${optimizedMode}])`;

    return {
      status: 'CALCULATED',
      actionType: 'COMMUTE_SHIFT',
      co2AvoidedKg: roundedCo2,
      pm25AvoidedGrams: roundedPm25,
      calculationFormula: formula,
      methodologyVersion: CALCULATION_ENGINE_VERSION,
      emissionFactorUsed: `Baseline: ${baseFactor.co2PerKm} kg/km | Alternative: ${optFactor.co2PerKm} kg/km`,
      factorSource: `${baseFactor.source}; ${optFactor.source}`,
      assumptions: `Assumes standard passenger occupancy (${baselineMode} solo occupancy unless stated otherwise; ${optimizedMode} municipal average load factor). Congestion idling not modeled.`,
      uncertaintyDescription: 'Variability in vehicle engine displacement, driving cycle, traffic congestion, and HVAC electrical load introduces an estimated ±15% variance.',
      uncertaintyMargin: 0.15,
      provenance: 'CALCULATED_ESTIMATE',
    };
  },

  /**
   * Calculates avoided lifecycle GHG emissions and particulate matter from waste diversion.
   */
  calculateWasteImpact(input: WasteCalculationInput): CalculationResult {
    if (!input || typeof input !== 'object') {
      return this.buildInvalidResult('WASTE_DIVERSION', 'Missing or malformed input payload.');
    }

    const { wasteType, quantity, unit } = input;

    if (typeof quantity !== 'number' || isNaN(quantity) || !isFinite(quantity)) {
      return this.buildInvalidResult('WASTE_DIVERSION', 'Quantity must be a valid, finite number.');
    }

    if (quantity <= 0) {
      return this.buildInvalidResult('WASTE_DIVERSION', 'Quantity must be strictly positive (greater than 0).');
    }

    if (quantity > 1000) {
      return this.buildInvalidResult('WASTE_DIVERSION', 'Quantity exceeds personal single-activity logging bounds (max 1,000 kg or units).');
    }

    const factor = WASTE_EMISSION_FACTORS[wasteType];
    if (!factor) {
      return {
        status: 'UNSUPPORTED_METHOD',
        actionType: 'WASTE_DIVERSION',
        co2AvoidedKg: 0,
        pm25AvoidedGrams: 0,
        calculationFormula: 'Unsupported waste category',
        methodologyVersion: CALCULATION_ENGINE_VERSION,
        emissionFactorUsed: 'NONE',
        factorSource: 'NONE',
        assumptions: 'Invalid waste category.',
        uncertaintyDescription: 'Cannot calculate impact for unknown waste type.',
        uncertaintyMargin: 0,
        provenance: 'CALCULATED_ESTIMATE',
      };
    }

    let co2AvoidedKg = 0;
    let pm25AvoidedGrams = 0;
    let formula = '';
    let factorDescription = '';

    if (wasteType === 'REUSABLE_BAG_OR_CONTAINER') {
      if (unit !== 'UNITS') {
        return this.buildInvalidResult('WASTE_DIVERSION', 'Reusable bags/containers must be measured in UNITS.');
      }
      const bagFactor = WASTE_EMISSION_FACTORS.REUSABLE_BAG_OR_CONTAINER;
      co2AvoidedKg = quantity * bagFactor.co2AvoidedPerUnit;
      pm25AvoidedGrams = quantity * bagFactor.pm25GramsAvoidedPerUnit;
      formula = `${quantity} units × ${bagFactor.co2AvoidedPerUnit} kg CO2e/unit avoided`;
      factorDescription = `${bagFactor.co2AvoidedPerUnit} kg CO2e / single-use unit`;
    } else {
      if (unit !== 'KG') {
        return this.buildInvalidResult('WASTE_DIVERSION', 'Material waste diversion must be measured in KG.');
      }
      const materialFactor = factor as { co2AvoidedPerKg: number; pm25GramsAvoidedPerKg: number; source: string };
      co2AvoidedKg = quantity * materialFactor.co2AvoidedPerKg;
      pm25AvoidedGrams = quantity * materialFactor.pm25GramsAvoidedPerKg;
      formula = `${quantity} kg × ${materialFactor.co2AvoidedPerKg} kg CO2e/kg diverted`;
      factorDescription = `${materialFactor.co2AvoidedPerKg} kg CO2e / kg diverted`;
    }

    const roundedCo2 = Math.round(co2AvoidedKg * 100) / 100;
    const roundedPm25 = Math.round(pm25AvoidedGrams * 100) / 100;

    return {
      status: 'CALCULATED',
      actionType: 'WASTE_DIVERSION',
      co2AvoidedKg: roundedCo2,
      pm25AvoidedGrams: roundedPm25,
      calculationFormula: formula,
      methodologyVersion: CALCULATION_ENGINE_VERSION,
      emissionFactorUsed: factorDescription,
      factorSource: factor.source,
      assumptions: `${factor.description}. Counterfactual baseline assumes municipal unlined/semi-aerobic landfill disposal with partial methane escape and open burning risk.`,
      uncertaintyDescription: 'Methane generation depends on regional landfill temperature, moisture, and local recycling process efficiency (estimated ±20% uncertainty).',
      uncertaintyMargin: 0.20,
      provenance: 'CALCULATED_ESTIMATE',
    };
  },

  /**
   * Calculates avoided CO2e and thermal power plant particulate emissions from electricity reduction.
   */
  calculateEnergyImpact(input: EnergyCalculationInput): CalculationResult {
    if (!input || typeof input !== 'object') {
      return this.buildInvalidResult('ENERGY_SAVING', 'Missing or malformed input payload.');
    }

    const { energySource, kwhSaved } = input;

    if (typeof kwhSaved !== 'number' || isNaN(kwhSaved) || !isFinite(kwhSaved)) {
      return this.buildInvalidResult('ENERGY_SAVING', 'kWh saved must be a valid, finite number.');
    }

    if (kwhSaved <= 0) {
      return this.buildInvalidResult('ENERGY_SAVING', 'kWh saved must be strictly positive (greater than 0 kWh).');
    }

    if (kwhSaved > 10000) {
      return this.buildInvalidResult('ENERGY_SAVING', 'kWh saved exceeds realistic household monthly boundary (max 10,000 kWh).');
    }

    const factor = ENERGY_GRID_EMISSION_FACTORS[energySource];
    if (!factor) {
      return {
        status: 'UNSUPPORTED_METHOD',
        actionType: 'ENERGY_SAVING',
        co2AvoidedKg: 0,
        pm25AvoidedGrams: 0,
        calculationFormula: 'Unsupported electricity grid factor',
        methodologyVersion: CALCULATION_ENGINE_VERSION,
        emissionFactorUsed: 'NONE',
        factorSource: 'NONE',
        assumptions: 'Invalid electricity grid selected.',
        uncertaintyDescription: 'Cannot calculate impact for unknown electricity grid.',
        uncertaintyMargin: 0,
        provenance: 'CALCULATED_ESTIMATE',
      };
    }

    const co2AvoidedKg = kwhSaved * factor.co2PerKwh;
    const pm25AvoidedGrams = kwhSaved * factor.pm25GramsPerKwh;

    const roundedCo2 = Math.round(co2AvoidedKg * 100) / 100;
    const roundedPm25 = Math.round(pm25AvoidedGrams * 100) / 100;

    const formula = `${kwhSaved} kWh × ${factor.co2PerKwh} kg CO2e/kWh [${energySource}]`;

    return {
      status: 'CALCULATED',
      actionType: 'ENERGY_SAVING',
      co2AvoidedKg: roundedCo2,
      pm25AvoidedGrams: roundedPm25,
      calculationFormula: formula,
      methodologyVersion: CALCULATION_ENGINE_VERSION,
      emissionFactorUsed: `${factor.co2PerKwh} kg CO2e/kWh`,
      factorSource: factor.source,
      assumptions: `${factor.description}. Includes generation combustion and high-voltage transmission & distribution (T&D) losses. Particulate savings model thermal power stack abatement compliance.`,
      uncertaintyDescription: 'Grid dispatch varies hourly between baseload thermal and peaking hydro/solar (estimated ±10% margin across seasonal periods).',
      uncertaintyMargin: 0.10,
      provenance: 'CALCULATED_ESTIMATE',
    };
  },

  buildInvalidResult(actionType: 'COMMUTE_SHIFT' | 'WASTE_DIVERSION' | 'ENERGY_SAVING', reason: string): CalculationResult {
    return {
      status: 'INVALID_INPUT',
      actionType,
      co2AvoidedKg: 0,
      pm25AvoidedGrams: 0,
      calculationFormula: `Calculation rejected: ${reason}`,
      methodologyVersion: CALCULATION_ENGINE_VERSION,
      emissionFactorUsed: 'NONE',
      factorSource: 'NONE',
      assumptions: reason,
      uncertaintyDescription: 'Invalid input parameters prevent mathematical evaluation.',
      uncertaintyMargin: 0,
      provenance: 'CALCULATED_ESTIMATE',
    };
  },

  calculateTransportSavings(input: {
    distanceKm: number;
    baselineMode: string;
    optimizedMode: string;
    customOccupancy?: number;
  }): CalculationResult {
    return this.calculateTransportImpact({
      distanceKm: input.distanceKm,
      baselineMode: input.baselineMode as any,
      optimizedMode: input.optimizedMode as any,
      vehicleOccupancy: input.customOccupancy,
    });
  },

  calculateWasteSavings(input: {
    wasteType: string;
    quantityKg: number;
  }): CalculationResult {
    return this.calculateWasteImpact({
      wasteType: input.wasteType as any,
      quantity: input.quantityKg,
      unit: input.wasteType === 'REUSABLE_BAG_OR_CONTAINER' ? 'UNITS' : 'KG',
    });
  },

  calculateEnergySavings(input: {
    kwhSaved: number;
    gridRegion?: string;
    actionType?: string;
  }): CalculationResult {
    return this.calculateEnergyImpact({
      energySource: (input.gridRegion as any) || 'INDIA_NATIONAL_GRID',
      kwhSaved: input.kwhSaved,
    });
  },

  getMethodologyMetadata() {
    return {
      version: CALCULATION_ENGINE_VERSION,
      standards: [
        'UK DESNZ / DEFRA 2024 Greenhouse Gas Conversion Factors',
        'India Central Electricity Authority (CEA) Baseline Database v19.0',
        'US EPA Waste Reduction Model (WARM v15)',
        'ARAI / CPCB Vehicular Emission Benchmark',
      ],
    };
  },
};
