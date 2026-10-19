import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import User from '@/models/User';
import { getNotificationDeepLink } from '@/lib/notification-links';

async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');
    const { payload } = await jwtVerify(token, secret);
    // connectToDatabase already called by caller — no double-connect
    const user = await User.findById(payload.userId, {
      campusId: 1, groups: 1, role: 1, createdAt: 1,
    }).lean();
    if (!user) return null;
    return { ...user, tokenUserId: payload.userId as string };
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
    const currentUserId = (user as any)._id?.toString() || (user as any).tokenUserId || '';
    const userCampusId = (user as any).campusId || '';
    const userGroups: string[] = (user as any).groups || [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Resolve user registration date from createdAt or from ObjectId timestamp fallback
    let userCreatedAt: Date;
    if ((user as any).createdAt) {
      userCreatedAt = new Date((user as any).createdAt);
    } else if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      userCreatedAt = new mongoose.Types.ObjectId(currentUserId).getTimestamp();
    } else {
      userCreatedAt = thirtyDaysAgo;
    }
    
    // Only show notifications from the last 30 days OR since the user registered, whichever is more recent
    const cutoffDate = userCreatedAt > thirtyDaysAgo ? userCreatedAt : thirtyDaysAgo;

    // Push campus/group targeting and user scoping into MongoDB — returns only relevant notifications
    const notifications = await Notification.find({
      createdAt: { $gte: cutoffDate },
      // Must be broadcast (no userId or empty) OR directly addressed to this user
      $or: [
        { userId: { $in: ['', null] } },
        { userId: { $exists: false } },
        { userId: currentUserId },
      ],
      // Exclude notifications that explicitly exclude this campus
      excludeCampuses: { $nin: [userCampusId] },
      // Campus must be 'all' or the user's campus
      $and: [
        {
          $or: [
            { targetCampuses: 'all' },
            { targetCampuses: { $size: 0 } },
            { targetCampuses: userCampusId },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Group filtering still done in JS (MongoDB $in on arrays is less expressive for exclusions)
    const filtered = notifications.filter((n: any) => {
      // Direct user-specific notifications bypass group restrictions
      if (n.userId && n.userId === currentUserId) return true;

      const eg = n.excludeGroups || [];
      if (userGroups.some((g: string) => eg.includes(g))) return false;

      const groupMatch =
        !n.targetGroups?.length ||
        n.targetGroups.includes('all') ||
        n.targetGroups.some((g: string) => userGroups.includes(g));

      return groupMatch;
    });

    // Compute isRead per-user (direct notification vs broadcast notification)
    const mapped = filtered.map((n: any) => ({
      ...n,
      url: n.url || getNotificationDeepLink(n.type, n.sourceId),
      isRead: n.userId
        ? Boolean(n.isRead)
        : Boolean(n.isRead || (Array.isArray(n.readBy) && n.readBy.includes(currentUserId))),
    }));

    return NextResponse.json(mapped);
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
    const currentUserId = (user as any)._id?.toString() || (user as any).tokenUserId || '';
    const { ids } = await req.json();
    if (ids && ids.length) {
      // Direct notifications for this user
      await Notification.updateMany(
        { _id: { $in: ids }, userId: currentUserId },
        { isRead: true }
      );
      // Broadcast notifications: track user in readBy array
      await Notification.updateMany(
        {
          _id: { $in: ids },
          $or: [{ userId: '' }, { userId: { $exists: false } }, { userId: null }],
        },
        { $addToSet: { readBy: currentUserId } }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
