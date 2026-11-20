/**
 * BreatheWise AI — Scientific Environmental Calculation Engine (M6)
 * 
 * METHODOLOGY & PROVENANCE STANDARDS (Version 2024.2.0):
 * 1. Zero-Fabrication Determinism: All calculations use closed-form arithmetic with documented,
 *    primary or authoritative proxy emission factors. No LLM arithmetic or invented percentages.
 * 2. Multi-Category Environmental Accounting:
 *    - Passenger Transport: Mode-shift avoidance based on UK DESNZ / DEFRA 2024 Greenhouse Gas
 *      Conversion Factors (as transparent international proxies) and Indian ARAI / CPCB vehicular
 *      emission benchmarks.
 *    - Waste Diversion: Material-specific avoided landfill methane factors derived from US EPA
 *      Waste Reduction Model (WARM v15) and UK DEFRA 2024. Reusable bag/container quantitative
 *      emissions are safely disabled pending full multi-variable lifecycle analysis (LCA).
 *    - Energy Efficiency: Grid carbon displacement using Central Electricity Authority (CEA) of India,
 *      CO2 Baseline Database for the Power Sector, Version 19.0 (Published Dec 2023, FY 2022-23).
 *      Particulate matter (PM2.5) grid emissions are disabled because CEA does not publish grid PM2.5
 *      factors and thermal stack emissions vary by individual electrostatic precipitator (ESP) efficiency.
 * 3. Transparent Audit Trail: Every calculation returns input values, normalized quantities,
 *    source factor citations, explicit baseline assumptions, and qualitative uncertainty descriptions.
 */

export const CALCULATION_ENGINE_VERSION = '2024.2.0';

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
  status: 'CALCULATED' | 'NON_QUANTIFIED_BEHAVIOR' | 'INSUFFICIENT_DATA' | 'UNSUPPORTED_METHOD' | 'INVALID_INPUT';
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
  provenance: 'CALCULATED_ESTIMATE' | 'BEHAVIORAL_LOG';
}

// ============================================================================
// 1. Authoritative Emission Factors Registry
// ============================================================================

export const TRANSPORT_EMISSION_FACTORS = {
  SOLO_CAR: {
    co2PerKm: 0.171,
    pm25GramsPerKm: 0.015,
    description: 'Average petrol passenger car (single occupant, 1.4-2.0L)',
    source: 'UK DESNZ / DEFRA 2024 Conversion Factors (Road Transport Air Pollutants: Exhaust & Brake/Tyre Wear International Proxy; ±15% Indian urban driving cycle variance)',
  },
  DIESEL_CAR: {
    co2PerKm: 0.165,
    pm25GramsPerKm: 0.025,
    description: 'Average diesel passenger car (single occupant)',
    source: 'UK DESNZ / DEFRA 2024 Conversion Factors (Diesel Car Air Pollutants International Proxy)',
  },
  MOTORCYCLE: {
    co2PerKm: 0.105,
    pm25GramsPerKm: 0.012,
    description: 'Medium 4-stroke two-wheeler ICE (125-250cc)',
    source: 'ARAI / CPCB Vehicular Emission Inventory Benchmark (India Specific)',
  },
  AUTO_RICKSHAW_CNG: {
    co2PerKm: 0.078,
    pm25GramsPerKm: 0.004,
    description: 'Compressed Natural Gas (CNG) 3-wheeler passenger transit',
    source: 'CPCB Urban Transit Factsheet / MoPNG (India Specific)',
  },
  BUS: {
    co2PerKm: 0.089,
    pm25GramsPerKm: 0.006,
    description: 'Average municipal bus per passenger-km at ~45% occupancy',
    source: 'UK DESNZ / DEFRA 2024 Conversion Factors (Local Bus International Proxy)',
  },
  METRO: {
    co2PerKm: 0.035,
    pm25GramsPerKm: 0.001,
    description: 'Urban rapid rail transit / DMRC electric metro per passenger-km',
    source: 'Delhi Metro Rail Corporation (DMRC) Clean Development Mechanism (CDM) Verification / DESNZ 2024',
  },
  CARPOOL: {
    co2PerKm: 0.0855,
    pm25GramsPerKm: 0.0075,
    description: 'Passenger car shared between commuters (occupancy divided)',
    source: 'Standard Transport Accounting: Passenger Car Factor divided by vehicle occupancy',
  },
  ELECTRIC_CAR: {
    co2PerKm: 0.052,
    pm25GramsPerKm: 0.002,
    description: 'Battery Electric Vehicle (BEV) at average grid intensity',
    source: 'DESNZ 2024 Battery Electric Car (Lifecycle operational proxy)',
  },
  BICYCLE: {
    co2PerKm: 0.0,
    pm25GramsPerKm: 0.0,
    description: 'Non-motorized active transit (zero combustion emissions)',
    source: 'Physical Invariant (Zero Tailpipe Combustion)',
  },
  WALK: {
    co2PerKm: 0.0,
    pm25GramsPerKm: 0.0,
    description: 'Non-motorized pedestrian transit (zero combustion emissions)',
    source: 'Physical Invariant (Zero Tailpipe Combustion)',
  },
} as const;

