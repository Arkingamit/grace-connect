import { requireAdminWithScope, enforceCampusScope, enforceGroupScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import Announcement from '@/models/Announcement';
import { calculateNextOccurrence } from '@/lib/recurrence';
import { apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers';
import Notification from '@/models/Notification';
import { sendPushToTargeted } from '@/lib/push-utils';
import { serverCache, CACHE_TTL } from '@/lib/cache';

export async function GET() {
  return withErrorHandler(async () => {
    const admin = await requireAdminWithScope();
    if (!admin) return apiError('Unauthorized', 401);

    // Cache key includes role+campus to avoid data leaks between scopes
    const cacheKey = `announcements:${admin.role}:${admin.campusId}`;
    const cached = serverCache.get(cacheKey);
    if (cached) return apiSuccess(cached);

    await connectToDatabase();

    let query: any = {};

    const allowedCampuses = enforceCampusScope(admin.role, admin.campusId, undefined, admin.permissions, 'announcements');
    const hasModulePerm = admin.permissions?.some((p: string) => p.startsWith('announcements:'));

    if (!allowedCampuses.includes('all')) {
      if (admin.role === 'group_leader' && !hasModulePerm) {
        // Group leaders see announcements targeting their campus/all AND their groups
        query.$or = [
          { targetCampuses: { $in: [...allowedCampuses, 'all'] }, targetGroups: { $in: [...admin.groups, 'all'] } },
          { targetCampuses: { $in: [...allowedCampuses, 'all'] }, targetGroups: { $size: 0 } },
          { targetCampuses: { $in: [...allowedCampuses, 'all'] }, targetGroups: { $exists: false } },
        ];
      } else {
        // Campus leaders or members with module permission see announcements targeting their allowed campuses or 'all'
        query.$or = [
          { targetCampuses: { $in: [...allowedCampuses, 'all'] } },
        ];
      }
    }

    const announcements = await Announcement.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();

    serverCache.set(cacheKey, announcements, CACHE_TTL.ANNOUNCEMENTS, ['announcements']);
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
