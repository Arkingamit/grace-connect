import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import { verifySession } from '@/lib/auth-utils';
import User from '@/models/User';
import { getNotificationDeepLink } from '@/lib/notification-links';

async function getCurrentUser() {
  try {
    const session = await verifySession();
    if (!session.isAuth || !session.userId) return null;
    await connectToDatabase();
    const user = await User.findById(session.userId, {
      campusId: 1,
      groups: 1,
      role: 1,
      status: 1,
      createdAt: 1,
      dismissedNotificationIds: 1,
    }).lean();
    if (!user) return null;
    return { ...user, tokenUserId: session.userId };
  } catch {
    return null;
  }
}

/**
 * GET /api/notifications
 * Fetches notifications for the current user based on their campus and groups.
 * New registered users do not see notifications from before their registration date.
 * Dismissed notifications are marked as isRead.
 */
export async function GET() {
  await connectToDatabase();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const currentUserId = (user as any)._id?.toString() || (user as any).tokenUserId || '';
    const userStatus = (user as any).status || 'approved';

    // Pending or rejected members should not see broadcast or general notifications
    if (userStatus === 'pending' || userStatus === 'rejected') {
      return NextResponse.json([]);
    }

    const userCampusId = (user as any).campusId || '';
    const userGroups: string[] = (user as any).groups || [];

    // Resolve user registration date from createdAt or from ObjectId timestamp fallback
    let userCreatedAt: Date;
    if ((user as any).createdAt) {
      userCreatedAt = new Date((user as any).createdAt);
    } else if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      userCreatedAt = new mongoose.Types.ObjectId(currentUserId).getTimestamp();
    } else {
      userCreatedAt = new Date();
    }

    // New registered users should never see notifications created before their account was registered
    const cutoffDate = userCreatedAt;
    const userDismissed = new Set<string>((user as any).dismissedNotificationIds || []);

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

    // Compute isRead per-user (direct notification vs broadcast notification vs dismissed)
    const mapped = filtered.map((n: any) => {
      const nid = n._id?.toString();
      const isDismissed =
        userDismissed.has(nid) ||
        (n.sourceId && (
          userDismissed.has(n.sourceId) ||
          userDismissed.has(`ann-${n.sourceId}`) ||
          userDismissed.has(`worship-${n.sourceId}`) ||
          userDismissed.has(`prayer-${n.sourceId}`)
        ));

      return {
        ...n,
        url: n.url || getNotificationDeepLink(n.type, n.sourceId),
        isRead: Boolean(
          isDismissed ||
          (n.userId
            ? n.isRead
            : (n.isRead || (Array.isArray(n.readBy) && n.readBy.includes(currentUserId))))
        ),
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read / dismissed. Body: { ids: string[] }
 * Persists dismissed IDs directly to the User model so reinstalling the app
 * and signing in remembers that these notifications were cleared.
 */
export async function PATCH(req: Request) {
  await connectToDatabase();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const currentUserId = (user as any)._id?.toString() || (user as any).tokenUserId || '';
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length > 0) {
      // 1. Persist ALL dismissed IDs to the User document so that after app re-install and sign-in,
      // cleared notifications stay cleared.
      await User.updateOne(
        { _id: currentUserId },
        { $addToSet: { dismissedNotificationIds: { $each: ids } } }
      );

      // 2. Extract valid ObjectIds for updating the Notification collection
      const validObjectIds = ids
        .map((id) => {
          if (typeof id !== 'string') return null;
          if (mongoose.Types.ObjectId.isValid(id)) return id;
          const parts = id.split('-');
          const last = parts[parts.length - 1];
          if (last && mongoose.Types.ObjectId.isValid(last)) return last;
          return null;
        })
        .filter(Boolean) as string[];

      if (validObjectIds.length > 0) {
        // Direct notifications for this user
        await Notification.updateMany(
          { _id: { $in: validObjectIds }, userId: currentUserId },
          { isRead: true }
        );
        // Broadcast notifications: track user in readBy array
        await Notification.updateMany(
          {
            _id: { $in: validObjectIds },
            $or: [{ userId: '' }, { userId: { $exists: false } }, { userId: null }],
          },
          { $addToSet: { readBy: currentUserId } }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
