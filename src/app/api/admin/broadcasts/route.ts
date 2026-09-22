import { requireAdminWithScope, enforceCampusScope, enforceGroupScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import Broadcast from '@/models/Broadcast';
import { apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers';
import { notifyMembers, wantsMemberNotification } from '@/lib/notify-members';

export async function GET() {
  return withErrorHandler(async () => {
    await connectToDatabase();
    const admin = await requireAdminWithScope();
    if (!admin) return apiError('Unauthorized', 401);

    let query: any = {};

    const allowedCampuses = enforceCampusScope(admin.role, admin.campusId, undefined, admin.permissions, 'broadcasts');
    const hasModulePerm = admin.permissions?.some((p: string) => p.startsWith('broadcasts:'));

    if (!allowedCampuses.includes('all')) {
      if (admin.role === 'group_leader' && !hasModulePerm) {
        query.$or = [
          { targetCampuses: { $in: [...allowedCampuses, 'all'] }, targetGroups: { $in: [...admin.groups] } },
          { createdBy: admin.userId },
        ];
      } else {
        query.$or = [
          { targetCampuses: { $in: [...allowedCampuses, 'all'] } },
          { createdBy: admin.userId },
        ];
      }
    }

    const broadcasts = await Broadcast.find(query).sort({ createdAt: -1 }).lean();
    return apiSuccess(broadcasts);
  });
}

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    await connectToDatabase();
    const admin = await requireAdminWithScope();
    if (!admin) return apiError('Unauthorized', 401);

    const body = await req.json();
    const { title, description, materialLinks } = body;
    const sendNotification = wantsMemberNotification(body);

    if (!title) {
      return apiError('Title is required', 400);
    }

    // Enforce scope restrictions
    const targetCampuses = enforceCampusScope(admin.role, admin.campusId, body.targetCampuses, admin.permissions, 'broadcasts');
    const targetGroups = enforceGroupScope(admin.role, admin.groups, body.targetGroups, admin.permissions, 'broadcasts');

    const broadcast = await Broadcast.create({
      title,
      description: description || '',
      materialLinks: materialLinks || [],
      targetCampuses,
      targetGroups,
      excludeCampuses: body.excludeCampuses || [],
      excludeGroups: body.excludeGroups || [],
      createdBy: admin.userId,
      createdByName: admin.name || '',
    });

    if (sendNotification) {
      const fullNote = broadcast.description || broadcast.title || '';
      const notePreview = fullNote.substring(0, 100) + (fullNote.length > 100 ? '...' : '');
      await notifyMembers({
        title: `New Note: ${broadcast.title}`,
        message: notePreview,
        type: 'new_note',
        sourceId: broadcast._id.toString(),
        targetCampuses: broadcast.targetCampuses || ['all'],
        targetGroups: broadcast.targetGroups || [],
      });
    }

    return apiSuccess(broadcast, 201);
  });
}
