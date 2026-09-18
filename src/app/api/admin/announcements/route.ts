import { requireAuth, requireAdminWithScope, enforceCampusScope, enforceGroupScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import Announcement from '@/models/Announcement';
import { calculateNextOccurrence } from '@/lib/recurrence';
import { apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers';
import Notification from '@/models/Notification';
import { sendPushToTargeted } from '@/lib/push-utils';
import { serverCache, CACHE_TTL } from '@/lib/cache';

export async function GET() {
  return withErrorHandler(async () => {
    const session = await requireAuth();
    if (!session) return apiError('Unauthorized', 401);

    const cached = serverCache.get('announcements');
    if (cached) return apiSuccess(cached);

    await connectToDatabase();
    const announcements = await Announcement.find({})
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();

    serverCache.set('announcements', announcements, CACHE_TTL.ANNOUNCEMENTS, ['announcements']);
    return apiSuccess(announcements);
  });
}

export async function POST(req: Request) {
  return withErrorHandler(async () => {
    const admin = await requireAdminWithScope();
    if (!admin) return apiError('Unauthorized', 401);

    await connectToDatabase();
    const body = await req.json();

    // Enforce scope restrictions
    body.targetCampuses = enforceCampusScope(admin.role, admin.campusId, body.targetCampuses, admin.permissions, 'announcements');
    body.targetGroups = enforceGroupScope(admin.role, admin.groups, body.targetGroups, admin.permissions, 'announcements');

    // Auto-calculate nextOccurrence for recurring announcements
    if (body.isRecurring) {
      body.nextOccurrence = calculateNextOccurrence(
        body.recurrencePattern || 'weekly',
        body.recurrenceDay,
        body.date || new Date().toISOString().split('T')[0],
        body.recurrenceEndDate
      );
    }

    const announcement = await Announcement.create(body);

    await Notification.create({
      title: `New Announcement: ${announcement.title}`,
      message: announcement.content.substring(0, 100) + (announcement.content.length > 100 ? '...' : ''),
      type: 'new_announcement',
      sourceId: announcement._id.toString(),
      targetCampuses: announcement.targetCampuses || ['all'],
      targetGroups: announcement.targetGroups || [],
    });

    await sendPushToTargeted({
      title: `New Announcement: ${announcement.title}`,
      body: announcement.content.substring(0, 100) + (announcement.content.length > 100 ? '...' : ''),
      type: 'new_announcement'
    }, announcement.targetCampuses || ['all'], announcement.targetGroups || []);

    // Invalidate all announcement caches (any role/campus combo)
    serverCache.invalidateByTag('announcements');

    return apiSuccess(announcement, 201);
  });
}
