import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AttendanceSession from '@/models/AttendanceSession';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { verifySession } from '@/lib/auth-utils';
import { enforceCampusScope, enforceGroupScope } from '@/lib/api-auth';
import { sendPushToTargeted } from '@/lib/push-utils';

function deriveCampusId(targetCampuses: string[]): string {
  if (!targetCampuses?.length || targetCampuses.includes('all')) return 'all';
  if (targetCampuses.length === 1) return targetCampuses[0];
  return 'all';
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId);
    if (!user || !['campus_leader', 'admin', 'super_admin', 'group_leader'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const query: any = {};
    if (user.role === 'campus_leader' || (user.role === 'group_leader' && user.campusId !== 'global')) {
      // Campus leaders & FASL: sessions for their campus (legacy campusId or targeting)
      query.$or = [
        { campusId: user.campusId },
        { campusId: 'all' },
        { targetCampuses: { $in: [user.campusId, 'all'] } },
      ];
    }
    // Core Team Leader (global) and admins: all sessions

    const sessions = await AttendanceSession.find(query).sort({ date: -1, startTime: -1 }).lean();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching attendance sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    // Enforce audience scope (same as events / announcements)
    body.targetCampuses = enforceCampusScope(
      user.role,
      user.campusId,
      body.targetCampuses,
      user.permissions,
      'attendance'
    );
    body.targetGroups = enforceGroupScope(
      user.role,
      user.groups || [],
      body.targetGroups,
      user.permissions,
      'attendance'
    );
    body.excludeCampuses = Array.isArray(body.excludeCampuses) ? body.excludeCampuses : [];
    body.excludeGroups = Array.isArray(body.excludeGroups) ? body.excludeGroups : [];

    // Keep legacy campusId in sync for existing queries
    if (user.role === 'campus_leader') {
      body.campusId = user.campusId;
      body.targetCampuses = [user.campusId];
    } else {
      body.campusId = deriveCampusId(body.targetCampuses);
    }

    body.createdBy = session.userId;

    const newSession = await AttendanceSession.create(body);

    const targetCampuses = newSession.targetCampuses?.length ? newSession.targetCampuses : [newSession.campusId || 'all'];
    const targetGroups = newSession.targetGroups?.length ? newSession.targetGroups : ['all'];

    await Notification.create({
      title: `Attendance Session: ${newSession.title}`,
      message: `Check in opens ${newSession.date} · ${newSession.startTime}–${newSession.endTime}`,
      type: 'attendance',
      sourceId: newSession._id.toString(),
      targetCampuses,
      targetGroups,
    });

    await sendPushToTargeted(
      {
        title: `Attendance Session: ${newSession.title}`,
        body: `Check in opens ${newSession.date} · ${newSession.startTime}–${newSession.endTime}`,
        type: 'attendance',
      },
      targetCampuses,
      targetGroups
    );

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
