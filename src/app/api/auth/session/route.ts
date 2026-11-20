import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return apiSuccess({
        authenticated: false,
        user: null,
      });
    }

    // Check if user has an established household profile
    const household = await prisma.householdProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        city: true,
        homeType: true,
        floorAreaSqFt: true,
        hasHEPAFilter: true,
      },
    });

    return apiSuccess({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
        role: user.role,
      },
      hasHouseholdProfile: !!household,
      householdSummary: household,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/auth/session');
  }
}
