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

    const { userId, message } = await request.json();

    if (!userId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const title = 'A special message for you! 🎁';

    // Insert Notification
    await Notification.create({
      userId,
      title,
      message,
      type: 'greeting',
      targetCampuses: [],
      targetGroups: [],
    });

    // Send push
    await sendPushToUsers(
      { title, body: message, type: 'greeting' },
      [userId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending custom greeting:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
