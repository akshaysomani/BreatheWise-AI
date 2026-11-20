import { communityRepository, CreateCommunityReportInput } from '@/repositories/community.repository';

export const communityService = {
  /**
   * Fuzzes latitude and longitude to 2 decimal places (~1.1 km precision)
   * to protect the reporting household's exact home address from public exposure.
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
