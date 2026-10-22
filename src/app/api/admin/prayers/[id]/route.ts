import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import PrayerRequest from '@/models/PrayerRequest';
import { verifySession } from '@/lib/auth-utils';
import { enforceCampusScope } from '@/lib/api-auth';
import User from '@/models/User';
import { notifyMembers, wantsMemberNotification } from '@/lib/notify-members';
import { logActivity } from '@/lib/activity-logger';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasPrayerPerm = Array.isArray(user.permissions) && user.permissions.some((p: string) => p.startsWith('prayers:'));
    const isLeadershipRole = ['campus_leader', 'admin', 'super_admin'].includes(user.role);

    if (!isLeadershipRole && !hasPrayerPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const prayer = await PrayerRequest.findById(id);

    if (!prayer) {
      return NextResponse.json({ error: 'Prayer request not found' }, { status: 404 });
    }

    // Ensure leader/authorized member can only update prayers within their allowed campus scope
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      const allowedCampuses = enforceCampusScope(user.role, user.campusId, undefined, user.permissions, 'prayers');
      if (!allowedCampuses.includes('all') && prayer.campusId && !allowedCampuses.includes(prayer.campusId)) {
        return NextResponse.json({ error: 'Forbidden: Different campus' }, { status: 403 });
      }
    }

    let logAction: 'APPROVE' | 'REJECT' | 'UPDATE' = 'UPDATE';

    if (Array.isArray(body.targetGroups)) {
      prayer.targetGroups = body.targetGroups;
      prayer.isBroadcast = body.targetGroups.length > 0;
    }

    if (Array.isArray(body.targetCampuses)) {
      prayer.targetCampuses = body.targetCampuses;
    }

    if (body.status) {
      const wasApproved = prayer.status === 'approved';
      prayer.status = body.status;

      if (body.status === 'approved' && !wasApproved) {
        logAction = 'APPROVE';
        if (wantsMemberNotification(body)) {
          const prayerAuthorDisplay = prayer.isAnonymous ? 'Anonymous' : prayer.authorName;
          await notifyMembers({
            title: 'New Prayer Request',
            message: `${prayer.title}${prayerAuthorDisplay ? ` · By ${prayerAuthorDisplay}` : ''}`,
            type: 'new_prayer',
            sourceId: prayer._id.toString(),
            targetCampuses: prayer.campusId ? [prayer.campusId] : ['all'],
            targetGroups: Array.isArray(prayer.targetGroups) ? prayer.targetGroups : [],
          });
        }
      } else if (body.status === 'rejected') {
        logAction = 'REJECT';
      }
    }

    await prayer.save();

    await logActivity({
      userId: user._id.toString(),
      userName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
      userEmail: user.email,
      userRole: user.role,
      action: logAction,
      entityType: 'prayer',
      entityId: id,
      entityTitle: prayer.title || 'Prayer Request',
      campusId: prayer.campusId || user.campusId,
      details: { newStatus: prayer.status },
    });

    return NextResponse.json(prayer);
  } catch (error) {
    console.error('Error updating prayer:', error);
    return NextResponse.json({ error: 'Failed to update prayer' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasPrayerPerm = Array.isArray(user.permissions) && user.permissions.some((p: string) => p.startsWith('prayers:'));
    const isLeadershipRole = ['campus_leader', 'admin', 'super_admin'].includes(user.role);

    if (!isLeadershipRole && !hasPrayerPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prayer = await PrayerRequest.findById(id);

    if (!prayer) {
      return NextResponse.json({ error: 'Prayer request not found' }, { status: 404 });
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      const allowedCampuses = enforceCampusScope(user.role, user.campusId, undefined, user.permissions, 'prayers');
      if (!allowedCampuses.includes('all') && prayer.campusId && !allowedCampuses.includes(prayer.campusId)) {
        return NextResponse.json({ error: 'Forbidden: Different campus' }, { status: 403 });
      }
    }

    await PrayerRequest.findByIdAndDelete(id);

    await logActivity({
      userId: user._id.toString(),
      userName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
      userEmail: user.email,
      userRole: user.role,
      action: 'DELETE',
      entityType: 'prayer',
      entityId: id,
      entityTitle: prayer.title || 'Prayer Request',
      campusId: prayer.campusId || user.campusId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prayer:', error);
    return NextResponse.json({ error: 'Failed to delete prayer' }, { status: 500 });
  }
}
