import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '@/lib/db';
import { communityService } from '@/services/community.service';
import { communityRepository } from '@/repositories/community.repository';
import { checkRateLimit } from '@/lib/rate-limiter';

describe('BreatheWise AI — Community Environmental Intelligence (M6)', () => {
  const testCitizenA = 'test-citizen-a-' + Date.now();
  const testCitizenB = 'test-citizen-b-' + Date.now();

  beforeEach(async () => {
    await prisma.user.upsert({
      where: { id: testCitizenA },
      update: {},
      create: {
        id: testCitizenA,
        email: `citizen-a-${Date.now()}@breathewise.test`,
        passwordHash: 'argon2id_mock_hash',
      },
    });

    await prisma.user.upsert({
      where: { id: testCitizenB },
      update: {},
      create: {
        id: testCitizenB,
        email: `citizen-b-${Date.now()}@breathewise.test`,
        passwordHash: 'argon2id_mock_hash',
      },
    });
  });

  describe('1. Privacy Preservation & Coordinate Fuzzing', () => {
    it('quantizes exact coordinates to 2 decimal places (~1.1 km precision)', () => {
      // Delhi coordinates: 28.613939, 77.209021
      const fuzzed = communityService.fuzzCoordinates(28.613939, 77.209021);
      expect(fuzzed.fuzzedLatitude).toBe(28.61);
      expect(fuzzed.fuzzedLongitude).toBe(77.21);
    });

    it('ensures street-level and rooftop sub-meter coordinates are truncated', () => {
      const houseA = communityService.fuzzCoordinates(28.535512, 77.391024);
      const houseB = communityService.fuzzCoordinates(28.535899, 77.391482);
      // Both residences in same ~1.1km grid cell produce identical quantized centroid
      expect(houseA.fuzzedLatitude).toBe(houseB.fuzzedLatitude);
      expect(houseA.fuzzedLongitude).toBe(houseB.fuzzedLongitude);
    });
  });

  describe('2. Citizen Report Submission & Invariant Enforcement', () => {
    it('submits a report and enforces isOfficialData: false as a hard invariant', async () => {
      const report = await communityService.submitReport(testCitizenA, {
        reportType: 'VISIBLE_SMOG',
        severity: 'SEVERE',
        description: 'Heavy winter inversion layer visible over Anand Vihar ISBT.',
        latitude: 28.6502,
        longitude: 77.3151,
        neighborhood: 'Anand Vihar',
      });

      expect(report.id).toBeDefined();
      expect(report.reportType).toBe('VISIBLE_SMOG');
      expect(report.severity).toBe('SEVERE');
      expect(report.neighborhood).toBe('Anand Vihar');
      // HARD ARCHITECTURAL INVARIANT: isOfficialData must ALWAYS be false
      expect(report.isOfficialData).toBe(false);
      expect(report.fuzzedLatitude).toBe(28.65);
      expect(report.fuzzedLongitude).toBe(77.32);
      expect(report.upvotes).toBe(0);
      expect(report.status).toBe('ACTIVE');
    });

    it('submits reports across diverse community categories', async () => {
      const burningReport = await communityService.submitReport(testCitizenA, {
        reportType: 'OPEN_BURNING',
        severity: 'MODERATE',
        description: 'Leaf and municipal waste burning in open vacant plot.',
        latitude: 28.5801,
        longitude: 77.3102,
        neighborhood: 'Noida Sector 15',
      });
      expect(burningReport.reportType).toBe('OPEN_BURNING');
      expect(burningReport.isOfficialData).toBe(false);

      const greenSpaceReport = await communityService.submitReport(testCitizenB, {
        reportType: 'GREEN_SPACE_IMPROVEMENT',
        severity: 'MILD',
        description: 'Nehru Park tree canopy provides noticeable dust shielding.',
        latitude: 28.5912,
        longitude: 77.1954,
        neighborhood: 'Chanakyapuri',
      });
      expect(greenSpaceReport.reportType).toBe('GREEN_SPACE_IMPROVEMENT');
      expect(greenSpaceReport.isOfficialData).toBe(false);
    });
  });

  describe('3. Feed Filtering & Spatial Proximity', () => {
    it('filters community reports by category', async () => {
      const feed = await communityService.getFilteredFeed({
        reportType: 'OPEN_BURNING',
      });
      expect(feed.reports.every((r) => r.reportType === 'OPEN_BURNING')).toBe(true);
    });

    it('filters community reports by severity', async () => {
      const feed = await communityService.getFilteredFeed({
        severity: 'SEVERE',
      });
      expect(feed.reports.every((r) => r.severity === 'SEVERE')).toBe(true);
    });

    it('only returns ACTIVE reports in the main public feed', async () => {
      const feed = await communityService.getFilteredFeed({});
      expect(feed.reports.every((r) => r.status === 'ACTIVE')).toBe(true);
    });

    it('does NOT expose private account userId in public feed items', async () => {
      const report = await communityService.submitReport(testCitizenA, {
        reportType: 'VISIBLE_SMOG',
        severity: 'MILD',
        description: 'Observation without author identification.',
        latitude: 28.61,
        longitude: 77.20,
        neighborhood: 'Central Delhi',
      });

      const feed = await communityService.getFilteredFeed({});
      const fetched = feed.reports.find((r) => r.id === report.id);
      expect(fetched).toBeDefined();
      expect((fetched as any).userId).toBeUndefined();
    });
  });

  describe('4. Upvoting Mechanism', () => {
    it('increments report upvotes atomically', async () => {
      const report = await communityService.submitReport(testCitizenA, {
        reportType: 'DUST_CONSTRUCTION',
        severity: 'MODERATE',
        description: 'Uncovered sand piles along road construction.',
        latitude: 28.61,
        longitude: 77.20,
        neighborhood: 'Central Delhi',
      });

      const initialUpvotes = report.upvotes;
      const upvoted = await communityService.upvoteObservation(report.id);
      expect(upvoted.upvotes).toBe(initialUpvotes + 1);

      const secondUpvote = await communityService.upvoteObservation(report.id);
      expect(secondUpvote.upvotes).toBe(initialUpvotes + 2);
    });

    it('throws error when upvoting non-existent report', async () => {
      await expect(communityService.upvoteObservation('non-existent-id')).rejects.toThrow(
        'Report not found'
      );
    });
  });

  describe('5. Content Moderation & Flagging', () => {
    it('quarantines inappropriate content by transitioning status to FLAGGED', async () => {
      const spamReport = await communityService.submitReport(testCitizenA, {
        reportType: 'VISIBLE_SMOG',
        severity: 'MILD',
        description: 'Buy cheap air purifier filters at fake-scam-url.example.com!',
        latitude: 28.61,
        longitude: 77.20,
        neighborhood: 'Central Delhi',
      });

      const flagResult = await communityService.flagObservation(spamReport.id, {
        reason: 'SPAM_OR_ADVERTISING',
        details: 'Commercial link posting spam.',
      });

      expect(flagResult.status).toBe('FLAGGED');

      // Verify it is no longer returned in active feed
      const activeFeed = await communityService.getFilteredFeed({});
      expect(activeFeed.reports.some((r) => r.id === spamReport.id)).toBe(false);
    });
  });

  describe('6. Report Author Deletion & Ownership Guard', () => {
    it('allows author to delete their own report', async () => {
      const report = await communityService.submitReport(testCitizenA, {
        reportType: 'ACRID_ODOR',
        severity: 'MILD',
        description: 'Temporary chemical smell cleared after 10 minutes.',
        latitude: 28.61,
        longitude: 77.20,
        neighborhood: 'Central Delhi',
      });

      const deleted = await communityService.deleteObservation(report.id, testCitizenA);
      expect(deleted).toBe(true);

      const check = await communityRepository.getById(report.id);
      expect(check).toBeNull();
    });

    it('prevents non-author from deleting another user report', async () => {
      const report = await communityService.submitReport(testCitizenA, {
        reportType: 'VISIBLE_SMOG',
        severity: 'MODERATE',
        description: 'Citizen A valid report.',
        latitude: 28.61,
        longitude: 77.20,
        neighborhood: 'Central Delhi',
      });

      const unauthorizedDelete = await communityService.deleteObservation(report.id, testCitizenB);
      expect(unauthorizedDelete).toBe(false);

      const check = await communityRepository.getById(report.id);
      expect(check).not.toBeNull();
    });
  });

  describe('7. Upvote Deduplication & Rate Limiting Guard', () => {
    it('prevents immediate duplicate upvotes within the deduplication window', () => {
      const voterKey = 'test_voter_dedup_' + Date.now();
      const reportId = 'test_report_dedup_' + Date.now();
      const firstCheck = checkRateLimit(`upvote_dedup_${voterKey}_${reportId}`, 1, 86_400_000);
      expect(firstCheck.allowed).toBe(true);

      const duplicateCheck = checkRateLimit(`upvote_dedup_${voterKey}_${reportId}`, 1, 86_400_000);
      expect(duplicateCheck.allowed).toBe(false);
      expect(duplicateCheck.remaining).toBe(0);
    });
  });
});
