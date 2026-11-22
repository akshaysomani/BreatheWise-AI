import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth-guard';
import { communityService } from '@/services/community.service';
import { communityRepository } from '@/repositories/community.repository';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = await communityRepository.getById(id);
    if (!report || report.status !== 'ACTIVE') {
      return apiError('NOT_FOUND', 'Community observation not found.', 404);
    }

    const serialized = communityService.serializePublicReport(report);
    return apiSuccess(serialized, undefined, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/community/reports/[id]');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required to delete community observations.', 401);
  }

  try {
    const { id } = await params;
    const existing = await communityRepository.getById(id);
    if (!existing) {
      return apiError('NOT_FOUND', 'Community observation not found.', 404);
    }

    // Ownership Guard: Account B cannot delete or modify Account A's observation
    if (existing.userId !== user.id) {
      return apiError('FORBIDDEN', 'You can only delete observations that you submitted.', 403);
    }

    const deleted = await communityService.deleteObservation(id, user.id);
    if (!deleted) {
      return apiError('FORBIDDEN', 'Unable to delete observation.', 403);
    }

    return apiSuccess({ deleted: true, id }, undefined, 200, {
      'Cache-Control': 'no-store',
    });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/community/reports/[id]');
  }
}
