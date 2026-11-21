import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '@/lib/db';
import { communityService } from '@/services/community.service';
import { POST as upvoteRoute } from '@/app/api/community/reports/[id]/upvote/route';
import { NextRequest } from 'next/server';

describe('BreatheWise AI — Community Upvote Abuse Resistance & Security (M8.3 / M7-002)', () => {
  let userA: any;
  let userB: any;
  let testReport: any;

  beforeEach(async () => {
    userA = await prisma.user.create({
      data: {
        email: `upvote_user_a_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
        passwordHash: 'scrypt_mock_hash',
        name: 'Voter A',
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `upvote_user_b_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
        passwordHash: 'scrypt_mock_hash',
        name: 'Voter B',
      },
    });

    testReport = await communityService.submitReport(userA.id, {
      reportType: 'VISIBLE_SMOG',
      severity: 'MODERATE',
      description: 'Dense haze over bypass corridor.',
      latitude: 28.62,
      longitude: 77.21,
      neighborhood: 'Pragati Maidan',
    });
  });

  describe('1. Database Uniqueness & Duplicate Vote Prevention', () => {
    it('allows a user to upvote once and rejects duplicate upvotes with ALREADY_UPVOTED', async () => {
      // First upvote from User A succeeds
      const firstResult = await communityService.upvoteObservation(testReport.id, userA.id);
      expect(firstResult.upvotes).toBe(1);

      // Second upvote from User A fails with duplicate error
      await expect(communityService.upvoteObservation(testReport.id, userA.id)).rejects.toThrow(
        /already upvoted/i
      );

      // Verify report upvote count in database is strictly 1
      const dbReport = await prisma.communityReport.findUnique({ where: { id: testReport.id } });
      expect(dbReport?.upvotes).toBe(1);
    });

    it('allows different distinct users to upvote the same report', async () => {
      // User A votes
      await communityService.upvoteObservation(testReport.id, userA.id);
      // User B votes
      const secondResult = await communityService.upvoteObservation(testReport.id, userB.id);

      expect(secondResult.upvotes).toBe(2);

      const dbReport = await prisma.communityReport.findUnique({ where: { id: testReport.id } });
      expect(dbReport?.upvotes).toBe(2);
    });

    it('handles concurrent duplicate upvotes from the same user safely', async () => {
      // Run 5 concurrent duplicate upvotes from User A
      const promises = Array.from({ length: 5 }, () =>
        communityService.upvoteObservation(testReport.id, userA.id).catch((err) => err)
      );

      const results = await Promise.all(promises);
      const successes = results.filter((r) => r && typeof r.upvotes === 'number');
      const failures = results.filter((r) => r instanceof Error);

      // Exactly 1 request succeeds; 4 fail on duplicate constraint
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(4);

      const dbReport = await prisma.communityReport.findUnique({ where: { id: testReport.id } });
      expect(dbReport?.upvotes).toBe(1);
    });
  });

  describe('2. Ineligible Observation Protection', () => {
    it('prevents upvoting quarantined / flagged observations', async () => {
      // Flag the observation to quarantine it
      await communityService.flagObservation(testReport.id, {
        reason: 'SPAM_OR_ADVERTISING',
        details: 'Quarantine test',
      });

      // Upvoting must be rejected
      await expect(communityService.upvoteObservation(testReport.id, userB.id)).rejects.toThrow(
        /Cannot upvote quarantined or non-active observation/i
      );
    });

    it('throws error when upvoting non-existent report', async () => {
      await expect(communityService.upvoteObservation('non-existent-report-uuid', userA.id)).rejects.toThrow(
        'Report not found'
      );
    });
  });

  describe('3. API Route Authentication & Sybil Resistance', () => {
    it('rejects unauthenticated upvote requests with HTTP 401 Unauthorized', async () => {
      const req = new NextRequest(`http://localhost:3000/api/community/reports/${testReport.id}/upvote`, {
        method: 'POST',
      });

      const res = await upvoteRoute(req, { params: Promise.resolve({ id: testReport.id }) });
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('neutralizes proxy header rotation attacks by rejecting unauthenticated voters', async () => {
      // Attacker attempts header rotation with multiple fake IPs
      const reqWithSpoofedIp1 = new NextRequest(`http://localhost:3000/api/community/reports/${testReport.id}/upvote`, {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.1' },
      });
      const reqWithSpoofedIp2 = new NextRequest(`http://localhost:3000/api/community/reports/${testReport.id}/upvote`, {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.2' },
      });

      const res1 = await upvoteRoute(reqWithSpoofedIp1, { params: Promise.resolve({ id: testReport.id }) });
      const res2 = await upvoteRoute(reqWithSpoofedIp2, { params: Promise.resolve({ id: testReport.id }) });

      // Both must be rejected with 401 because authentication is mandatory
      expect(res1.status).toBe(401);
      expect(res2.status).toBe(401);

      // Database upvotes must remain 0
      const dbReport = await prisma.communityReport.findUnique({ where: { id: testReport.id } });
      expect(dbReport?.upvotes).toBe(0);
    });
  });
});
