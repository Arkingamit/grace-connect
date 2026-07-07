import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import User from '@/models/User';

async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');
    const { payload } = await jwtVerify(token, secret);
    // connectToDatabase already called by caller — no double-connect
    const user = await User.findById(payload.userId, {
      campusId: 1, groups: 1, role: 1,
    }).lean();
    return user;
  } catch {
    return null;
  }
}

/**
 * GET /api/notifications
 * Fetches notifications for the current user based on their campus and groups.
 * Filtering is pushed into MongoDB to reduce data transfer.
 */
export async function GET() {
  await connectToDatabase();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userCampusId = (user as any).campusId || '';
    const userGroups: string[] = (user as any).groups || [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Push campus/group targeting into MongoDB — returns only relevant notifications
    const notifications = await Notification.find({
      createdAt: { $gte: thirtyDaysAgo },
      // Exclude notifications that explicitly exclude this campus
      excludeCampuses: { $nin: [userCampusId] },
      // Campus must be 'all' or the user's campus
      $or: [
        { targetCampuses: 'all' },
        { targetCampuses: { $size: 0 } },
        { targetCampuses: userCampusId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Group filtering still done in JS (MongoDB $in on arrays is less expressive for exclusions)
    const filtered = notifications.filter((n: any) => {
      const eg = n.excludeGroups || [];
      if (userGroups.some((g: string) => eg.includes(g))) return false;

      const groupMatch =
        !n.targetGroups?.length ||
        n.targetGroups.includes('all') ||
        n.targetGroups.some((g: string) => userGroups.includes(g));

      return groupMatch;
    });

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read. Body: { ids: string[] }
 */
export async function PATCH(req: Request) {
  await connectToDatabase();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { ids } = await req.json();
    if (ids && ids.length) {
      await Notification.updateMany(
        { _id: { $in: ids } },
        { isRead: true }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
