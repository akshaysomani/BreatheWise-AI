import prisma from '@/lib/db';
import { z } from 'zod';
import { createHouseholdProfileSchema, updateHouseholdProfileSchema } from '@/lib/validations';

export type CreateHouseholdInput = z.infer<typeof createHouseholdProfileSchema>;
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdProfileSchema>;

export const householdRepository = {
  async getByUserId(userId: string) {
    return prisma.householdProfile.findUnique({
      where: { userId },
      include: {
        members: true,
      },
    });
  },

  async upsert(userId: string, data: CreateHouseholdInput) {
    const { members, ...profileFields } = data;

    return prisma.$transaction(async (tx) => {
      // 1. Upsert profile record
      const profile = await tx.householdProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...profileFields,
        },
        update: {
          ...profileFields,
        },
      });

      // 2. If members were provided in the payload, replace/sync members
      if (members && members.length > 0) {
        await tx.householdMember.deleteMany({
          where: { householdId: profile.id },
        });

        await tx.householdMember.createMany({
          data: members.map((m) => ({
            householdId: profile.id,
            nameOrAlias: m.nameOrAlias,
            ageGroup: m.ageGroup,
            hasAsthma: m.hasAsthma,
            hasHeartCondition: m.hasHeartCondition,
            isPregnant: m.isPregnant,
            outdoorHoursPerDay: m.outdoorHoursPerDay,
          })),
        });
      }

      return tx.householdProfile.findUnique({
        where: { id: profile.id },
        include: { members: true },
      });
    });
  },

  async deleteByUserId(userId: string) {
    return prisma.householdProfile.delete({
      where: { userId },
    });
  },
};
