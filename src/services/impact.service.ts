import { impactRepository } from '@/repositories/impact.repository';
import {
  CreateImpactLogInput,
  UpdateImpactLogInput,
  ImpactQueryFilter,
} from '@/lib/validations/impact.schema';
import {
  calculationEngine,
  PASSENGER_TRANSPORT_FACTORS,
  WASTE_FACTORS,
  GRID_ELECTRICITY_FACTORS,
} from '@/services/calculation-engine';

export const EMISSION_FACTORS = PASSENGER_TRANSPORT_FACTORS;

export const impactService = {
  async getLogs(userId: string, limit?: number) {
    return impactRepository.getByUserId(userId, limit);
  },

  async getFilteredLogs(userId: string, filter: Partial<ImpactQueryFilter> = {}) {
    return impactRepository.getFiltered(userId, filter);
  },

  async getLogById(id: string, userId: string) {
    return impactRepository.getById(id, userId);
  },

  async recordLog(userId: string, data: CreateImpactLogInput) {
    return impactRepository.create(userId, data);
  },

  async updateLog(id: string, userId: string, data: UpdateImpactLogInput) {
    return impactRepository.update(id, userId, data);
  },

  async deleteLog(id: string, userId: string) {
    return impactRepository.delete(id, userId);
  },

  async getAggregates(userId: string) {
    return impactRepository.getAggregates(userId);
  },

  calculateTransitSavings(
    distanceKm: number,
    baselineMode: string,
    optimizedMode: string,
    customOccupancy?: number
  ) {
    return calculationEngine.calculateTransportSavings({
      distanceKm,
      baselineMode,
      optimizedMode,
      customOccupancy,
    });
  },

  calculateWasteSavings(wasteType: string, quantityKg: number) {
    return calculationEngine.calculateWasteSavings({
      wasteType,
      quantityKg,
    });
  },

  calculateEnergySavings(kwhSaved: number, gridRegion?: string, actionType?: string) {
    return calculationEngine.calculateEnergySavings({
      kwhSaved,
      gridRegion,
      actionType,
    });
  },

  async exportLogsAsCsv(userId: string, options: Partial<ImpactQueryFilter> = {}) {
    const { logs } = await impactRepository.getFiltered(userId, { ...options, limit: 1000, offset: 0 });

    const headers = [
      'Log ID',
      'Date (UTC)',
      'Action Category',
      'Activity Title',
      'CO2e Avoided (kg)',
      'PM2.5 Avoided (g)',
      'Distance Shifted (km)',
      'Calculation Formula',
      'Uncertainty Margin (±%)',
    ];

    const escapeCsvField = (val: any) => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Mitigate CSV Formula Injection (CWE-1236 / OWASP CSV Injection Defense)
      // Check if field starts with formula initiation characters (=, +, -, @, \t, \r, |, %)
      // even if preceded by arbitrary leading whitespace
      if (/^\s*[=+\-@\t\r|%]/.test(str)) {
        str = `'${str}`;
      }
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = logs.map((log) => [
      escapeCsvField(log.id),
      escapeCsvField(new Date(log.date).toISOString().split('T')[0]),
      escapeCsvField(log.actionType),
      escapeCsvField(log.title),
      escapeCsvField(log.co2AvoidedKg),
      escapeCsvField(log.pm25AvoidedGrams),
      escapeCsvField(log.distanceShiftedKm ?? ''),
      escapeCsvField(log.calculationFormula),
      escapeCsvField(`${Math.round(log.uncertaintyMargin * 100)}%`),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  async exportLogsAsJson(userId: string, options: Partial<ImpactQueryFilter> = {}) {
    const { logs, totalCount } = await impactRepository.getFiltered(userId, { ...options, limit: 1000, offset: 0 });
    const aggregates = await impactRepository.getAggregates(userId);

    return {
      version: calculationEngine.getMethodologyMetadata().version,
      methodologyVersion: calculationEngine.getMethodologyMetadata().version,
      exportedAt: new Date().toISOString(),
      standardsCitation:
        'Calculated using UK DESNZ / DEFRA 2024 Passenger Transport Benchmark Factors, US EPA WARM v15, and India CEA Baseline Database v19.0 (±10% to ±15% explicit uncertainty margins). PM2.5 marked NOT_QUANTIFIED to prevent false precision.',
      authoritativeStandards: [
        'UK DESNZ / DEFRA 2024 Greenhouse Gas Conversion Factors',
        'India Central Electricity Authority (CEA) Baseline Database v19.0',
        'US EPA Waste Reduction Model (WARM) v15',
        'ARAI / CPCB Vehicular Emission Benchmarks',
      ],
      totalCount,
      recordCount: totalCount,
      aggregates,
      userAggregates: aggregates,
      logs: logs.map((l) => ({
        id: l.id,
        actionType: l.actionType,
        title: l.title,
        date: l.date.toISOString(),
        co2AvoidedKg: l.co2AvoidedKg,
        pm25AvoidedGrams: l.pm25AvoidedGrams,
        distanceShiftedKm: l.distanceShiftedKm,
        calculationFormula: l.calculationFormula,
        uncertaintyMargin: l.uncertaintyMargin,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  },
};