export const WASTE_EMISSION_FACTORS = {
  ORGANIC_COMPOSTING: {
    co2AvoidedPerKg: 0.48,
    pm25GramsAvoidedPerKg: 0.0, // Waste metrics track GHG emissions; PM2.5 disabled to prevent fabrication
    description: 'Aerobic composting avoiding anaerobic municipal landfill methane generation',
    source: 'US EPA Waste Reduction Model (WARM v15) — Food & Yard Waste Composting vs Landfill Baseline',
  },
  PLASTIC_RECYCLING: {
    co2AvoidedPerKg: 1.25,
    pm25GramsAvoidedPerKg: 0.0,
    description: 'Recycling rigid mixed plastics (HDPE/PET) displacing virgin fossil resin synthesis',
    source: 'UK DEFRA 2024 Waste Conversion Factors (Plastics: Commercial & Industrial Closed-Loop Proxy)',
  },
  PAPER_CARDBOARD_RECYCLING: {
    co2AvoidedPerKg: 0.95,
    pm25GramsAvoidedPerKg: 0.0,
    description: 'Recycling corrugated containers & newsprint vs virgin chemical kraft pulping & landfilling',
    source: 'US EPA WARM v15 (Corrugated Containers)',
  },
  ALUMINUM_RECYCLING: {
    co2AvoidedPerKg: 8.14,
    pm25GramsAvoidedPerKg: 0.0,
    description: 'Secondary aluminum remelting saving ~95% electrical energy vs Hall-Héroult bauxite smelting',
    source: 'The International Aluminium Institute (IAI) & US EPA WARM v15',
  },
  GLASS_RECYCLING: {
    co2AvoidedPerKg: 0.28,
    pm25GramsAvoidedPerKg: 0.0,
    description: 'Cullet recycling into container glass displacing limestone/soda ash calcination',
    source: 'European Container Glass Federation (FEVE) / DEFRA 2024 Proxy',
  },
  REUSABLE_BAG_OR_CONTAINER: {
    co2AvoidedPerUnit: 0.0, // Disabled: Full LCA requires material, manufacturing, washing energy, and reuse cycle count
    pm25GramsAvoidedPerUnit: 0.0,
    description: 'Behavioral reuse log (quantitative CO2e disabled pending multi-variable LCA lifecycle methodology)',
    source: 'Methodological Governance (Prompt Section 5.2): Unvalidated single-number lifecycle factor disabled',
  },
} as const;

