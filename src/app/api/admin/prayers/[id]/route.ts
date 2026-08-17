import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import PrayerRequest from '@/models/PrayerRequest';
import { verifySession } from '@/lib/auth-utils';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { sendPushToTargeted } from '@/lib/push-utils';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId);
    if (!user || !['campus_leader', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const prayer = await PrayerRequest.findById(id);

    if (!prayer) {
      return NextResponse.json({ error: 'Prayer request not found' }, { status: 404 });
    }

    // Ensure campus leader can only update their campus prayers
    if (user.role === 'campus_leader' && prayer.campusId !== user.campusId) {
      return NextResponse.json({ error: 'Forbidden: Different campus' }, { status: 403 });
    }

    if (body.status) {
      const wasApproved = prayer.status === 'approved';
      prayer.status = body.status;

      if (body.status === 'approved' && !wasApproved) {
        await Notification.create({
          title: `New Prayer Request`,
          message: prayer.title,
          type: 'new_prayer',
          sourceId: prayer._id.toString(),
          targetCampuses: prayer.campusId ? [prayer.campusId] : ['all'],
          targetGroups: [],
        });

        await sendPushToTargeted({
          title: `New Prayer Request`,
          body: prayer.title,
          type: 'new_prayer'
        }, prayer.campusId ? [prayer.campusId] : ['all'], []);
      }
    }

    await prayer.save();
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
    if (!user || !['campus_leader', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prayer = await PrayerRequest.findById(id);

    if (!prayer) {
      return NextResponse.json({ error: 'Prayer request not found' }, { status: 404 });
    }

    if (user.role === 'campus_leader' && prayer.campusId !== user.campusId) {
      return NextResponse.json({ error: 'Forbidden: Different campus' }, { status: 403 });
    }

    await PrayerRequest.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prayer:', error);
    return NextResponse.json({ error: 'Failed to delete prayer' }, { status: 500 });
  }
}
