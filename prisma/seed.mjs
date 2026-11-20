import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding BreatheWise AI development database (dev.db)...');

  // Clean existing development fixtures safely
  await prisma.recommendationRecord.deleteMany({
    where: { recommendedAction: { contains: '[DEV_FIXTURE]' } },
  });
  await prisma.communityReport.deleteMany({
    where: { description: { contains: '[DEV_FIXTURE]' } },
  });
  await prisma.impactLog.deleteMany({
    where: { title: { contains: '[DEV_FIXTURE]' } },
  });
  await prisma.savedRoutine.deleteMany({
    where: { title: { contains: '[DEV_FIXTURE]' } },
  });

  // 1. Seed or find Dev User
  const devUser = await prisma.user.upsert({
    where: { email: 'dev_household@breathewise.local' },
    update: {},
    create: {
      email: 'dev_household@breathewise.local',
      passwordHash: '$2b$12$e8qH9zWn3M8V1Yv5XGvV8eK.Xz7pE.m5U9Xh3qH8Z8v8z9w0Y1b2c', // Mock hash
      name: 'Sample Urban Family [DEV_FIXTURE]',
      role: 'USER',
    },
  });

  // 2. Seed Household Profile
  const profile = await prisma.householdProfile.upsert({
    where: { userId: devUser.id },
    update: {},
    create: {
      userId: devUser.id,
      city: 'Delhi NCR',
      neighborhood: 'Sector 62, Noida',
      latitude: 28.628,
      longitude: 77.364,
      homeType: 'APARTMENT',
      floorAreaSqFt: 1200,
      ceilingHeightFt: 9.0,
      hasHEPAFilter: true,
      hepaCADR: 250,
      windowSealing: 'MODERATE',
      primaryCookingFuel: 'LPG_GAS',
      members: {
        create: [
          {
            nameOrAlias: 'Aarav (Child)',
            ageGroup: 'CHILD',
            hasAsthma: true,
            hasHeartCondition: false,
            isPregnant: false,
            outdoorHoursPerDay: 1.0,
          },
          {
            nameOrAlias: 'Neha (Parent)',
            ageGroup: 'ADULT',
            hasAsthma: false,
            hasHeartCondition: false,
            isPregnant: false,
            outdoorHoursPerDay: 2.5,
          },
        ],
      },
    },
  });

  // 3. Seed Saved Routine
  await prisma.savedRoutine.create({
    data: {
      userId: devUser.id,
      title: '[DEV_FIXTURE] Daily Metro Commute to Connaught Place',
      origin: 'Sector 62, Noida',
      destination: 'Barakhamba Road, Connaught Place',
      distanceKm: 14.2,
      departureTime: '08:30',
      returnTime: '17:30',
      baselineMode: 'SOLO_CAR',
      optimizedMode: 'METRO',
      estimatedDoseReduction: 64.0,
      estimatedCO2SavingsKg: 2.08,
    },
  });

  // 4. Seed Impact Log
  await prisma.impactLog.create({
    data: {
      userId: devUser.id,
      actionType: 'COMMUTE_SHIFT',
      title: '[DEV_FIXTURE] 14.2 km Shift from Solo Car to Electric Metro',
      co2AvoidedKg: 2.08,
      pm25AvoidedGrams: 0.21,
      distanceShiftedKm: 14.2,
      calculationFormula: '14.2 km * (0.171 kg/km car - 0.035 kg/km metro)',
      uncertaintyMargin: 0.15,
    },
  });

  // 5. Seed Community Report (Geographically Fuzzed)
  await prisma.communityReport.create({
    data: {
      userId: devUser.id,
      reportType: 'VISIBLE_SMOG',
      severity: 'SEVERE',
      description: '[DEV_FIXTURE] Heavy agricultural residue smoke accumulating in northern bypass corridor.',
      fuzzedLatitude: 28.63,
      fuzzedLongitude: 77.36,
      neighborhood: 'Noida Sector 62 Centroid',
      isOfficialData: false, // Invariant
      upvotes: 4,
      status: 'ACTIVE',
    },
  });

  // 6. Seed Recommendation Record (6-field explainability foundation)
  await prisma.recommendationRecord.create({
    data: {
      userId: devUser.id,
      category: 'INDOOR_PURIFICATION',
      recommendedAction: '[DEV_FIXTURE] Run Master Bedroom HEPA at 180 CFM Continuous',
      scientificReason: 'Infiltration rate continuously leaks ambient PM2.5 indoors; 180 CFM maintains 5.0 ACH in a 200 sq ft room.',
      expectedBenefit: 'Reduces child bronchial irritation and lowers nocturnal asthma incidence by 78%.',
      quantifiedImpact: 'Calculated 82% particulate drop within 45 minutes.',
      assumptionsAndUncertainty: 'Assumes closed windows and standard rubber weatherstripping (±10% variance).',
      implementationSteps: JSON.stringify([
        'Place purifier 3ft from walls for unobstructed airflow.',
        'Keep bedroom door closed to maintain isolated clean-air bubble.',
        'Operate on High setting from 22:00 to 07:00.',
      ]),
      disclaimer: 'This guidance is an environmental optimization, not a clinical prescription.',
    },
  });

  // 7. Seed Verified Regional Air Quality Snapshots (Delhi Anand Vihar & Ahmedabad Maninagar)
  const now = new Date();
  await prisma.airQualitySnapshot.deleteMany({
    where: {
      stationId: { in: ['cpcb_station_delhi_anand_vihar', 'cpcb_station_ahd_maninagar'] },
    },
  });

  await prisma.airQualitySnapshot.createMany({
    data: [
      {
        latitude: 28.6476,
        longitude: 77.3158,
        stationId: 'cpcb_station_delhi_anand_vihar',
        stationName: 'Anand Vihar, Delhi - DPCC',
        sourceProvider: 'CPCB_CAAQMS',
        aqiValue: 342,
        aqiCategory: 'VERY_POOR',
        dominantPollutant: 'PM2.5',
        pm25: 184.2,
        pm10: 278.0,
        no2: 68.4,
        o3: 34.2,
        so2: 18.5,
        co: 1.85,
        nh3: 42.0,
        pb: 0.42,
        distanceKm: 0.1,
        rawBreakdownJson: JSON.stringify({
          subIndices: { 'PM2.5': 342, 'PM10': 228, 'NO2': 86, 'CO': 93, 'O3': 34, 'SO2': 23, 'NH3': 11, 'Pb': 42 },
          isInstantaneousProxy: true,
          averagingNotice: 'Acute 1-hour sensor proxy evaluated against CPCB breakpoints. Regulatory CPCB standard mandates a 24-hour average.',
        }),
        measurementTimestamp: now,
        isStale: false,
        provenanceType: 'DEVELOPMENT_SEED',
        averagingPeriod: '1_HOUR',
        completenessHours: 1.0,
      },
      {
        latitude: 22.9961,
        longitude: 72.6042,
        stationId: 'cpcb_station_ahd_maninagar',
        stationName: 'Maninagar, Ahmedabad - GPCB',
        sourceProvider: 'CPCB_CAAQMS',
        aqiValue: 168,
        aqiCategory: 'MODERATELY_POLLUTED',
        dominantPollutant: 'PM2.5',
        pm25: 80.5,
        pm10: 142.0,
        no2: 44.2,
        o3: 28.0,
        so2: 12.4,
        co: 1.20,
        nh3: 22.0,
        pb: 0.28,
        distanceKm: 0.1,
        rawBreakdownJson: JSON.stringify({
          subIndices: { 'PM2.5': 168, 'PM10': 128, 'NO2': 55, 'CO': 60, 'O3': 28, 'SO2': 16, 'NH3': 6, 'Pb': 28 },
          isInstantaneousProxy: true,
          averagingNotice: 'Acute 1-hour sensor proxy evaluated against CPCB breakpoints. Regulatory CPCB standard mandates a 24-hour average.',
        }),
        measurementTimestamp: now,
        isStale: false,
        provenanceType: 'DEVELOPMENT_SEED',
        averagingPeriod: '1_HOUR',
        completenessHours: 1.0,
      },
    ],
  });

  console.log('Development and regional air quality seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
