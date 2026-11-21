import { communityRepository } from '@/repositories/community.repository';
import {
  CreateCommunityReportInput,
  CommunityQueryFilter,
  FlagCommunityReportInput,
} from '@/lib/validations/community.schema';

export interface PublicCommunityReport {
  id: string;
  reportType: string;
  severity: string;
  description: string;
  fuzzedLatitude: number;
  fuzzedLongitude: number;
  neighborhood: string;
  isOfficialData: false;
  upvotes: number;
  status: string;
  approximateTime: string; // ISO string truncated to the start of the hour
  timePrecision: 'HOURLY_COARSED';
  createdAt: string; // Hourly coarsened timestamp for backward compatibility
}

export const communityService = {
  /**
   * Fuzzes latitude and longitude to 2 decimal places (~1.1 km grid resolution).
   * 
   * PRIVACY AUDIT & SPATIAL RESIDUAL NOTICE (M6 / M7 / M8.2):
   * - 0.01° Latitude ≈ 1.11 km everywhere.
   * - 0.01° Longitude ≈ 1.11 km * cos(latitude) (≈ 0.97 km at 28.6°N Delhi).
   * - Coordinates are snapped to the centroid of the ~1 km² grid cell.
   * - User's private street address, building ID, and household name are never stored or broadcast.
   */
  fuzzCoordinates(latitude: number, longitude: number) {
    return {
      fuzzedLatitude: Math.round(latitude * 100) / 100,
      fuzzedLongitude: Math.round(longitude * 100) / 100,
    };
  },

  /**
   * Coarsens a timestamp to the nearest hour boundary to neutralize diurnal routine tracking.
   * Internal database preserves precise timestamp for audit and anti-abuse moderation only.
   */
  coarsenTimestampToHour(dateInput: Date | string | number): string {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const ms = d.getTime();
    if (isNaN(ms)) {
      return new Date().toISOString();
    }
    const coarsenedMs = Math.floor(ms / 3_600_000) * 3_600_000;
    return new Date(coarsenedMs).toISOString();
  },

  /**
   * Single authoritative public serialization boundary (M8.2).
   * Strictly scrubs internal userId, email, moderation logs, risk scores,
   * and replaces precise timestamps with hourly coarsened time representations.
   */
  serializePublicReport(report: any): PublicCommunityReport {
    const coarsenedTime = this.coarsenTimestampToHour(report.createdAt);

    return {
      id: report.id,
      reportType: report.reportType,
      severity: report.severity,
      description: report.description,
      fuzzedLatitude: report.fuzzedLatitude,
      fuzzedLongitude: report.fuzzedLongitude,
      neighborhood: report.neighborhood,
      isOfficialData: false, // Architectural invariant: ALWAYS FALSE
      upvotes: report.upvotes ?? 0,
      status: report.status || 'ACTIVE',
      approximateTime: coarsenedTime,
      timePrecision: 'HOURLY_COARSED',
      createdAt: coarsenedTime,
    };
  },

  async submitReport(userId: string, data: CreateCommunityReportInput) {
    const { fuzzedLatitude, fuzzedLongitude } = this.fuzzCoordinates(data.latitude, data.longitude);

    const created = await communityRepository.create(userId, {
      ...data,
      fuzzedLatitude,
      fuzzedLongitude,
    });

    return this.serializePublicReport(created);
  },

  async getNearbyObservations(latitude: number, longitude: number, limit = 20): Promise<PublicCommunityReport[]> {
    const { fuzzedLatitude, fuzzedLongitude } = this.fuzzCoordinates(latitude, longitude);
    const rawReports = await communityRepository.getNearby(fuzzedLatitude, fuzzedLongitude, limit);
    return rawReports.map((r) => this.serializePublicReport(r));
  },

  async getFilteredFeed(filter: Partial<CommunityQueryFilter>): Promise<{ reports: PublicCommunityReport[]; totalCount: number }> {
    let fuzzedLatitude: number | undefined;
    let fuzzedLongitude: number | undefined;

    if (filter.lat !== undefined && filter.lon !== undefined) {
      const fuzzed = this.fuzzCoordinates(filter.lat, filter.lon);
      fuzzedLatitude = fuzzed.fuzzedLatitude;
      fuzzedLongitude = fuzzed.fuzzedLongitude;
    }

    const { reports, totalCount } = await communityRepository.getFiltered({
      fuzzedLatitude,
      fuzzedLongitude,
      reportType: filter.reportType,
      severity: filter.severity,
      radiusKm: filter.radiusKm,
      limit: filter.limit,
      offset: filter.offset,
      status: 'ACTIVE',
    });

    return {
      reports: reports.map((r) => this.serializePublicReport(r)),
      totalCount,
    };
  },

  async upvoteObservation(reportId: string, userId?: string) {
    const existing = await communityRepository.getById(reportId);
    if (!existing) {
      throw new Error('Report not found');
    }
    if (existing.status !== 'ACTIVE') {
      throw new Error('Cannot upvote quarantined or non-active observation');
    }
    const updated = await communityRepository.upvote(reportId, userId);
    return this.serializePublicReport(updated);
  },

  async flagObservation(reportId: string, input: FlagCommunityReportInput) {
    const existing = await communityRepository.getById(reportId);
    if (!existing) {
      throw new Error('Report not found');
    }
    const updated = await communityRepository.flag(reportId, input.reason, input.details);
    return this.serializePublicReport(updated);
  },

  async deleteObservation(reportId: string, userId: string) {
    return communityRepository.delete(reportId, userId);
  },

  /**
   * RFC 4180 CSV Export with strict privacy sanitization and formula injection defense (M8.2).
   */
  async exportObservationsAsCsv(filter: Partial<CommunityQueryFilter> = {}): Promise<string> {
    const { reports } = await this.getFilteredFeed({ ...filter, limit: 1000, offset: 0 });

    const headers = [
      'Observation ID',
      'Approximate Time Window (Hourly Coarsened)',
      'Report Type',
      'Severity',
      'Neighborhood Centroid (~1.1km)',
      'Fuzzed Latitude',
      'Fuzzed Longitude',
      'Observation Description',
      'Community Upvotes',
      'Regulatory Data Segregation',
    ];

    const escapeCsvField = (val: any) => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Mitigate CSV Formula Injection (CWE-1236 / OWASP CSV Injection Defense)
      if (/^\s*[=+\-@\t\r|%]/.test(str)) {
        str = `'${str}`;
      }
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = reports.map((r) => [
      escapeCsvField(r.id),
      escapeCsvField(r.approximateTime),
      escapeCsvField(r.reportType),
      escapeCsvField(r.severity),
      escapeCsvField(r.neighborhood),
      escapeCsvField(r.fuzzedLatitude),
      escapeCsvField(r.fuzzedLongitude),
      escapeCsvField(r.description),
      escapeCsvField(r.upvotes),
      escapeCsvField('Unofficial Citizen Data (isOfficialData: false)'),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  },

  /**
   * Structured JSON Export with privacy provenance and spatial bounds metadata (M8.2).
   */
  async exportObservationsAsJson(filter: Partial<CommunityQueryFilter> = {}) {
    const { reports, totalCount } = await this.getFilteredFeed({ ...filter, limit: 1000, offset: 0 });

    return {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        totalRecords: totalCount,
        privacyStandard: 'Spatial Quantization (~1.1 km) & Hourly Timestamp Coarsening (M8.2)',
        regulatoryInvariant: 'All citizen reports are strictly segregated from official CPCB data (isOfficialData: false)',
      },
      reports,
    };
  },
};
