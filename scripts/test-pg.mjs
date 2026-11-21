import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
  console.log('PostgreSQL Connectivity SUCCESS:', result);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('PostgreSQL Connectivity ERROR:', e);
  process.exit(1);
});
