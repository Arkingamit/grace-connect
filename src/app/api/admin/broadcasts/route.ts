import { requireAdminWithScope, enforceCampusScope, enforceGroupScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import Broadcast from '@/models/Broadcast';
import { apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers';
import Notification from '@/models/Notification';
import { sendPushToTargeted } from '@/lib/push-utils';

export async function GET() {
  return withErrorHandler(async () => {
    await connectToDatabase();
    const admin = await requireAdminWithScope();
    if (!admin) return apiError('Unauthorized', 401);

    let query: any = {};

    if (admin.role === 'campus_leader') {
      query.$or = [
        { targetCampuses: { $in: [admin.campusId, 'all'] } },
        { createdBy: admin.userId },
      ];
    } else if (admin.role === 'group_leader') {
      query.$or = [
        { targetCampuses: { $in: [admin.campusId, 'all'] }, targetGroups: { $in: [...admin.groups] } },
        { createdBy: admin.userId },
      ];
    }
    // admin/super_admin: no filter — see everything

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

    if (!title || !description) {
      return apiError('Title and description are required', 400);
    }

    // Enforce scope restrictions
    const targetCampuses = enforceCampusScope(admin.role, admin.campusId, body.targetCampuses);
    const targetGroups = enforceGroupScope(admin.role, admin.groups, body.targetGroups);

    const broadcast = await Broadcast.create({
      title,
      description,
      materialLinks: materialLinks || [],
      targetCampuses,
      targetGroups,
      createdBy: admin.userId,
      createdByName: admin.name || '',
    });

    await Notification.create({
      title: `New Note: ${broadcast.title}`,
      message: broadcast.description.substring(0, 100) + (broadcast.description.length > 100 ? '...' : ''),
      type: 'new_note',
      sourceId: broadcast._id.toString(),
      targetCampuses: broadcast.targetCampuses || ['all'],
      targetGroups: broadcast.targetGroups || [],
    });

    await sendPushToTargeted({
      title: `New Note: ${broadcast.title}`,
      body: broadcast.description.substring(0, 100) + (broadcast.description.length > 100 ? '...' : ''),
      type: 'new_note'
    }, broadcast.targetCampuses || ['all'], broadcast.targetGroups || []);

    return apiSuccess(broadcast, 201);
  });
}
