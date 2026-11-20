import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/db';
import { householdRepository } from '@/repositories/household.repository';
import { impactRepository } from '@/repositories/impact.repository';
import { communityRepository } from '@/repositories/community.repository';
import { airQualityRepository } from '@/repositories/air-quality.repository';

describe('Database Reliability & Repositories (M2 Phase 8)', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create isolated test user
    const user = await prisma.user.create({
      data: {
        email: `test_${Date.now()}@breathewise.local`,
        passwordHash: '$2b$12$mockhashedpasswordfortestingonly',
        name: 'Automated Test User',
        role: 'USER',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cascading clean up of test user and related records
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await prisma.$disconnect();
  });

  it('verifies active database connectivity via queryRaw', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('performs HouseholdProfile upsert with relational members in transaction', async () => {
    const profile = await householdRepository.upsert(testUserId, {
      city: 'Gurugram',
      neighborhood: 'Cyber City',
      latitude: 28.4595,
      longitude: 77.0266,
      homeType: 'APARTMENT',
      floorAreaSqFt: 950,
      ceilingHeightFt: 9.5,
      hasHEPAFilter: true,
      hepaCADR: 190,
      windowSealing: 'TIGHT',
      primaryCookingFuel: 'ELECTRIC_INDUCTION',
      members: [
        {
          nameOrAlias: 'Test Member 1',
          ageGroup: 'ADULT',
          hasAsthma: true,
          hasHeartCondition: false,
          isPregnant: false,
          outdoorHoursPerDay: 2.0,
        },
      ],
    });

    expect(profile).toBeDefined();
    expect(profile?.city).toBe('Gurugram');
    expect(profile?.members).toHaveLength(1);
    expect(profile?.members[0].hasAsthma).toBe(true);

    // Fetch via repository
    const fetched = await householdRepository.getByUserId(testUserId);
    expect(fetched?.floorAreaSqFt).toBe(950);
  });

  it('enforces foreign key cascading delete when user is deleted', async () => {
    // Create temporary user with profile and impact log
    const tempUser = await prisma.user.create({
      data: {
        email: `temp_cascade_${Date.now()}@breathewise.local`,
        passwordHash: 'mockhash',
        name: 'Temp Cascade User',
      },
    });

    await householdRepository.upsert(tempUser.id, {
      city: 'Delhi',
      latitude: 28.6,
      longitude: 77.2,
      homeType: 'STANDALONE_HOUSE',
      floorAreaSqFt: 1500,
      ceilingHeightFt: 9.0,
      hasHEPAFilter: false,
      windowSealing: 'POOR',
      primaryCookingFuel: 'LPG_GAS',
      members: [],
    });

    await impactRepository.create(tempUser.id, {
      actionType: 'HEPA_PURIFICATION',
      title: 'Temp Test Log',
      co2AvoidedKg: 1.5,
      pm25AvoidedGrams: 0.1,
      calculationFormula: 'test formula',
      uncertaintyMargin: 0.15,
      date: new Date(),
    });

    // Delete user
    await prisma.user.delete({ where: { id: tempUser.id } });

    // Verify cascading deletion: profile and impact logs are deleted
    const profileAfter = await prisma.householdProfile.findUnique({ where: { userId: tempUser.id } });
    expect(profileAfter).toBeNull();

    const logsAfter = await prisma.impactLog.findMany({ where: { userId: tempUser.id } });
    expect(logsAfter).toHaveLength(0);
  });

  it('enforces unique email constraint', async () => {
    const existing = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(existing).toBeDefined();

    // Attempt to create duplicate user with identical email
    await expect(
      prisma.user.create({
        data: {
          email: existing!.email,
          passwordHash: 'anotherhash',
          name: 'Duplicate Email Attempt',
        },
      })
    ).rejects.toThrow();
  });

  it('records and queries AirQualitySnapshot with geographical radius bounds', async () => {
    const snapshot = await airQualityRepository.saveSnapshot({
      latitude: 28.61,
      longitude: 77.20,
      stationId: 'TEST_STN_001',
      stationName: 'Connaught Place Test Monitor',
      sourceProvider: 'CPCB',
      aqiValue: 245,
      aqiCategory: 'VERY_UNHEALTHY',
      dominantPollutant: 'PM2.5',
      pm25: 195.4,
      pm10: 290.1,
      no2: 45.2,
      o3: 32.0,
      measurementTimestamp: new Date(),
      isStale: false,
    });

    expect(snapshot.id).toBeDefined();

    const latest = await airQualityRepository.getLatestByLocation(28.612, 77.205);
    expect(latest).toBeDefined();
    expect(latest?.stationId).toBe('TEST_STN_001');
    expect(latest?.aqiValue).toBe(245);
  });

  it('saves CommunityReport with strict isOfficialData: false invariant', async () => {
    const report = await communityRepository.create(testUserId, {
      reportType: 'OPEN_BURNING',
      severity: 'SEVERE',
      description: 'Localized leaf burning observed in neighborhood park.',
      latitude: 28.62,
      longitude: 77.36,
      fuzzedLatitude: 28.62,
      fuzzedLongitude: 77.36,
      neighborhood: 'Sector 62 Test',
    });

    expect(report.id).toBeDefined();
    expect(report.isOfficialData).toBe(false); // Invariant maintained

    const upvoted = await communityRepository.upvote(report.id);
    expect(upvoted.upvotes).toBe(1);
  });
});
