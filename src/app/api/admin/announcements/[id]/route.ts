import { requireAdminWithScope, enforceCampusScope, enforceGroupScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import Announcement from '@/models/Announcement';
import { calculateNextOccurrence } from '@/lib/recurrence';
import { apiSuccess, apiError, withErrorHandler } from '@/lib/api-helpers';
import { serverCache } from '@/lib/cache';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    const admin = await requireAdminWithScope();
    if (!admin) return apiError('Unauthorized', 401);

    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    // Enforce scope on update
    body.targetCampuses = enforceCampusScope(admin.role, admin.campusId, body.targetCampuses);
    body.targetGroups = enforceGroupScope(admin.role, admin.groups, body.targetGroups);

    // Auto-calculate nextOccurrence when updating to recurring
    if (body.isRecurring) {
      body.nextOccurrence = calculateNextOccurrence(
        body.recurrencePattern || 'weekly',
        body.recurrenceDay,
        body.date || new Date().toISOString().split('T')[0],
        body.recurrenceEndDate
      );
    } else if (body.isRecurring === false) {
      body.nextOccurrence = null;
      body.lastTriggered = null;
    }

    const announcement = await Announcement.findByIdAndUpdate(id, body, { new: true });
    
    if (!announcement) {
      return apiError('Announcement not found', 404);
    }

    // Invalidate all announcement caches
    serverCache.invalidateByTag('announcements');
    
    return apiSuccess(announcement);
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    const admin = await requireAdminWithScope();
    if (!admin) return apiError('Unauthorized', 401);

    await connectToDatabase();
    const { id } = await params;

    // Verify the announcement is within the user's scope before deleting
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return apiError('Announcement not found', 404);
    }

    // campus_leader can only delete announcements targeting their campus
    if (admin.role === 'campus_leader') {
      const targets = announcement.targetCampuses || [];
      if (!targets.includes(admin.campusId) && !targets.includes('all')) {
        return apiError('You can only delete announcements within your campus', 403);
      }
    } else if (admin.role === 'group_leader') {
      const targets = announcement.targetCampuses || [];
      if (!targets.includes(admin.campusId) && !targets.includes('all')) {
        return apiError('You can only delete announcements within your scope', 403);
      }
    }

    await Announcement.findByIdAndDelete(id);

    // Invalidate all announcement caches
    serverCache.invalidateByTag('announcements');

    return apiSuccess({ message: 'Announcement deleted successfully' });
  });
}
