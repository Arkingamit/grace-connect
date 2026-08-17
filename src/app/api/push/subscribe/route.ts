import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import PushSubscriptionModel from '@/models/PushSubscription';
import { verifySession } from '@/lib/auth-utils';
import User from '@/models/User';

/**
 * POST /api/push/subscribe
 * Save a push subscription for the current authenticated user.
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subscription, platform = 'web', fcmToken } = body;

    if (platform === 'web' && (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth)) {
      return NextResponse.json({ error: 'Invalid web subscription object' }, { status: 400 });
    }
    if (platform !== 'web' && !fcmToken) {
      return NextResponse.json({ error: 'FCM token required for native platforms' }, { status: 400 });
    }

    // Get user's campus and groups for targeted push
    const user = await User.findById(session.userId, { campusId: 1, groups: 1 }).lean() as any;

    if (platform === 'web') {
      // Upsert: update if endpoint already exists, create otherwise
      await PushSubscriptionModel.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        {
          userId: session.userId,
          campusId: user?.campusId || '',
          groups: user?.groups || [],
          endpoint: subscription.endpoint,
          platform: 'web',
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
        { upsert: true, new: true }
      );
    } else {
      // Upsert native FCM token
      await PushSubscriptionModel.findOneAndUpdate(
        { fcmToken },
        {
          userId: session.userId,
          campusId: user?.campusId || '',
          groups: user?.groups || [],
          fcmToken,
          platform,
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe
 * Remove a push subscription (unsubscribe).
 */
export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { endpoint, fcmToken } = body;

    if (!endpoint && !fcmToken) {
      return NextResponse.json({ error: 'Endpoint or FCM token required' }, { status: 400 });
    }

    if (endpoint) {
      await PushSubscriptionModel.deleteOne({ endpoint });
    } else if (fcmToken) {
      await PushSubscriptionModel.deleteOne({ fcmToken });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}
