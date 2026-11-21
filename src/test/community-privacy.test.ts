import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '@/lib/db';
import { communityService } from '@/services/community.service';

describe('BreatheWise AI — Community Location and Timestamp Privacy (M8.2 / M7-008)', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `privacy_test_${Date.now()}_${Math.random().toString(36).substring(7)}@breathewise.test`,
        passwordHash: 'scrypt_mock_hash',
        name: 'Privacy Tester',
      },
    });
  });

  describe('1. Timestamp Coarsening to Hourly Boundaries', () => {
    it('coarsens public observation timestamps to the nearest hour boundary', async () => {
      // Create observation with specific precise minutes/seconds
      const report = await communityService.submitReport(testUser.id, {
        reportType: 'VISIBLE_SMOG',
        severity: 'MODERATE',
        description: 'Smog accumulation along Ring Road.',
        latitude: 28.6139,
        longitude: 77.2090,
        neighborhood: 'Central Delhi',
      });

      // Public output timestamp must be coarsened to :00:00.000Z in UTC
      expect(report.approximateTime).toBeDefined();
      expect(report.timePrecision).toBe('HOURLY_COARSED');

      const coarsenedDate = new Date(report.approximateTime);
      expect(coarsenedDate.getUTCMinutes()).toBe(0);
      expect(coarsenedDate.getUTCSeconds()).toBe(0);
      expect(coarsenedDate.getUTCMilliseconds()).toBe(0);

      // Verify createdAt matches approximateTime in public output
      expect(report.createdAt).toBe(report.approximateTime);
    });

    it('neutralizes diurnal routine correlation in repeated daily observations', async () => {
      // User posts observation at 08:14:23 AM
      const date1 = new Date('2026-11-21T08:14:23.456Z');
      const coarsened1 = communityService.coarsenTimestampToHour(date1);
      expect(coarsened1).toBe('2026-11-21T08:00:00.000Z');

      // User posts observation the next day at 08:47:11 AM
      const date2 = new Date('2026-11-22T08:47:11.890Z');
      const coarsened2 = communityService.coarsenTimestampToHour(date2);
      expect(coarsened2).toBe('2026-11-22T08:00:00.000Z');

      // Exact minutes and seconds are stripped, preventing micro-temporal commute tracking
      expect(coarsened1.endsWith(':00:00.000Z')).toBe(true);
      expect(coarsened2.endsWith(':00:00.000Z')).toBe(true);
    });
  });

  describe('2. Public Spatial Quantization & Identity Scrubbing', () => {
    it('strictly scrubs userId, email, and exact coordinates from public responses', async () => {
      const created = await communityService.submitReport(testUser.id, {
        reportType: 'OPEN_BURNING',
        severity: 'SEVERE',
        description: 'Leaf burning near colony boundary.',
        latitude: 28.5355123,
        longitude: 77.3910245,
        neighborhood: 'Noida Sector 128',
      });

      // Check return object
      expect((created as any).userId).toBeUndefined();
      expect((created as any).email).toBeUndefined();
      expect((created as any).latitude).toBeUndefined();
      expect((created as any).longitude).toBeUndefined();

      // Coordinates must be strictly quantized to 2 decimal places
      expect(created.fuzzedLatitude).toBe(28.54);
      expect(created.fuzzedLongitude).toBe(77.39);

      // Check feed query
      const feed = await communityService.getFilteredFeed({ reportType: 'OPEN_BURNING' });
      const found = feed.reports.find((r) => r.id === created.id);
      expect(found).toBeDefined();
      expect((found as any).userId).toBeUndefined();
      expect(found?.fuzzedLatitude).toBe(28.54);
      expect(found?.fuzzedLongitude).toBe(77.39);
    });

    it('repeated queries from the same location produce identical stable centroid without leaking exact coords', () => {
      // 5 different household locations within the same ~1.1km grid cell
      const points = [
        { lat: 28.6111, lon: 77.2012 },
        { lat: 28.6144, lon: 77.2045 },
        { lat: 28.6105, lon: 77.2001 },
        { lat: 28.6138, lon: 77.2023 },
        { lat: 28.6099, lon: 77.2049 },
      ];

      const fuzzedResults = points.map((p) => communityService.fuzzCoordinates(p.lat, p.lon));

      // All points within this cell snap to 28.61, 77.20
      for (const res of fuzzedResults) {
        expect(res.fuzzedLatitude).toBe(28.61);
        expect(res.fuzzedLongitude).toBe(77.20);
      }
    });
  });

  describe('3. Export Privacy & Formula Injection Neutralization', () => {
    it('applies identical privacy restrictions and hourly coarsening in CSV export', async () => {
      await communityService.submitReport(testUser.id, {
        reportType: 'DUST_CONSTRUCTION',
        severity: 'MILD',
        description: 'Construction dust blowing onto walkway.',
        latitude: 28.7041,
        longitude: 77.1025,
        neighborhood: 'Rohini',
      });

      const csv = await communityService.exportObservationsAsCsv();

      // Header verification
      expect(csv).toContain('Observation ID');
      expect(csv).toContain('Approximate Time Window (Hourly Coarsened)');
      expect(csv).toContain('Neighborhood Centroid (~1.1km)');

      // Privacy checks: userId and exact coordinates must NOT be in CSV
      expect(csv).not.toContain(testUser.id);
      expect(csv).not.toContain('28.7041');
      expect(csv).not.toContain('77.1025');

      // Fuzzed coordinates must be present
      expect(csv).toContain('28.7');
      expect(csv).toContain('77.1');
    });

    it('neutralizes CSV formula injection attempts in observation descriptions', async () => {
      await communityService.submitReport(testUser.id, {
        reportType: 'VISIBLE_SMOG',
        severity: 'SEVERE',
        description: '=cmd|"/C calc"!A0', // Classic CSV formula injection payload
        latitude: 28.6139,
        longitude: 77.2090,
        neighborhood: 'Injection Test Park',
      });

      const csv = await communityService.exportObservationsAsCsv();

      // Formula character must be prepended with single quote (') to neutralize execution in Excel/Calc
      expect(csv).toContain(`"'=cmd|""/C calc""!A0"`);
      expect(csv).not.toContain(`"=cmd|`);
    });

    it('formats structured JSON export with privacy metadata', async () => {
      const jsonExport = await communityService.exportObservationsAsJson();

      expect(jsonExport.exportMetadata).toBeDefined();
      expect(jsonExport.exportMetadata.privacyStandard).toContain('Hourly Timestamp Coarsening');
      expect(jsonExport.exportMetadata.regulatoryInvariant).toContain('isOfficialData: false');
      expect(Array.isArray(jsonExport.reports)).toBe(true);

      for (const r of jsonExport.reports) {
        expect((r as any).userId).toBeUndefined();
        expect(r.approximateTime).toBeDefined();
        expect(r.timePrecision).toBe('HOURLY_COARSED');
      }
    });
  });

  describe('4. Adversarial Differencing & Sparse-Area Re-identification Analysis', () => {
    it('resists boundary micro-perturbation attacks across adjacent probe coordinates', () => {
      // Adversary probes around grid cell boundary trying to reconstruct exact origin
      const probe1 = communityService.fuzzCoordinates(28.6149, 77.2049);
      const probe2 = communityService.fuzzCoordinates(28.6141, 77.2041);
      const probe3 = communityService.fuzzCoordinates(28.6111, 77.2011);

      // All snap cleanly to the same 2-decimal quantized grid cell centroid
      expect(probe1.fuzzedLatitude).toBe(28.61);
      expect(probe1.fuzzedLongitude).toBe(77.20);
      expect(probe2.fuzzedLatitude).toBe(28.61);
      expect(probe2.fuzzedLongitude).toBe(77.20);
      expect(probe3.fuzzedLatitude).toBe(28.61);
      expect(probe3.fuzzedLongitude).toBe(77.20);
    });

    it('quantifies sparse-area single-contributor re-identification limitation', async () => {
      // In a hyper-sparse rural or peri-urban grid cell with only 1 contributor,
      // spatial fuzzing (~1.1km) and hourly coarsening provide k=1 anonymity within that cell
      // if external out-of-band surveillance confirms the contributor's location.
      const sparseReport = await communityService.submitReport(testUser.id, {
        reportType: 'OPEN_BURNING',
        severity: 'SEVERE',
        description: 'Isolated farm field burning along village perimeter.',
        latitude: 29.1234,
        longitude: 76.5678,
        neighborhood: 'Outer Agricultural Fringe',
      });

      // Database persists only geographically fuzzed centroid coordinates (~1.1km precision)
      const internalDb = await prisma.communityReport.findUnique({ where: { id: sparseReport.id } });
      expect(internalDb?.fuzzedLatitude).toBe(29.12);
      expect(internalDb?.fuzzedLongitude).toBe(76.57);

      // Public serialized boundary strictly strips exact coordinates and exact timestamp
      expect(sparseReport.fuzzedLatitude).toBe(29.12);
      expect(sparseReport.fuzzedLongitude).toBe(76.57);
      expect((sparseReport as any).latitude).toBeUndefined();
      expect((sparseReport as any).longitude).toBeUndefined();
      expect((sparseReport as any).userId).toBeUndefined();
      expect(sparseReport.timePrecision).toBe('HOURLY_COARSED');
    });

    it('collapses high-frequency burst submissions within the same hour to identical temporal bins', async () => {
      const baseTime = new Date('2026-11-21T14:02:15.123Z');
      const burstTime1 = new Date('2026-11-21T14:15:30.456Z');
      const burstTime2 = new Date('2026-11-21T14:48:59.789Z');

      const binBase = communityService.coarsenTimestampToHour(baseTime);
      const bin1 = communityService.coarsenTimestampToHour(burstTime1);
      const bin2 = communityService.coarsenTimestampToHour(burstTime2);

      expect(binBase).toBe('2026-11-21T14:00:00.000Z');
      expect(bin1).toBe('2026-11-21T14:00:00.000Z');
      expect(bin2).toBe('2026-11-21T14:00:00.000Z');
    });
  });
});
