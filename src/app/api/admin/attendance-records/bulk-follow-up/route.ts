import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AttendanceRecord from '@/models/AttendanceRecord';
import AttendanceSession from '@/models/AttendanceSession';
import Notification from '@/models/Notification';
import { requireAdminWithScope } from '@/lib/api-auth';
import { sendPushToUsers } from '@/lib/push-utils';

export const dynamic = 'force-dynamic';

/**
 * Bulk follow-up: send one message to selected members and mark them absent.
 */
export async function POST(request: Request) {
  try {
    const adminUser = await requireAdminWithScope();

    if (!adminUser || !['campus_leader', 'admin', 'super_admin', 'group_leader'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const { sessionId, userIds, message } = await request.json();

    if (!sessionId || !message || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing sessionId, message, or userIds' },
        { status: 400 }
      );
    }

    const uniqueUserIds = Array.from(new Set(userIds.map(String).filter(Boolean)));
    if (uniqueUserIds.length === 0) {
      return NextResponse.json({ error: 'No members selected' }, { status: 400 });
    }

    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (
      adminUser.role === 'campus_leader' &&
      session.campusId !== adminUser.campusId &&
      session.campusId !== 'all'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const trimmedMessage = String(message).trim();
    if (!trimmedMessage) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // Mark all selected members as absent
    await Promise.all(
      uniqueUserIds.map((userId) =>
        AttendanceRecord.findOneAndUpdate(
          { sessionId, userId, date: session.date },
          {
            $set: {
              status: 'absent',
              method: 'manual',
              scannedBy: adminUser.userId,
            },
            $setOnInsert: { markedAt: new Date(), distance: 0 },
          },
          { upsert: true }
        )
      )
    );

    // Create in-app notifications for each member
    await Notification.insertMany(
      uniqueUserIds.map((userId) => ({
        userId,
        title: 'A message from your leader',
        message: trimmedMessage,
        type: 'system',
        isRead: false,
      }))
    );

    // Push once to all selected users
    await sendPushToUsers(
      {
        title: 'A message from your leader',
        body: trimmedMessage,
        url: '/attendance',
        type: 'system',
      },
      uniqueUserIds
    );

    return NextResponse.json({
      success: true,
      sent: uniqueUserIds.length,
      markedAbsent: uniqueUserIds.length,
    });
  } catch (error) {
    console.error('Error in bulk follow-up:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
