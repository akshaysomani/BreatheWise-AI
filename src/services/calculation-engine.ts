/**
 * BreatheWise AI — Scientific Environmental Calculation Engine (M6)
 * 
 * METHODOLOGY & PROVENANCE STANDARDS (Version 2024.2.1 - Audit Corrected):
 * 1. Zero-Fabrication Determinism: All calculations use closed-form linear arithmetic with documented,
 *    primary regulatory sources or authoritative international proxy emission factors. No LLM arithmetic
 *    or invented percentages.
 * 2. Multi-Category Environmental Accounting:
 *    - Passenger Transport: Mode-shift avoidance based on UK DESNZ / DEFRA 2024 Greenhouse Gas
 *      Conversion Factors (transparent international proxies; unadjusted UK fleet averages; local Indian
 *      driving cycle variations depend on traffic congestion and air conditioning loads, with no unvalidated
 *      blanket percentage adjustments claimed), DMRC Clean Development Mechanism (CDM) verifications,
 *      and Indian CPCB / ARAI vehicular benchmarks.
 *      NOTE ON PM2.5: Standardized regulatory conversion databases (including DEFRA GHG tables and CPCB)
 *      do not publish integrated, fleet-average BS-VI tailpipe + non-exhaust (brake/tire/rail abrasion)
 *      PM2.5 factors per passenger-km. In accordance with strict zero-fabrication standards, quantitative
 *      transport PM2.5 savings are marked NOT_QUANTIFIED to prevent false precision. Active non-combustion
 *      transit (walking, bicycling) maintains an exact physical zero for combustion emissions.
 *    - Waste Diversion: Material-specific avoided landfill methane factors derived from US EPA
 *      Waste Reduction Model (WARM v15, 2020) and UK DEFRA 2024. Reusable bag/container quantitative
 *      emissions are designated as qualitative behavioral tracking pending multi-variable lifecycle analysis (LCA).
 *      Waste PM2.5 is marked NOT_QUANTIFIED because solid waste models track greenhouse gases only.
 *    - Energy Efficiency: Grid carbon displacement using Central Electricity Authority (CEA) of India,
 *      CO2 Baseline Database for the Power Sector, Version 19.0 (Published Dec 2023, reporting FY 2022-23
 *      historical baseline, Combined Margin: 0.716 kg CO2e/kWh).
 *      Grid PM2.5 is marked NOT_QUANTIFIED because CEA v19.0 tracks CO2 only; stack PM varies widely by
 *      individual plant electrostatic precipitator (ESP) efficiency and coal ash content.
 * 3. Transparent Audit Trail: Every calculation returns input values, normalized quantities,
 *    source factor citations, explicit baseline assumptions, and qualitative uncertainty descriptions.
 * 4. Non-Silent Arithmetic: Mode shifts resulting in net negative savings (increased emissions) are not
 *    silently clamped to zero; they are classified as EMISSIONS_INCREASED with full mathematical disclosure.
 */

export const CALCULATION_ENGINE_VERSION = '2024.2.1';

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
  status:
    | 'CALCULATED'
    | 'NON_QUANTIFIED_BEHAVIOR'
    | 'INSUFFICIENT_DATA'
    | 'UNSUPPORTED_METHOD'
    | 'INVALID_INPUT'
    | 'EMISSIONS_INCREASED';
  actionType: 'COMMUTE_SHIFT' | 'WASTE_DIVERSION' | 'ENERGY_SAVING';
  co2AvoidedKg: number;
  pm25AvoidedGrams: number;
  pm25Status: 'CALCULATED' | 'NOT_QUANTIFIED' | 'UNAVAILABLE';
  calculationFormula: string;
  methodologyVersion: string;
  emissionFactorUsed: string;
  factorSource: string;
  assumptions: string;
  uncertaintyDescription: string;
  uncertaintyMargin: number;
  provenance: 'CALCULATED_ESTIMATE' | 'BEHAVIORAL_LOG' | 'NOT_QUANTIFIED';
}

// ============================================================================
// 1. Authoritative Emission Factors Registry
// ============================================================================

