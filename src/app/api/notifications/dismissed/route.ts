import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { verifySession } from '@/lib/auth-utils';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectToDatabase();
    const user = await User.findById(session.userId, { dismissedNotificationIds: 1 }).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({
      dismissedIds: (user as any).dismissedNotificationIds || [],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dismissed notifications' }, { status: 500 });
  }
}
