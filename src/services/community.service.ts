import { communityRepository } from '@/repositories/community.repository';
import {
  CreateCommunityReportInput,
  CommunityQueryFilter,
  FlagCommunityReportInput,
} from '@/lib/validations/community.schema';

export const communityService = {
  /**
   * Fuzzes latitude and longitude to 2 decimal places (~1.1 km grid resolution).
   * 
   * PRIVACY AUDIT & SPATIAL RESIDUAL NOTICE:
   * - 0.01° Latitude ≈ 1.11 km everywhere.
   * - 0.01° Longitude ≈ 1.11 km * cos(latitude) (≈ 0.97 km at 28.6°N Delhi).
   * - Coordinates are snapped to the centroid of the ~1 km² grid box.
   * - User's private street number, building ID, and household name are never stored or broadcast.
   */
  fuzzCoordinates(latitude: number, longitude: number) {
    return {
      fuzzedLatitude: Math.round(latitude * 100) / 100,
      fuzzedLongitude: Math.round(longitude * 100) / 100,
    };
  },

  async submitReport(userId: string, data: CreateCommunityReportInput) {
    const { fuzzedLatitude, fuzzedLongitude } = this.fuzzCoordinates(data.latitude, data.longitude);

    return communityRepository.create(userId, {
      ...data,
      fuzzedLatitude,
      fuzzedLongitude,
    });
  },

  async getNearbyObservations(latitude: number, longitude: number, limit = 20) {
    const { fuzzedLatitude, fuzzedLongitude } = this.fuzzCoordinates(latitude, longitude);
    return communityRepository.getNearby(fuzzedLatitude, fuzzedLongitude, limit);
  },

  async getFilteredFeed(filter: Partial<CommunityQueryFilter>) {
    let fuzzedLatitude: number | undefined;
    let fuzzedLongitude: number | undefined;

    if (filter.lat !== undefined && filter.lon !== undefined) {
      const fuzzed = this.fuzzCoordinates(filter.lat, filter.lon);
      fuzzedLatitude = fuzzed.fuzzedLatitude;
      fuzzedLongitude = fuzzed.fuzzedLongitude;
    }

    return communityRepository.getFiltered({
      fuzzedLatitude,
      fuzzedLongitude,
      reportType: filter.reportType,
      severity: filter.severity,
      radiusKm: filter.radiusKm,
      limit: filter.limit,
      offset: filter.offset,
      status: 'ACTIVE',
    });
  },

  async upvoteObservation(reportId: string) {
    const existing = await communityRepository.getById(reportId);
    if (!existing) {
      throw new Error('Report not found');
    }
    return communityRepository.upvote(reportId);
  },

  async flagObservation(reportId: string, input: FlagCommunityReportInput) {
    const existing = await communityRepository.getById(reportId);
    if (!existing) {
      throw new Error('Report not found');
    }
    return communityRepository.flag(reportId, input.reason, input.details);
  },

  async deleteObservation(reportId: string, userId: string) {
    return communityRepository.delete(reportId, userId);
  },
};
