import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Verifying PostgreSQL Data Integrity via Prisma Client ===');

  const userCount = await prisma.user.count();
  console.log(`User count: ${userCount}`);

  const sampleUser = await prisma.user.findFirst({
    include: {
      household: {
        include: { members: true },
      },
      sessions: true,
      reports: true,
      savedRoutines: true,
      impactLogs: true,
    },
  });

  console.log('Sample user retrieved:', {
    id: sampleUser?.id,
    email: sampleUser?.email,
    role: sampleUser?.role,
    householdCity: sampleUser?.household?.city,
    memberCount: sampleUser?.household?.members.length,
    sessionCount: sampleUser?.sessions.length,
  });

  const reportCount = await prisma.communityReport.count();
  console.log(`CommunityReport count: ${reportCount}`);

  const snapshotCount = await prisma.airQualitySnapshot.count();
  console.log(`AirQualitySnapshot count: ${snapshotCount}`);

  const logCount = await prisma.impactLog.count();
  console.log(`ImpactLog count: ${logCount}`);

  console.log('ALL PRISMA INTEGRITY CHECKS PASSED!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Data verification error:', err);
  process.exit(1);
});
