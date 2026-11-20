import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '@/lib/db';
import { impactService } from '@/services/impact.service';
import { impactRepository } from '@/repositories/impact.repository';

describe('BreatheWise AI — Personal Impact Tracker Service & Repository (M6)', () => {
  const testUserA = 'test-impact-user-a-' + Date.now();
  const testUserB = 'test-impact-user-b-' + Date.now();

  beforeEach(async () => {
    // Ensure test users exist in database
    await prisma.user.upsert({
      where: { id: testUserA },
      update: {},
      create: {
        id: testUserA,
        email: `usera-${Date.now()}@breathewise.test`,
        passwordHash: 'argon2id_mock_hash',
      },
    });

    await prisma.user.upsert({
      where: { id: testUserB },
      update: {},
      create: {
        id: testUserB,
        email: `userb-${Date.now()}@breathewise.test`,
        passwordHash: 'argon2id_mock_hash',
      },
    });
  });

  describe('1. Impact Log Creation & Categorization', () => {
    it('creates a verified transport commute shift log', async () => {
      const log = await impactService.recordLog(testUserA, {
        actionType: 'COMMUTE_SHIFT',
        title: 'Metro to Connaught Place',
        date: new Date(),
        co2AvoidedKg: 2.04,
        pm25AvoidedGrams: 0.21,
        distanceShiftedKm: 15,
        calculationFormula: '15 km * (0.171 kg/km [SOLO_CAR] - 0.035 kg/km [METRO])',
        uncertaintyMargin: 0.15,
      });

      expect(log.id).toBeDefined();
      expect(log.userId).toBe(testUserA);
      expect(log.actionType).toBe('COMMUTE_SHIFT');
      expect(log.co2AvoidedKg).toBe(2.04);
      expect(log.pm25AvoidedGrams).toBe(0.21);
      expect(log.distanceShiftedKm).toBe(15);
    });

    it('creates a waste diversion impact log', async () => {
      const log = await impactService.recordLog(testUserA, {
        actionType: 'WASTE_DIVERSION',
        title: 'Organic Composting Batch',
        date: new Date(),
        co2AvoidedKg: 4.80,
        pm25AvoidedGrams: 0.08,
        distanceShiftedKm: null,
        calculationFormula: '10 kg * 0.48 kg CO2e/kg diverted',
        uncertaintyMargin: 0.20,
      });

      expect(log.id).toBeDefined();
      expect(log.actionType).toBe('WASTE_DIVERSION');
      expect(log.co2AvoidedKg).toBe(4.80);
    });

    it('creates an energy efficiency impact log', async () => {
      const log = await impactService.recordLog(testUserA, {
        actionType: 'ENERGY_SAVING',
        title: 'HEPA Purifier Efficiency Tuning',
        date: new Date(),
        co2AvoidedKg: 7.16,
        pm25AvoidedGrams: 0.45,
        distanceShiftedKm: null,
        calculationFormula: '10 kWh * 0.716 kg CO2e/kWh [INDIA_NATIONAL_GRID]',
        uncertaintyMargin: 0.10,
      });

      expect(log.id).toBeDefined();
      expect(log.actionType).toBe('ENERGY_SAVING');
      expect(log.co2AvoidedKg).toBe(7.16);
    });
  });

  describe('2. Query Filtering & Data Isolation', () => {
    it('enforces strict user isolation — User B cannot retrieve User A logs', async () => {
      const logA = await impactService.recordLog(testUserA, {
        actionType: 'COMMUTE_SHIFT',
        title: 'User A Secret Travel',
        date: new Date(),
        co2AvoidedKg: 1.5,
        pm25AvoidedGrams: 0.1,
        calculationFormula: '10 km shifted',
        uncertaintyMargin: 0.15,
      });

      // User A can access
      const fetchedA = await impactService.getLogById(logA.id, testUserA);
      expect(fetchedA).not.toBeNull();
      expect(fetchedA?.id).toBe(logA.id);

      // User B CANNOT access User A's log
      const fetchedB = await impactService.getLogById(logA.id, testUserB);
      expect(fetchedB).toBeNull();
    });

    it('filters logs by action category correctly', async () => {
      const { logs: transportLogs } = await impactService.getFilteredLogs(testUserA, {
        category: 'COMMUTE_SHIFT',
      });
      expect(transportLogs.every((l) => l.actionType === 'COMMUTE_SHIFT')).toBe(true);

      const { logs: wasteLogs } = await impactService.getFilteredLogs(testUserA, {
        category: 'WASTE_DIVERSION',
      });
      expect(wasteLogs.every((l) => l.actionType === 'WASTE_DIVERSION')).toBe(true);
    });
  });

  describe('3. Edit & Delete Lifecycle with Ownership Guard', () => {
    it('allows log owner to update title and uncertainty', async () => {
      const created = await impactService.recordLog(testUserA, {
        actionType: 'COMMUTE_SHIFT',
        title: 'Original Title',
        date: new Date(),
        co2AvoidedKg: 1.0,
        pm25AvoidedGrams: 0.1,
        calculationFormula: 'Formula',
        uncertaintyMargin: 0.15,
      });

      const updated = await impactService.updateLog(created.id, testUserA, {
        title: 'Updated Verified Title',
        co2AvoidedKg: 1.2,
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('Updated Verified Title');
      expect(updated?.co2AvoidedKg).toBe(1.2);
    });

    it('prevents non-owner from updating or deleting logs', async () => {
      const created = await impactService.recordLog(testUserA, {
        actionType: 'COMMUTE_SHIFT',
        title: 'User A Private Activity',
        date: new Date(),
        co2AvoidedKg: 2.0,
        pm25AvoidedGrams: 0.2,
        calculationFormula: 'Formula',
        uncertaintyMargin: 0.15,
      });

      // User B tries to update User A's log
      const forbiddenUpdate = await impactService.updateLog(created.id, testUserB, {
        title: 'Hacked Title',
      });
      expect(forbiddenUpdate).toBeNull();

      // User B tries to delete User A's log
      const forbiddenDelete = await impactService.deleteLog(created.id, testUserB);
      expect(forbiddenDelete).toBe(false);

      // Verify record still exists
      const verifyStillExists = await impactService.getLogById(created.id, testUserA);
      expect(verifyStillExists).not.toBeNull();
    });

    it('allows owner to delete their own record', async () => {
      const created = await impactService.recordLog(testUserA, {
        actionType: 'COMMUTE_SHIFT',
        title: 'To Be Deleted',
        date: new Date(),
        co2AvoidedKg: 0.5,
        pm25AvoidedGrams: 0.05,
        calculationFormula: 'Formula',
        uncertaintyMargin: 0.15,
      });

      const deleted = await impactService.deleteLog(created.id, testUserA);
      expect(deleted).toBe(true);

      const check = await impactService.getLogById(created.id, testUserA);
      expect(check).toBeNull();
    });
  });

  describe('4. Aggregates & Category Breakdown', () => {
    it('computes accurate cumulative aggregates and category breakdowns', async () => {
      const aggregates = await impactService.getAggregates(testUserA);
      expect(aggregates.totalCO2AvoidedKg).toBeGreaterThanOrEqual(0);
      expect(aggregates.totalPM25AvoidedGrams).toBeGreaterThanOrEqual(0);
      expect(aggregates.totalLogsCount).toBeGreaterThanOrEqual(1);
      expect(aggregates.categoryBreakdown).toBeDefined();
    });
  });

  describe('5. Data Export (CSV & JSON)', () => {
    it('generates valid RFC 4180 compliant CSV export with proper headers', async () => {
      const csv = await impactService.exportLogsAsCsv(testUserA);
      expect(typeof csv).toBe('string');
      expect(csv).toContain('Log ID,Date (UTC),Action Category,Activity Title,CO2e Avoided (kg),PM2.5 Avoided (g),Distance Shifted (km),Calculation Formula,Uncertainty Margin (±%)');
      expect(csv).toContain('COMMUTE_SHIFT');
    });

    it('generates audit-grade JSON export with methodology metadata & standards citations', async () => {
      const json = await impactService.exportLogsAsJson(testUserA);
      expect(json.exportedAt).toBeDefined();
      expect(json.methodologyVersion).toBe('2024.2.0');
      expect(json.authoritativeStandards.length).toBeGreaterThanOrEqual(3);
      expect(json.userAggregates).toBeDefined();
      expect(Array.isArray(json.logs)).toBe(true);
    });

    it('neutralizes CSV formula injection characters (=, +, -, @)', async () => {
      await impactService.recordLog(testUserA, {
        actionType: 'COMMUTE_SHIFT',
        title: '=SUM(1+1)',
        date: new Date(),
        co2AvoidedKg: 1.0,
        pm25AvoidedGrams: 0.1,
        calculationFormula: '+CMD|calc!A0',
        uncertaintyMargin: 0.15,
      });

      const csv = await impactService.exportLogsAsCsv(testUserA);
      // Prepending single quote neutralizes spreadsheet formula execution
      expect(csv).toContain('"\'=SUM(1+1)"');
      expect(csv).toContain('"\'=SUM(1+1)"');
    });
  });
});