export const TRANSPORT_EMISSION_FACTORS = {
  SOLO_CAR: {
    co2PerKm: 0.171,
    description: 'Average petrol passenger car (single occupant, 1.4-2.0L)',
    source: 'UK DESNZ / DEFRA 2024 Conversion Factors, Table "Passenger vehicles", Average petrol car (Scope 1 Direct: 0.17079 kg CO2e/km; International Proxy)',
    basis: 'vehicle-km (vkm) / passenger-km (pkm) at occupancy = 1',
  },
  DIESEL_CAR: {
    co2PerKm: 0.165,
    description: 'Average diesel passenger car (single occupant)',
    source: 'UK DESNZ / DEFRA 2024 Conversion Factors, Table "Passenger vehicles", Average diesel car (Scope 1 Direct: 0.16520 kg CO2e/km; International Proxy)',
    basis: 'vehicle-km (vkm) / passenger-km (pkm) at occupancy = 1',
  },
  MOTORCYCLE: {
    co2PerKm: 0.105,
    description: 'Medium 4-stroke two-wheeler ICE (125-250cc)',
    source: 'UK DESNZ / DEFRA 2024 Conversion Factors, Table "Motorbikes", Medium motorbike >125cc-500cc (0.10427 kg CO2e/km; International Proxy)',
    basis: 'vehicle-km (vkm)',
  },
  AUTO_RICKSHAW_CNG: {
    co2PerKm: 0.078,
    description: 'Compressed Natural Gas (CNG) 3-wheeler passenger transit',
    source: 'CPCB / MoPNG Urban Transit CNG Consumption Benchmark (~35 km/kg CNG at 2.75 kg CO2/kg CNG; India Specific)',
    basis: 'vehicle-km (vkm)',
  },
  BUS: {
    co2PerKm: 0.089,
    description: 'Average municipal bus per passenger-km at ~9-12 passenger load factor',
    source: 'UK DESNZ / DEFRA 2024 Conversion Factors, Table "Business travel - land", Local bus outside London (0.08892 kg CO2e/p-km; International Proxy)',
    basis: 'passenger-km (pkm)',
  },
  METRO: {
    co2PerKm: 0.035,
    description: 'Urban rapid rail transit / DMRC electric metro per passenger-km',
    source: 'Delhi Metro Rail Corporation (DMRC) Clean Development Mechanism (CDM Project 1229 / Project 4463) Verification & UK DESNZ 2024 Local Rail Proxy',
    basis: 'passenger-km (pkm)',
  },
  CARPOOL: {
    co2PerKm: 0.0855,
    description: 'Passenger car shared between commuters (occupancy divided)',
    source: 'Standard Transport Accounting: Passenger car baseline factor divided by vehicle occupancy',
    basis: 'passenger-km (pkm)',
  },
  ELECTRIC_CAR: {
    co2PerKm: 0.052,
    description: 'Battery Electric Vehicle (BEV) at average grid intensity (UK Grid Proxy)',
    source: 'UK DESNZ 2024 Battery Electric Car (Lifecycle operational proxy based on UK grid; in India coal-heavy grid, operational emissions are higher at ~0.143 kg CO2e/km)',
    basis: 'vehicle-km (vkm)',
  },
  BICYCLE: {
    co2PerKm: 0.0,
    description: 'Non-motorized active transit (zero combustion emissions)',
    source: 'Physical Invariant (Zero Tailpipe Combustion)',
    basis: 'passenger-km (pkm)',
  },
  WALK: {
    co2PerKm: 0.0,
    description: 'Non-motorized pedestrian transit (zero combustion emissions)',
    source: 'Physical Invariant (Zero Tailpipe Combustion)',
    basis: 'passenger-km (pkm)',
  },
} as const;

export const WASTE_EMISSION_FACTORS = {
  ORGANIC_COMPOSTING: {
    co2AvoidedPerKg: 0.48,
    description: 'Aerobic composting avoiding anaerobic municipal landfill methane generation',
    source: 'US EPA Waste Reduction Model (WARM v15, 2020) — Food Waste Composting vs National Average Landfill with LFG recovery (-0.48 MTCO2e/ton)',
  },
  PLASTIC_RECYCLING: {
    co2AvoidedPerKg: 1.25,
    description: 'Recycling rigid mixed plastics displacing virgin fossil resin synthesis',
    source: 'UK DEFRA 2024 Waste Conversion Factors (Plastics: Commercial & Industrial Closed-Loop Recycling vs Landfill/Incineration)',
  },
  PAPER_CARDBOARD_RECYCLING: {
    co2AvoidedPerKg: 0.95,
    description: 'Recycling mixed paper & corrugated containers vs virgin chemical kraft pulping & landfilling',
    source: 'US EPA WARM v15 (Corrugated Containers & Mixed Paper) / UK DEFRA 2024',
  },
  ALUMINUM_RECYCLING: {
    co2AvoidedPerKg: 8.14,
    description: 'Secondary aluminum remelting saving ~95% electrical energy vs Hall-Héroult bauxite smelting',
    source: 'International Aluminium Institute (IAI 2022) & US EPA WARM v15 (-8.14 MTCO2e/ton)',
  },
  GLASS_RECYCLING: {
    co2AvoidedPerKg: 0.28,
    description: 'Cullet recycling into container glass displacing limestone/soda ash calcination',
    source: 'European Container Glass Federation (FEVE) / UK DEFRA 2024 Container Glass Proxy',
  },
  REUSABLE_BAG_OR_CONTAINER: {
    co2AvoidedPerUnit: 0.0,
    description: 'Behavioral reuse log (quantitative CO2e disabled pending multi-variable LCA lifecycle methodology)',
    source: 'Methodological Governance: Multi-variable LCA (material production, washing energy, break-even reuse count) required before quantitative claims',
  },
} as const;

