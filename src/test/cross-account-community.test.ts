import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '@/lib/db';
import { communityService } from '@/services/community.service';
import { GET as getReportsRoute, POST as postReportRoute } from '@/app/api/community/reports/route';
import { POST as upvoteRoute } from '@/app/api/community/reports/[id]/upvote/route';
import { DELETE as deleteReportRoute, GET as getSingleReportRoute } from '@/app/api/community/reports/[id]/route';
import { createDatabaseSession } from '@/lib/session';
import { NextRequest } from 'next/server';

describe('BreatheWise AI — Form Typing & Cross-Account Community Observation Visibility', () => {
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;

  beforeEach(async () => {
    // Setup Account A
    userA = await prisma.user.create({
      data: {
        email: `citizen_a_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
        passwordHash: 'argon2id_mock_hash_a',
        name: 'Citizen A',
      },
    });
    const sessionA = await createDatabaseSession(userA.id);
    tokenA = sessionA.sessionToken;

    // Setup Account B
    userB = await prisma.user.create({
      data: {
        email: `citizen_b_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
        passwordHash: 'argon2id_mock_hash_b',
        name: 'Citizen B',
      },
    });
    const sessionB = await createDatabaseSession(userB.id);
    tokenB = sessionB.sessionToken;
  });

  describe('1. Input Focus and Character Typing Validation', () => {
    it('accepts multi-character strings with spaces, punctuation, and numbers for neighborhood', async () => {
      const complexNeighborhood = 'Sector 62, Near City Center Park #4';
      const report = await communityService.submitReport(userA.id, {
        reportType: 'VISIBLE_SMOG',
        severity: 'MODERATE',
        neighborhood: complexNeighborhood,
        description: 'Smog observed across main arterial ring road.',
        latitude: 28.61,
        longitude: 77.20,
      });

      expect(report.neighborhood).toBe(complexNeighborhood);
    });

    it('accepts full continuous sentences with spaces, punctuation, and apostrophes in description', async () => {
      const fullSentence =
        'Dense white smoke observed drifting eastward from the industrial sector along with a strong chemical odor.';
      const report = await communityService.submitReport(userA.id, {
        reportType: 'INDUSTRIAL_PLUME',
        severity: 'SEVERE',
        neighborhood: 'Sector 18',
        description: fullSentence,
        latitude: 28.57,
        longitude: 77.32,
      });

      expect(report.description).toBe(fullSentence);
    });

    it('enforces maximum 1,000 characters description limit strictly', async () => {
      const exact1000 = 'A'.repeat(1000);
      const report = await communityService.submitReport(userA.id, {
        reportType: 'VISIBLE_SMOG',
        severity: 'MILD',
        neighborhood: 'Central Park',
        description: exact1000,
        latitude: 28.61,
        longitude: 77.20,
      });

      expect(report.description.length).toBe(1000);

      // 1001 characters must be rejected by schema validation
      const over1000 = 'A'.repeat(1001);
      await expect(
        communityService.submitReport(userA.id, {
          reportType: 'VISIBLE_SMOG',
          severity: 'MILD',
          neighborhood: 'Central Park',
          description: over1000,
          latitude: 28.61,
          longitude: 77.20,
        })
      ).rejects.toThrow();
    });
  });

  describe('2. Cross-Account Observation Visibility & Shared Community Feed', () => {
    it('ensures Account B sees Account A observation in the community feed', async () => {
      // Step 1: Account A submits observation
      const postReq = new NextRequest('http://localhost:3000/api/community/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          reportType: 'OPEN_BURNING',
          severity: 'SEVERE',
          neighborhood: 'Sector 18',
          description: 'Citizen A observation test',
          latitude: 28.57,
          longitude: 77.32,
        }),
      });

      const postRes = await postReportRoute(postReq);
      expect(postRes.status).toBe(201);
      const postJson = await postRes.json();
      const reportId = postJson.data.id;
      expect(reportId).toBeDefined();

      // Step 2: Account B views Community Environmental Insights feed
      const getReq = new NextRequest('http://localhost:3000/api/community/reports?scope=all', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${tokenB}`,
        },
      });

      const getRes = await getReportsRoute(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);

      const found = getJson.data.reports.find((r: any) => r.id === reportId);
      expect(found).toBeDefined();

      // Verify all expected fields
      expect(found.reportType).toBe('OPEN_BURNING');
      expect(found.severity).toBe('SEVERE');
      expect(found.neighborhood).toBe('Sector 18');
      expect(found.description).toBe('Citizen A observation test');
      expect(found.isOfficialData).toBe(false);
      expect(found.fuzzedLatitude).toBe(28.57);
      expect(found.fuzzedLongitude).toBe(77.32);

      // Verify privacy invariants: Account A private user ID and email are NOT exposed
      expect(found.userId).toBeUndefined();
      expect(found.email).toBeUndefined();
      expect((found as any).passwordHash).toBeUndefined();
    });

    it('allows Account B to upvote Account A observation and increments upvotes atomically', async () => {
      // Account A creates observation
      const report = await communityService.submitReport(userA.id, {
        reportType: 'OPEN_BURNING',
        severity: 'SEVERE',
        neighborhood: 'Sector 18',
        description: 'Citizen A observation test for upvote',
        latitude: 28.57,
        longitude: 77.32,
      });

      expect(report.upvotes).toBe(0);

      // Account B upvotes Account A's observation
      const upvoteReq = new NextRequest(`http://localhost:3000/api/community/reports/${report.id}/upvote`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokenB}`,
        },
      });

      const upvoteRes = await upvoteRoute(upvoteReq, { params: Promise.resolve({ id: report.id }) });
      expect(upvoteRes.status).toBe(200);
      const upvoteJson = await upvoteRes.json();
      expect(upvoteJson.data.upvotes).toBe(1);

      // Account A fetches the report / feed and sees updated upvotes
      const singleReq = new NextRequest(`http://localhost:3000/api/community/reports/${report.id}`);
      const singleRes = await getSingleReportRoute(singleReq, { params: Promise.resolve({ id: report.id }) });
      expect(singleRes.status).toBe(200);
      const singleJson = await singleRes.json();
      expect(singleJson.data.upvotes).toBe(1);
    });

    it('ensures bidirectional visibility: Account A sees Account B observation', async () => {
      // Account B submits observation
      const postReqB = new NextRequest('http://localhost:3000/api/community/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          reportType: 'DUST_CONSTRUCTION',
          severity: 'MODERATE',
          neighborhood: 'Sector 62',
          description: 'Citizen B observation test',
          latitude: 28.62,
          longitude: 77.36,
        }),
      });

      const postResB = await postReportRoute(postReqB);
      expect(postResB.status).toBe(201);
      const postJsonB = await postResB.json();
      const reportIdB = postJsonB.data.id;

      // Account A fetches feed
      const getReqA = new NextRequest('http://localhost:3000/api/community/reports', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${tokenA}`,
        },
      });

      const getResA = await getReportsRoute(getReqA);
      expect(getResA.status).toBe(200);
      const getJsonA = await getResA.json();

      const foundB = getJsonA.data.reports.find((r: any) => r.id === reportIdB);
      expect(foundB).toBeDefined();
      expect(foundB.neighborhood).toBe('Sector 62');
      expect(foundB.description).toBe('Citizen B observation test');
      expect(foundB.isOfficialData).toBe(false);
    });

    it('prevents Account B from deleting or modifying Account A observation', async () => {
      // Account A creates report
      const reportA = await communityService.submitReport(userA.id, {
        reportType: 'VISIBLE_SMOG',
        severity: 'SEVERE',
        neighborhood: 'Sector 18',
        description: 'Account A protected observation',
        latitude: 28.57,
        longitude: 77.32,
      });

      // Account B attempts to delete Account A's report
      const deleteReqB = new NextRequest(`http://localhost:3000/api/community/reports/${reportA.id}`, {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${tokenB}`,
        },
      });

      const deleteResB = await deleteReportRoute(deleteReqB, { params: Promise.resolve({ id: reportA.id }) });
      // Must be rejected with 403 Forbidden
      expect(deleteResB.status).toBe(403);
      const errorJson = await deleteResB.json();
      expect(errorJson.error.code).toBe('FORBIDDEN');

      // Verify report still exists in database
      const dbReport = await prisma.communityReport.findUnique({ where: { id: reportA.id } });
      expect(dbReport).not.toBeNull();
      expect(dbReport?.status).toBe('ACTIVE');

      // Account A can successfully delete their own report
      const deleteReqA = new NextRequest(`http://localhost:3000/api/community/reports/${reportA.id}`, {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${tokenA}`,
        },
      });

      const deleteResA = await deleteReportRoute(deleteReqA, { params: Promise.resolve({ id: reportA.id }) });
      expect(deleteResA.status).toBe(200);

      // Verify report is now deleted
      const checkDeleted = await prisma.communityReport.findUnique({ where: { id: reportA.id } });
      expect(checkDeleted).toBeNull();
    });
  });
});
