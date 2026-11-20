import prisma from '@/lib/db';
import { z } from 'zod';
import { createRoutineSchema, updateRoutineSchema } from '@/lib/validations';

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;
export type UpdateRoutineInput = z.infer<typeof updateRoutineSchema>;

export const routineRepository = {
  async getByUserId(userId: string) {
    return prisma.savedRoutine.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(userId: string, data: CreateRoutineInput) {
    return prisma.savedRoutine.create({
      data: {
        userId,
        ...data,
      },
    });
  },

  async update(userId: string, routineId: string, data: UpdateRoutineInput) {
    // Verifies user ownership before applying updates (IDOR protection)
    const existing = await prisma.savedRoutine.findFirst({
      where: { id: routineId, userId },
    });

    if (!existing) {
      throw new Error('Routine not found or unauthorized');
    }

    return prisma.savedRoutine.update({
      where: { id: routineId },
      data,
    });
  },

  async delete(userId: string, routineId: string) {
    // Verifies user ownership before deletion (IDOR protection)
    const existing = await prisma.savedRoutine.findFirst({
      where: { id: routineId, userId },
    });

    if (!existing) {
      throw new Error('Routine not found or unauthorized');
    }

    return prisma.savedRoutine.delete({
      where: { id: routineId },
    });
  },
};
