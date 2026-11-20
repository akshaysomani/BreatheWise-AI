import { communityRepository, CreateCommunityReportInput } from '@/repositories/community.repository';

export const communityService = {
  /**
   * Fuzzes latitude and longitude to 2 decimal places.
   * 
   * PRIVACY AUDIT & LIMITATIONS NOTICE (M2.1):
   * - SPATIAL QUANTIZATION: Rounding to 0.01 degrees maps coordinates to a grid centroid:
   *   - 0.01° Latitude ≈ 1.11 km everywhere on Earth.
   *   - 0.01° Longitude ≈ 1.11 km * cos(latitude). At 28.6° N (Delhi), this is ≈ 0.97 km.
   * - PRIVACY LIMITATION: Grid truncation masks exact street address and rooftop coordinates.
   *   However, it does NOT provide formal differential privacy (ε-DP) or guaranteed k-anonymity
   *   in rural or sparsely populated areas where only a single residence exists within a ~1 km² grid cell.
   * - Citizen reports must NEVER expose private household medical profiles or real names.
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

  async upvoteObservation(reportId: string) {
    return communityRepository.upvote(reportId);
  },
};