export const ENERGY_GRID_EMISSION_FACTORS = {
  INDIA_NATIONAL_GRID: {
    co2PerKwh: 0.716,
    pm25GramsPerKwh: 0.0, // Disabled: CEA v19.0 tracks CO2 only. Stack PM2.5 depends on specific ESP efficiency and ash content.
    description: 'Indian National Electricity Grid Combined Margin (Weighted coal, hydro, nuclear, renewable mix)',
    source: 'Central Electricity Authority (CEA) of India, CO2 Baseline Database for the Power Sector, v19.0 (Dec 2023, FY 2022-23)',
  },
  SOLAR_ROOFTOP_DISPLACEMENT: {
    co2PerKwh: 0.716,
    pm25GramsPerKwh: 0.0,
    description: 'Rooftop distributed photovoltaic generation directly displacing marginal Indian grid thermal power',
    source: 'CEA India v19.0 Combined Margin Grid Factor (Displacement accounting)',
  },
  UK_NATIONAL_GRID: {
    co2PerKwh: 0.207,
    pm25GramsPerKwh: 0.0,
    description: 'UK National Grid Electricity generation & transmission composite',
    source: 'UK DESNZ 2024 Greenhouse Gas Reporting Factors (UK Grid)',
  },
  US_AVERAGE_GRID: {
    co2PerKwh: 0.386,
    pm25GramsPerKwh: 0.0,
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

    if (vehicleOccupancy !== undefined && (vehicleOccupancy <= 0 || vehicleOccupancy > 80 || !Number.isFinite(vehicleOccupancy))) {
      return this.buildInvalidResult('COMMUTE_SHIFT', 'Vehicle occupancy must be a positive finite integer between 1 and 80.');
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
    // For carpooling, the vehicle emissions being shared is a passenger car divided by occupancy
    const carpoolOccupancy = vehicleOccupancy && vehicleOccupancy > 1 ? vehicleOccupancy : 2;
    const carpoolVehicleCo2 =
      baselineMode === 'SOLO_CAR' || baselineMode === 'DIESEL_CAR'
        ? baseFactor.co2PerKm
        : TRANSPORT_EMISSION_FACTORS.SOLO_CAR.co2PerKm;
    const carpoolVehiclePm25 =
      baselineMode === 'SOLO_CAR' || baselineMode === 'DIESEL_CAR'
        ? baseFactor.pm25GramsPerKm
        : TRANSPORT_EMISSION_FACTORS.SOLO_CAR.pm25GramsPerKm;

    const effectiveOptCo2 =
      optimizedMode === 'CARPOOL'
        ? carpoolVehicleCo2 / carpoolOccupancy
        : optFactor.co2PerKm;
    const effectiveOptPm25 =
      optimizedMode === 'CARPOOL'
        ? carpoolVehiclePm25 / carpoolOccupancy
        : optFactor.pm25GramsPerKm;

    const co2DifferencePerKm = baseFactor.co2PerKm - effectiveOptCo2;
    const pm25DifferencePerKm = baseFactor.pm25GramsPerKm - effectiveOptPm25;

    const co2AvoidedKg = Math.max(0, distanceKm * co2DifferencePerKm);
    const pm25AvoidedGrams = Math.max(0, distanceKm * pm25DifferencePerKm);

    const roundedCo2 = Math.round(co2AvoidedKg * 100) / 100;
    const roundedPm25 = Math.round(pm25AvoidedGrams * 100) / 100;

    const formula = `${distanceKm} km * (${baseFactor.co2PerKm} kg/km [${baselineMode}] - ${Math.round(effectiveOptCo2 * 1000) / 1000} kg/km [${optimizedMode}${optimizedMode === 'CARPOOL' ? ` occ:${carpoolOccupancy}` : ''}])`;

    return {
      status: 'CALCULATED',
      actionType: 'COMMUTE_SHIFT',
      co2AvoidedKg: roundedCo2,
      pm25AvoidedGrams: roundedPm25,
      calculationFormula: formula,
      methodologyVersion: CALCULATION_ENGINE_VERSION,
      emissionFactorUsed: `Baseline: ${baseFactor.co2PerKm} kg/km | Alternative: ${Math.round(effectiveOptCo2 * 1000) / 1000} kg/km`,
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

    if (wasteType === 'REUSABLE_BAG_OR_CONTAINER') {
      if (unit !== 'UNITS') {
        return this.buildInvalidResult('WASTE_DIVERSION', 'Reusable bags/containers must be measured in UNITS.');
      }
      return {
        status: 'NON_QUANTIFIED_BEHAVIOR',
        actionType: 'WASTE_DIVERSION',
        co2AvoidedKg: 0,
        pm25AvoidedGrams: 0,
        calculationFormula: `${quantity} reuse cycles logged (quantitative avoided emissions disabled pending multi-variable LCA)`,
        methodologyVersion: CALCULATION_ENGINE_VERSION,
        emissionFactorUsed: '0.0 kg CO2e / unit (Qualitative behavior tracking only)',
        factorSource: factor.source,
        assumptions: 'Quantitative emissions disabled per Prompt Section 5.2. Multi-variable factors (material lifecycle, washing energy, and break-even reuse count) require dedicated primary LCA.',
        uncertaintyDescription: 'Not quantified quantitatively; qualitative behavioral milestone.',
        uncertaintyMargin: 0,
        provenance: 'BEHAVIORAL_LOG',
      };
    }

    if (unit !== 'KG') {
      return this.buildInvalidResult('WASTE_DIVERSION', 'Material waste diversion must be measured in KG.');
    }

    const materialFactor = factor as { co2AvoidedPerKg: number; pm25GramsAvoidedPerKg: number; source: string; description: string };
    const co2AvoidedKg = quantity * materialFactor.co2AvoidedPerKg;
    // Waste metrics track GHG emissions; PM2.5 is disabled to prevent fabrication
    const pm25AvoidedGrams = 0;
    const formula = `${quantity} kg × ${materialFactor.co2AvoidedPerKg} kg CO2e/kg diverted`;
    const factorDescription = `${materialFactor.co2AvoidedPerKg} kg CO2e / kg diverted`;

    const roundedCo2 = Math.round(co2AvoidedKg * 100) / 100;

    return {
      status: 'CALCULATED',
      actionType: 'WASTE_DIVERSION',
      co2AvoidedKg: roundedCo2,
      pm25AvoidedGrams: 0,
      calculationFormula: formula,
      methodologyVersion: CALCULATION_ENGINE_VERSION,
      emissionFactorUsed: factorDescription,
      factorSource: factor.source,
      assumptions: `${materialFactor.description}. Counterfactual baseline assumes municipal landfill diversion. Particulate matter (PM2.5) avoided factor is disabled (set to 0 g) because EPA WARM v15 and DEFRA track greenhouse gases only.`,
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
    // Particulate matter (PM2.5) grid emissions disabled per Prompt Section 5.4 audit
    const pm25AvoidedGrams = 0;

    const roundedCo2 = Math.round(co2AvoidedKg * 100) / 100;

    const formula = `${kwhSaved} kWh × ${factor.co2PerKwh} kg CO2e/kWh [${energySource}]`;

    return {
      status: 'CALCULATED',
      actionType: 'ENERGY_SAVING',
      co2AvoidedKg: roundedCo2,
      pm25AvoidedGrams: 0,
      calculationFormula: formula,
      methodologyVersion: CALCULATION_ENGINE_VERSION,
      emissionFactorUsed: `${factor.co2PerKwh} kg CO2e/kWh`,
      factorSource: factor.source,
      assumptions: `${factor.description}. Includes generation combustion and high-voltage transmission & distribution (T&D) losses. Particulate matter (PM2.5) savings are disabled (0 g) because official grid databases (CEA v19.0) track CO2 only; stack PM varies by individual ESP abatement efficiency.`,
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
        'UK DESNZ / DEFRA 2024 Greenhouse Gas Conversion Factors (Passenger Transport International Proxy)',
        'Central Electricity Authority (CEA) of India, CO2 Baseline Database for the Power Sector, v19.0 (FY 2022-23)',
        'US EPA Waste Reduction Model (WARM v15, 2020)',
        'ARAI / CPCB Vehicular Emission Benchmark (BS-IV/VI)',
      ],
    };
  },
};
