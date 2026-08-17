import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { sendPushToUsers } from '@/lib/push-utils';

// Force dynamic execution for cron
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max

export async function GET(request: Request) {
  // Optional: Protect cron route with a secret if configured
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // Get today's month and day (MM-DD)
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const suffix = `-${month}-${day}`;

    // Find users with birthday or anniversary today
    const users = await User.find({
      $or: [
        { birthday: { $regex: `${suffix}$` } },
        { marriageDate: { $regex: `${suffix}$` } },
      ],
      status: 'approved', // Only send to approved members
    });

    if (users.length === 0) {
      return NextResponse.json({ message: 'No birthdays or anniversaries today.' });
    }

    const notificationsToInsert: any[] = [];
    const pushPromises: Promise<void>[] = [];
    
    // Group users by campus for campus leader notifications
    const campusEvents: Record<string, { birthdays: string[]; anniversaries: string[] }> = {};

    for (const user of users) {
      const isBirthday = user.birthday?.endsWith(suffix);
      const isAnniversary = user.marriageDate?.endsWith(suffix);

      if (!campusEvents[user.campusId]) {
        campusEvents[user.campusId] = { birthdays: [], anniversaries: [] };
      }

      if (isBirthday) {
        campusEvents[user.campusId].birthdays.push(user.name);
        const title = 'Happy Birthday! 🎉';
        const message = `Happy Birthday, ${user.firstName}! Wishing you a wonderful day from Grace Church.`;
        
        notificationsToInsert.push({
          userId: user._id,
          title,
          message,
          type: 'greeting',
          targetCampuses: [],
          targetGroups: [],
        });

        pushPromises.push(
          sendPushToUsers(
            { title, body: message, type: 'greeting' },
            [user._id.toString()]
          )
        );
      }

      if (isAnniversary) {
        campusEvents[user.campusId].anniversaries.push(user.name);
        const title = 'Happy Anniversary! 💑';
        const message = `Happy Anniversary, ${user.firstName}! Wishing you and your spouse many more blessed years together.`;
        
        notificationsToInsert.push({
          userId: user._id,
          title,
          message,
          type: 'greeting',
          targetCampuses: [],
          targetGroups: [],
        });

        pushPromises.push(
          sendPushToUsers(
            { title, body: message, type: 'greeting' },
            [user._id.toString()]
          )
        );
      }
    }

    // Now send notifications to Campus Leaders
    for (const [campusId, events] of Object.entries(campusEvents)) {
      const totalEvents = events.birthdays.length + events.anniversaries.length;
      if (totalEvents === 0) continue;

      const leaders = await User.find({ campusId, role: 'campus_leader' });
      if (leaders.length === 0) continue;

      const leaderIds = leaders.map((l) => l._id.toString());
      const title = `Today's Special Occasions (${totalEvents})`;
      let message = `You have ${events.birthdays.length} birthday(s) and ${events.anniversaries.length} anniversary(s) today at your campus. Check the Greetings tab to send them a message!`;

      for (const leaderId of leaderIds) {
        notificationsToInsert.push({
          userId: leaderId,
          title,
          message,
          type: 'system',
          targetCampuses: [],
          targetGroups: [],
        });
      }

      pushPromises.push(
        sendPushToUsers(
          { title, body: message, type: 'system', url: '/admin/greetings' },
          leaderIds
        )
      );
    }

    // Save all in-app notifications
    if (notificationsToInsert.length > 0) {
      await Notification.insertMany(notificationsToInsert);
    }

    // Fire push notifications (non-blocking if we want, but wait to be safe)
    await Promise.allSettled(pushPromises);

    return NextResponse.json({
      message: `Processed ${users.length} users successfully.`,
      usersProcessed: users.length,
      notificationsGenerated: notificationsToInsert.length,
    });
  } catch (error: any) {
    console.error('Error in daily greetings cron:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
