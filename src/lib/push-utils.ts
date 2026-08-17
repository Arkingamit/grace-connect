import webpush from 'web-push';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import connectToDatabase from '@/lib/db';
import PushSubscriptionModel from '@/models/PushSubscription';

// Configure VAPID once at module level
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:graceconnect@church.org',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// Initialize Firebase Admin (for native FCM) if configured
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;

if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY && getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // handle newlines in env
    }),
  });
}

interface PushPayload {
  title: string;
  body: string;
  type?: string;
  url?: string;
  tag?: string;
}

/**
 * Send push notifications to all subscriptions matching the given
 * campus/group targeting. Failed/expired subscriptions are cleaned up
 * automatically.
 */
export async function sendPushToTargeted(
  payload: PushPayload,
  targetCampuses: string[] = ['all'],
  targetGroups: string[] = []
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[push] VAPID keys not configured — skipping push');
    return;
  }

  try {
    await connectToDatabase();

    // Build a query that matches subscriptions belonging to the targeted audience
    const query: any = {};

    // Campus targeting: match 'all' OR the specific campus
    if (!targetCampuses.includes('all') && targetCampuses.length > 0) {
      query.$or = [
        { campusId: { $in: targetCampuses } },
        { campusId: '' }, // users without a campus set
      ];
    }

    // Group targeting (only if specific groups are targeted)
    if (targetGroups.length > 0 && !targetGroups.includes('all')) {
      // Must be in at least one targeted group
      query.groups = { $in: targetGroups };
    }

    const subscriptions = await PushSubscriptionModel.find(query).lean();

    if (subscriptions.length === 0) return;

    const payloadStr = JSON.stringify(payload);
    const expiredWebEndpoints: string[] = [];
    const expiredFcmTokens: string[] = [];

    // Fan-out: send to all matching subscriptions in parallel
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          if (sub.platform === 'web' && sub.endpoint && sub.keys) {
            // Web Push
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.keys.p256dh,
                  auth: sub.keys.auth,
                },
              },
              payloadStr,
              { TTL: 60 * 60 } // 1-hour TTL
            );
          } else if ((sub.platform === 'android' || sub.platform === 'ios') && sub.fcmToken) {
            // Native FCM
            if (getApps().length === 0) return; // Skip if FCM not configured

            await getMessaging().send({
              token: sub.fcmToken,
              notification: {
                title: payload.title,
                body: payload.body,
              },
              data: {
                type: payload.type || 'system',
                url: payload.url || '',
                tag: payload.tag || '',
              },
            });
          }
        } catch (err: any) {
          // Web Push expiration
          if (sub.platform === 'web' && (err.statusCode === 404 || err.statusCode === 410)) {
            expiredWebEndpoints.push(sub.endpoint!);
          }
          // FCM expiration
          else if (
            err.code === 'messaging/invalid-registration-token' ||
            err.code === 'messaging/registration-token-not-registered'
          ) {
            expiredFcmTokens.push(sub.fcmToken!);
          }
        }
      })
    );

    // Clean up expired subscriptions
    if (expiredWebEndpoints.length > 0) {
      await PushSubscriptionModel.deleteMany({
        endpoint: { $in: expiredWebEndpoints },
      });
    }
    if (expiredFcmTokens.length > 0) {
      await PushSubscriptionModel.deleteMany({
        fcmToken: { $in: expiredFcmTokens },
      });
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (sent > 0 || failed > 0) {
      console.log(`[push] Sent ${sent}, failed ${failed}, cleaned ${expiredWebEndpoints.length + expiredFcmTokens.length}`);
    }
  } catch (error) {
    console.error('[push] Error sending push notifications:', error);
  }
}

/**
 * Send push notifications to specific user IDs.
 */
export async function sendPushToUsers(
  payload: PushPayload,
  userIds: string[]
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[push] VAPID keys not configured — skipping push');
    return;
  }

  if (userIds.length === 0) return;

  try {
    await connectToDatabase();

    const subscriptions = await PushSubscriptionModel.find({
      userId: { $in: userIds },
    }).lean();

    if (subscriptions.length === 0) return;

    const payloadStr = JSON.stringify(payload);
    const expiredWebEndpoints: string[] = [];
    const expiredFcmTokens: string[] = [];

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          if (sub.platform === 'web' && sub.endpoint && sub.keys) {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.keys.p256dh,
                  auth: sub.keys.auth,
                },
              },
              payloadStr,
              { TTL: 60 * 60 }
            );
          } else if ((sub.platform === 'android' || sub.platform === 'ios') && sub.fcmToken) {
            if (getApps().length === 0) return;

            await getMessaging().send({
              token: sub.fcmToken,
              notification: {
                title: payload.title,
                body: payload.body,
              },
              data: {
                type: payload.type || 'system',
                url: payload.url || '',
                tag: payload.tag || '',
              },
            });
          }
        } catch (err: any) {
          if (sub.platform === 'web' && (err.statusCode === 404 || err.statusCode === 410)) {
            expiredWebEndpoints.push(sub.endpoint!);
          } else if (
            err.code === 'messaging/invalid-registration-token' ||
            err.code === 'messaging/registration-token-not-registered'
          ) {
            expiredFcmTokens.push(sub.fcmToken!);
          }
        }
      })
    );

    if (expiredWebEndpoints.length > 0) {
      await PushSubscriptionModel.deleteMany({ endpoint: { $in: expiredWebEndpoints } });
    }
    if (expiredFcmTokens.length > 0) {
      await PushSubscriptionModel.deleteMany({ fcmToken: { $in: expiredFcmTokens } });
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (sent > 0 || failed > 0) {
      console.log(`[push] Users Push: Sent ${sent}, failed ${failed}, cleaned ${expiredWebEndpoints.length + expiredFcmTokens.length}`);
    }
  } catch (error) {
    console.error('[push] Error sending push to users:', error);
  }
}
