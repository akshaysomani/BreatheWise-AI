import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma Client singleton for BreatheWise AI.
 * Prevents multiple instances in development hot-reloading environments.
 * Follows official Next.js best practices.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
