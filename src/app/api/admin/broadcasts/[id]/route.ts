import { verifySession } from '@/lib/auth-utils';
import { requireAdminWithScope, enforceCampusScope, enforceGroupScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import Broadcast from '@/models/Broadcast';
import User from '@/models/User';
import { apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers';
import { logActivity, logActivityFromAdmin } from '@/lib/activity-logger';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    const admin = await requireAdminWithScope();
    if (!admin) return apiError('Unauthorized', 401);

    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const broadcast = await Broadcast.findById(id);
    if (!broadcast) return apiError('Not found', 404);

    // Only creator or higher roles can edit
    if (broadcast.createdBy !== admin.userId && !['admin', 'super_admin'].includes(admin.role)) {
      return apiError('Forbidden', 403);
    }

    const { title, description, materialLinks } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (materialLinks !== undefined) updateData.materialLinks = materialLinks;

    if (body.targetCampuses !== undefined) {
      updateData.targetCampuses = enforceCampusScope(admin.role, admin.campusId, body.targetCampuses, admin.permissions, 'broadcasts');
    }
    if (body.targetGroups !== undefined) {
      updateData.targetGroups = enforceGroupScope(admin.role, admin.groups, body.targetGroups, admin.permissions, 'broadcasts');
    }
    if (body.excludeCampuses !== undefined) {
      updateData.excludeCampuses = body.excludeCampuses || [];
    }
    if (body.excludeGroups !== undefined) {
      updateData.excludeGroups = body.excludeGroups || [];
    }

    const updated = await Broadcast.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    await logActivityFromAdmin(admin, {
      action: 'UPDATE',
      entityType: 'note',
      entityId: id,
      entityTitle: updated?.title || broadcast.title || 'Note',
      details: { changedFields: Object.keys(updateData) },
    });

    return apiSuccess(updated);
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    const { id } = await params;
    await connectToDatabase();
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return apiError('Unauthorized', 401);
    }
    const user = await User.findById(session.userId);
    if (!user || !['group_leader', 'campus_leader', 'admin', 'super_admin'].includes(user.role)) {
      return apiError('Forbidden', 403);
    }

    const broadcast = await Broadcast.findById(id);
    if (!broadcast) {
      return apiError('Not found', 404);
    }

    // Only creator or higher roles can delete
    if (broadcast.createdBy !== session.userId && !['admin', 'super_admin'].includes(user.role)) {
      return apiError('Forbidden', 403);
    }

    await Broadcast.findByIdAndDelete(id);

    await logActivity({
      userId: user._id.toString(),
      userName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
      userEmail: user.email,
      userRole: user.role,
      action: 'DELETE',
      entityType: 'note',
      entityId: id,
      entityTitle: broadcast.title || 'Note',
      campusId: user.campusId,
    });

    return apiSuccess({ success: true });
  });
}
