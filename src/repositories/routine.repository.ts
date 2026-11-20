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
    return prisma.savedRoutine.update({
      where: {
        id: routineId,
        userId,
      },
      data,
    });
  },

  async delete(userId: string, routineId: string) {
    return prisma.savedRoutine.delete({
      where: {
        id: routineId,
        userId,
      },
    });
  },
};
