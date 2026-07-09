import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import { requireAdminWithScope } from '@/lib/api-auth';
import { sendPushToUsers } from '@/lib/push-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdminWithScope();
    
    if (!adminUser || !['campus_leader', 'admin', 'super_admin'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const { userId, message, sessionId, sessionTitle } = await request.json();

    if (!userId || !message) {
      return NextResponse.json({ error: 'Missing userId or message' }, { status: 400 });
    }

    // Save notification to database
    await Notification.create({
      userId,
      title: 'A message from your leader',
      message: message,
      type: 'system',
      isRead: false,
    });

    // Send Push Notification
    await sendPushToUsers(
      {
        title: 'A message from your leader',
        body: message,
        url: '/attendance',
        type: 'system',
      },
      [userId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending attendance message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