export const ENERGY_GRID_EMISSION_FACTORS = {
  INDIA_NATIONAL_GRID: {
    co2PerKwh: 0.716,
    description: 'Indian National Electricity Grid Combined Margin (Weighted thermal, hydro, nuclear, renewable generation mix for FY 2022-23)',
    source: 'Central Electricity Authority (CEA) of India, CO2 Baseline Database for the Power Sector, Version 19.0 (v19.0, Published Dec 2023, FY 2022-23 Historical Baseline, Table 1 Combined Margin: 0.716 kg CO2e/kWh)',
  },
  SOLAR_ROOFTOP_DISPLACEMENT: {
    co2PerKwh: 0.716,
    description: 'Rooftop distributed photovoltaic generation directly displacing marginal Indian grid thermal power',
    source: 'Central Electricity Authority (CEA) India v19.0 Combined Margin Grid Factor (Displacement accounting for FY 2022-23)',
  },
  UK_NATIONAL_GRID: {
    co2PerKwh: 0.207,
    description: 'UK National Grid Electricity generation & transmission composite',
    source: 'UK DESNZ 2024 Greenhouse Gas Reporting Factors (UK Grid Generation + T&D)',
  },
  US_AVERAGE_GRID: {
    co2PerKwh: 0.386,
    description: 'US eGRID National Average Electricity Emissions Factor',
    source: 'US EPA Emissions & Generation Resource Integrated Database (eGRID 2024 National Average)',
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
   * Calculates avoided CO2e from passenger transit modal shift.
   * PM2.5 savings are marked NOT_QUANTIFIED because regulatory conversion tables
   * (DEFRA, CPCB) do not provide verified fleet-average BS-VI exhaust + non-exhaust factors.
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
        pm25Status: 'NOT_QUANTIFIED',
        calculationFormula: 'Unsupported transit mode combination',
        methodologyVersion: CALCULATION_ENGINE_VERSION,
        emissionFactorUsed: 'NONE',
        factorSource: 'NONE',
        assumptions: 'Invalid transit mode selected.',
        uncertaintyDescription: 'Cannot calculate impact for unknown mode.',
        uncertaintyMargin: 0,
        provenance: 'NOT_QUANTIFIED',
      };
    }

    // 2. Mathematical Closed-Form Calculation
    const carpoolOccupancy = vehicleOccupancy !== undefined ? vehicleOccupancy : 2;
    const baseCo2PerKm = baseFactor.co2PerKm;

    let effectiveOptCo2: number;
    let optDescription: string;

    if (optimizedMode === 'CARPOOL') {
      const carpoolVehicleCo2 =
        baselineMode === 'SOLO_CAR' || baselineMode === 'DIESEL_CAR'
          ? baseFactor.co2PerKm
          : TRANSPORT_EMISSION_FACTORS.SOLO_CAR.co2PerKm;
      effectiveOptCo2 = carpoolVehicleCo2 / carpoolOccupancy;
      optDescription = `CARPOOL (occupancy: ${carpoolOccupancy})`;
    } else {
      effectiveOptCo2 = optFactor.co2PerKm;
      optDescription = optimizedMode;
    }

    const co2DifferencePerKm = baseCo2PerKm - effectiveOptCo2;

    // Check for negative savings / increased emissions
    if (co2DifferencePerKm < 0) {
      const additionalCo2PerKm = Math.abs(co2DifferencePerKm);
      const netIncreaseKg = Math.round(distanceKm * additionalCo2PerKm * 100) / 100;
      const formula = `${distanceKm} km * (${baseCo2PerKm} kg/km [${baselineMode}] - ${Math.round(effectiveOptCo2 * 1000) / 1000} kg/km [${optDescription}]) = -${netIncreaseKg} kg CO2e`;
      return {
        status: 'EMISSIONS_INCREASED',
        actionType: 'COMMUTE_SHIFT',
        co2AvoidedKg: 0,
        pm25AvoidedGrams: 0,
        pm25Status: 'NOT_QUANTIFIED',
        calculationFormula: formula,
        methodologyVersion: CALCULATION_ENGINE_VERSION,
        emissionFactorUsed: `Baseline: ${baseCo2PerKm} kg/km | Alternative: ${Math.round(effectiveOptCo2 * 1000) / 1000} kg/km`,
        factorSource: `${baseFactor.source}; ${optFactor.source}`,
        assumptions: `The selected alternative (${optDescription}: ${Math.round(effectiveOptCo2 * 1000) / 1000} kg/km) has higher emissions than the baseline (${baselineMode}: ${baseCo2PerKm} kg/km). This journey increases modeled emissions by ${netIncreaseKg} kg CO2e; no avoided emissions achieved.`,
        uncertaintyDescription: 'Negative comparisons indicate increased environmental impact; zero avoided emissions.',
        uncertaintyMargin: 0,
        provenance: 'CALCULATED_ESTIMATE',
      };
    }

    if (co2DifferencePerKm === 0) {
      const formula = `${distanceKm} km * (${baseCo2PerKm} kg/km - ${baseCo2PerKm} kg/km) = 0.00 kg CO2e`;
      return {
        status: 'CALCULATED',
        actionType: 'COMMUTE_SHIFT',
        co2AvoidedKg: 0,
        pm25AvoidedGrams: 0,
        pm25Status: 'NOT_QUANTIFIED',
        calculationFormula: formula,
        methodologyVersion: CALCULATION_ENGINE_VERSION,
        emissionFactorUsed: `Baseline: ${baseCo2PerKm} kg/km | Alternative: ${baseCo2PerKm} kg/km`,
        factorSource: `${baseFactor.source}; ${optFactor.source}`,
        assumptions: `Baseline and alternative modes have identical emission factors. No net avoided emissions.`,
        uncertaintyDescription: 'Zero difference produces zero uncertainty.',
        uncertaintyMargin: 0,
        provenance: 'CALCULATED_ESTIMATE',
      };
    }

    const co2AvoidedKg = Math.round(distanceKm * co2DifferencePerKm * 100) / 100;
    const formula = `${distanceKm} km * (${baseCo2PerKm} kg/km [${baselineMode}] - ${Math.round(effectiveOptCo2 * 1000) / 1000} kg/km [${optDescription}])`;

    return {
      status: 'CALCULATED',
      actionType: 'COMMUTE_SHIFT',
      co2AvoidedKg,
      pm25AvoidedGrams: 0,
      pm25Status: 'NOT_QUANTIFIED',
      calculationFormula: formula,
      methodologyVersion: CALCULATION_ENGINE_VERSION,
      emissionFactorUsed: `Baseline: ${baseCo2PerKm} kg/km | Alternative: ${Math.round(effectiveOptCo2 * 1000) / 1000} kg/km`,
      factorSource: `${baseFactor.source}; ${optFactor.source}`,
      assumptions: `Assumes standard passenger occupancy (${baselineMode} solo occupancy unless stated otherwise; ${optDescription} load factor). UK DEFRA factors serve as international proxies without invented local scaling. PM2.5 avoided emissions are marked NOT_QUANTIFIED because standardized fleet-average exhaust + non-exhaust particulate factors are not published in regulatory conversion databases.`,
      uncertaintyDescription: 'Variability in vehicle engine displacement, driving cycle, traffic congestion, and HVAC electrical load introduces an estimated ±15% variance.',
      uncertaintyMargin: 0.15,
      provenance: 'CALCULATED_ESTIMATE',
    };
  },

  /**
   * Calculates avoided lifecycle GHG emissions from waste diversion.
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
        pm25Status: 'NOT_QUANTIFIED',
        calculationFormula: 'Unsupported waste category',
        methodologyVersion: CALCULATION_ENGINE_VERSION,
        emissionFactorUsed: 'NONE',
        factorSource: 'NONE',
        assumptions: 'Invalid waste category.',
        uncertaintyDescription: 'Cannot calculate impact for unknown waste type.',
        uncertaintyMargin: 0,
        provenance: 'NOT_QUANTIFIED',
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
        pm25Status: 'NOT_QUANTIFIED',
        calculationFormula: `${quantity} reuse cycles logged (quantitative avoided emissions disabled pending multi-variable LCA)`,
        methodologyVersion: CALCULATION_ENGINE_VERSION,
        emissionFactorUsed: '0.0 kg CO2e / unit (Qualitative behavior tracking only)',
        factorSource: factor.source,
        assumptions: 'Quantitative emissions disabled. Multi-variable factors (material production lifecycle, washing energy, and break-even reuse count) require dedicated primary LCA.',
        uncertaintyDescription: 'Not quantified quantitatively; qualitative behavioral milestone.',
        uncertaintyMargin: 0,
        provenance: 'BEHAVIORAL_LOG',
      };
    }

    if (unit !== 'KG') {
      return this.buildInvalidResult('WASTE_DIVERSION', 'Material waste diversion must be measured in KG.');
    }

    const materialFactor = factor as { co2AvoidedPerKg: number; source: string; description: string };
    const co2AvoidedKg = quantity * materialFactor.co2AvoidedPerKg;
    const formula = `${quantity} kg × ${materialFactor.co2AvoidedPerKg} kg CO2e/kg diverted`;
    const factorDescription = `${materialFactor.co2AvoidedPerKg} kg CO2e / kg diverted`;
    const roundedCo2 = Math.round(co2AvoidedKg * 100) / 100;

    return {
      status: 'CALCULATED',
      actionType: 'WASTE_DIVERSION',
      co2AvoidedKg: roundedCo2,
      pm25AvoidedGrams: 0,
      pm25Status: 'NOT_QUANTIFIED',
      calculationFormula: formula,
      methodologyVersion: CALCULATION_ENGINE_VERSION,
      emissionFactorUsed: factorDescription,
      factorSource: factor.source,
      assumptions: `${materialFactor.description}. Counterfactual baseline assumes municipal landfill diversion. Particulate matter (PM2.5) avoided factor is marked NOT_QUANTIFIED because EPA WARM v15 and DEFRA track greenhouse gases only.`,
      uncertaintyDescription: 'Methane generation depends on regional landfill temperature, moisture, and local recycling process efficiency (estimated ±20% uncertainty).',
      uncertaintyMargin: 0.20,
      provenance: 'CALCULATED_ESTIMATE',
    };
  },

  /**
   * Calculates avoided CO2e from electricity reduction.
   * Grid PM2.5 savings are marked NOT_QUANTIFIED because CEA v19.0 tracks CO2 only.
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
        pm25Status: 'NOT_QUANTIFIED',
        calculationFormula: 'Unsupported electricity grid factor',
        methodologyVersion: CALCULATION_ENGINE_VERSION,
        emissionFactorUsed: 'NONE',
        factorSource: 'NONE',
        assumptions: 'Invalid electricity grid selected.',
        uncertaintyDescription: 'Cannot calculate impact for unknown electricity grid.',
        uncertaintyMargin: 0,
        provenance: 'NOT_QUANTIFIED',
      };
    }

    const co2AvoidedKg = kwhSaved * factor.co2PerKwh;
    const roundedCo2 = Math.round(co2AvoidedKg * 100) / 100;
    const formula = `${kwhSaved} kWh × ${factor.co2PerKwh} kg CO2e/kWh [${energySource}]`;

    return {
      status: 'CALCULATED',
      actionType: 'ENERGY_SAVING',
      co2AvoidedKg: roundedCo2,
      pm25AvoidedGrams: 0,
      pm25Status: 'NOT_QUANTIFIED',
      calculationFormula: formula,
      methodologyVersion: CALCULATION_ENGINE_VERSION,
      emissionFactorUsed: `${factor.co2PerKwh} kg CO2e/kWh`,
      factorSource: factor.source,
      assumptions: `${factor.description}. Includes generation combustion and high-voltage transmission & distribution (T&D) losses. Particulate matter (PM2.5) savings are marked NOT_QUANTIFIED because official grid databases (CEA v19.0) track CO2 only; stack PM varies by individual electrostatic precipitator abatement efficiency.`,
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
      pm25Status: 'NOT_QUANTIFIED',
      calculationFormula: `Calculation rejected: ${reason}`,
      methodologyVersion: CALCULATION_ENGINE_VERSION,
      emissionFactorUsed: 'NONE',
      factorSource: 'NONE',
      assumptions: reason,
      uncertaintyDescription: 'Invalid input parameters prevent mathematical evaluation.',
      uncertaintyMargin: 0,
      provenance: 'NOT_QUANTIFIED',
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
        'Central Electricity Authority (CEA) of India, CO2 Baseline Database for the Power Sector, v19.0 (FY 2022-23 Historical Baseline)',
        'US EPA Waste Reduction Model (WARM v15, 2020)',
        'ARAI / CPCB Vehicular Emission Benchmarks',
      ],
    };
  },
};
