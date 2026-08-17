import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Announcement from '@/models/Announcement';
import EventModel from '@/models/Event';
import Notification from '@/models/Notification';
import { calculateNextOccurrence, isTodayMatchingSchedule } from '@/lib/recurrence';

/**
 * POST /api/cron/recurring-announcements
 *
 * Called once daily. Processes all recurring announcements and events,
 * then writes notifications in a SINGLE insertMany and updates via bulkWrite
 * instead of N sequential awaits (was O(N×M) DB round-trips, now O(1)).
 *
 * Security: Protected by CRON_SECRET env variable.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const today = new Date().toISOString().split('T')[0];

    // ── Fetch all needed records in parallel ──────────────────────────────
    const [recurringAnnouncements, scheduledAnnouncements, futureEventsWithReminders] =
      await Promise.all([
        Announcement.find({
          isRecurring: true,
          $or: [
            { recurrenceEndDate: { $exists: false } },
            { recurrenceEndDate: '' },
            { recurrenceEndDate: { $gte: today } },
          ],
        }).lean(),
        Announcement.find({ isRecurring: false, reminderDate: today }).lean(),
        EventModel.find({
          date: { $gte: today },
          $or: [
            { customReminders: { $exists: true, $not: { $size: 0 } } },
            { reminders: { $exists: true, $not: { $size: 0 } } },
          ],
        }).lean(),
      ]);

    // Batch collectors — avoid sequential awaits inside loops
    const notificationsToCreate: any[] = [];
    const announcementBulkOps: any[] = [];
    const eventBulkOps: any[] = [];

    let triggered = 0;
    let skipped = 0;

    // ── Process Recurring Announcements ───────────────────────────────────
    for (const announcement of recurringAnnouncements) {
      let triggeredKeys: string[] = announcement.lastTriggered
        ? (announcement.lastTriggered as string).split(',')
        : [];
      let didTriggerAnything = false;

      const nextOccurrenceDateStr =
        (announcement.nextOccurrence as string) ||
        calculateNextOccurrence(
          (announcement.recurrencePattern as string) || 'weekly',
          announcement.recurrenceDay as string | undefined,
          today,
          announcement.recurrenceEndDate as string | undefined
        );

      if (!nextOccurrenceDateStr) { skipped++; continue; }

      const targetTime = (announcement.reminderTime as string) || '09:00';
      const targetDateTime = new Date(`${nextOccurrenceDateStr}T${targetTime}:00`);
      const now = new Date();

      // Custom reminder keys
      if (announcement.customReminders && (announcement.customReminders as any[]).length > 0) {
        for (const rem of announcement.customReminders as any[]) {
          if (typeof rem.daysBefore !== 'number') continue;
          const key = `custom_rem_${rem.daysBefore}d_${rem.hoursBefore}h_${rem.minutesBefore}m_${(announcement as any)._id}_${nextOccurrenceDateStr}`;
          const offsetMs =
            rem.daysBefore * 86400000 + rem.hoursBefore * 3600000 + rem.minutesBefore * 60000;
          const reminderDateTime = new Date(targetDateTime.getTime() - offsetMs);

          if (now >= reminderDateTime && now <= targetDateTime && !triggeredKeys.includes(key)) {
            notificationsToCreate.push({
              title: `📢 Reminder: ${announcement.title}`,
              message: announcement.content,
              type: 'recurring_announcement',
              sourceId: (announcement as any)._id.toString(),
              targetCampuses: (announcement as any).targetCampuses || ['all'],
              targetGroups: (announcement as any).targetGroups || ['all'],
              excludeCampuses: (announcement as any).excludeCampuses || [],
              excludeGroups: (announcement as any).excludeGroups || [],
            });
            triggeredKeys.push(key);
            didTriggerAnything = true;
            triggered++;
          }
        }
      }

      // Actual push key
      const actualPushKey = `actual_push_${nextOccurrenceDateStr}_${(announcement as any)._id}`;
      if (triggeredKeys.includes(today)) triggeredKeys.push(actualPushKey);

      const shouldPushActual = (announcement as any).reminderTime
        ? now >= targetDateTime
        : isTodayMatchingSchedule(announcement as any);

      if (shouldPushActual && !triggeredKeys.includes(actualPushKey)) {
        notificationsToCreate.push({
          title: `📢 ${announcement.title}`,
          message: announcement.content,
          type: 'recurring_announcement',
          sourceId: (announcement as any)._id.toString(),
          targetCampuses: (announcement as any).targetCampuses || ['all'],
          targetGroups: (announcement as any).targetGroups || ['all'],
          excludeCampuses: (announcement as any).excludeCampuses || [],
          excludeGroups: (announcement as any).excludeGroups || [],
        });
        triggeredKeys.push(actualPushKey);
        didTriggerAnything = true;
        triggered++;
      }

      if (didTriggerAnything) {
        announcementBulkOps.push({
          updateOne: {
            filter: { _id: (announcement as any)._id },
            update: {
              $set: {
                lastTriggered: triggeredKeys.join(','),
                nextOccurrence: nextOccurrenceDateStr,
              },
            },
          },
        });
      } else {
        skipped++;
      }
    }

    // ── Process Scheduled (One-time) Announcements ────────────────────────
    for (const announcement of scheduledAnnouncements) {
      if (!(announcement as any).reminderTime) continue;
      const scheduledKey = `scheduled_${(announcement as any).reminderDate}_${(announcement as any).reminderTime}_${(announcement as any)._id}`;
      if ((announcement as any).lastTriggered === scheduledKey) continue;

      const scheduledDateTime = new Date(
        `${(announcement as any).reminderDate}T${(announcement as any).reminderTime}:00`
      );

      if (new Date() >= scheduledDateTime) {
        notificationsToCreate.push({
          title: `📢 ${announcement.title}`,
          message: announcement.content,
          type: 'recurring_announcement',
          sourceId: (announcement as any)._id.toString(),
          targetCampuses: (announcement as any).targetCampuses || ['all'],
          targetGroups: (announcement as any).targetGroups || ['all'],
          excludeCampuses: (announcement as any).excludeCampuses || [],
          excludeGroups: (announcement as any).excludeGroups || [],
        });
        announcementBulkOps.push({
          updateOne: {
            filter: { _id: (announcement as any)._id },
            update: { $set: { lastTriggered: scheduledKey } },
          },
        });
        triggered++;
      }
    }

    // ── Process Event Reminders ────────────────────────────────────────────
    for (const event of futureEventsWithReminders) {
      const eventDate = new Date((event as any).date);
      const todayDate = new Date(today);
      const diffDays = Math.ceil((eventDate.getTime() - todayDate.getTime()) / 86400000);

      let triggeredKeys: string[] = (event as any).lastTriggered
        ? (event as any).lastTriggered.split(',')
        : [];
      let changed = false;

      // Legacy reminders
      if ((event as any).reminders?.length) {
        const legacyReminderKey = `rem_${diffDays}_${today}`;
        const shouldTrigger =
          (diffDays === 0 && (event as any).reminders.includes('0_days')) ||
          (diffDays === 1 && (event as any).reminders.includes('1_days')) ||
          (diffDays === 3 && (event as any).reminders.includes('3_days')) ||
          (diffDays === 7 && (event as any).reminders.includes('7_days'));

        if (shouldTrigger && !triggeredKeys.includes(legacyReminderKey)) {
          notificationsToCreate.push({
            title: `📅 Reminder: ${(event as any).title}`,
            message:
              diffDays === 0
                ? `Starts today at ${(event as any).time}!`
                : `Starts in ${diffDays} day(s)! ${(event as any).description || ''}`,
            type: 'event_reminder',
            sourceId: (event as any)._id.toString(),
            targetCampuses: (event as any).targetCampuses || ['all'],
            targetGroups: (event as any).targetGroups || ['all'],
            excludeCampuses: (event as any).excludeCampuses || [],
            excludeGroups: (event as any).excludeGroups || [],
          });
          triggeredKeys.push(legacyReminderKey);
          triggered++;
          changed = true;
        }
      }

      // New custom reminders
      if ((event as any).customReminders?.length) {
        const eventDateTime = new Date(`${(event as any).date}T${(event as any).time || '00:00'}:00`);
        const now = new Date();
        for (const rem of (event as any).customReminders) {
          if (typeof rem.daysBefore !== 'number') continue;
          const key = `custom_rem_${rem.daysBefore}d_${rem.hoursBefore}h_${rem.minutesBefore}m_${(event as any)._id}`;
          const offsetMs =
            rem.daysBefore * 86400000 + rem.hoursBefore * 3600000 + rem.minutesBefore * 60000;
          const reminderDateTime = new Date(eventDateTime.getTime() - offsetMs);

          if (now >= reminderDateTime && now <= eventDateTime && !triggeredKeys.includes(key)) {
            notificationsToCreate.push({
              title: `📅 Reminder: ${(event as any).title}`,
              message: `Starts soon at ${(event as any).time}! ${(event as any).description || ''}`,
              type: 'event_reminder',
              sourceId: (event as any)._id.toString(),
              targetCampuses: (event as any).targetCampuses || ['all'],
              targetGroups: (event as any).targetGroups || ['all'],
              excludeCampuses: (event as any).excludeCampuses || [],
              excludeGroups: (event as any).excludeGroups || [],
            });
            triggeredKeys.push(key);
            triggered++;
            changed = true;
          }
        }
      }

      if (changed) {
        eventBulkOps.push({
          updateOne: {
            filter: { _id: (event as any)._id },
            update: { $set: { lastTriggered: triggeredKeys.join(',') } },
          },
        });
      } else {
        skipped++;
      }
    }

    // ── Batch write everything — O(1) DB operations ───────────────────────
    await Promise.all([
      notificationsToCreate.length > 0
        ? Notification.insertMany(notificationsToCreate, { ordered: false })
        : Promise.resolve(),
      announcementBulkOps.length > 0
        ? Announcement.bulkWrite(announcementBulkOps, { ordered: false })
        : Promise.resolve(),
      eventBulkOps.length > 0
        ? EventModel.bulkWrite(eventBulkOps, { ordered: false })
        : Promise.resolve(),
    ]);

    return NextResponse.json({
      success: true,
      date: today,
      processed: recurringAnnouncements.length + futureEventsWithReminders.length,
      triggered,
      skipped,
      notificationsCreated: notificationsToCreate.length,
    });
  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Failed to process recurring tasks' }, { status: 500 });
  }
}

// Also allow GET for easy testing / manual trigger
export async function GET(req: Request) {
  return POST(req);
}
