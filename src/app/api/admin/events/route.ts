import { NextResponse } from 'next/server';
import { requireAdminWithScope, requireAuth, enforceCampusScope, enforceGroupScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import EventModel from '@/models/Event';
import { eventSchema } from '@/lib/validations';
import { generateOccurrences } from '@/lib/recurrence';
import mongoose from 'mongoose';
import Notification from '@/models/Notification';
import { sendPushToTargeted } from '@/lib/push-utils';
import { serverCache, CACHE_TTL } from '@/lib/cache';

import AttendanceRecord from '@/models/AttendanceRecord';

// Projection for list view — omits heavy nested arrays (formFields, schedule)
// that are only needed when editing a specific event. Reduces payload ~40-70%.
const LIST_PROJECTION = {
  title: 1, date: 1, time: 1, endTime: 1, location: 1, category: 1,
  capacity: 1, registered: 1, image: 1, recurring: 1, seriesId: 1,
  isSeriesTemplate: 1, recurrencePattern: 1, recurrenceDay: 1,
  recurrenceEndDate: 1, recurrenceNote: 1, recurrenceWeekOfMonth: 1,
  nextOccurrence: 1, lastTriggered: 1, mapUrl: 1, host: 1,
  targetCampuses: 1, targetGroups: 1, excludeCampuses: 1, excludeGroups: 1,
  googlePhotosUrl: 1, isMultiDay: 1, endDate: 1, description: 1,
  customReminders: 1, reminders: 1, attendanceConfig: 1, createdAt: 1,
  formFields: 1, allowResponseEdits: 1,
};

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Check in-memory cache first
    const cached = serverCache.get('events');
    if (cached) return NextResponse.json(cached);

    await connectToDatabase();
    // .lean() returns plain JS objects — 30-50% faster than full Mongoose documents
    const events = await EventModel.find({}, LIST_PROJECTION).sort({ date: 1, time: 1 }).lean();
    
    // Group attendance counts by eventId
    const attendanceCounts = await AttendanceRecord.aggregate([
      { $match: { eventId: { $exists: true, $ne: null } } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } }
    ]);
    
    const attendanceMap = new Map(attendanceCounts.map(a => [a._id.toString(), a.count]));

    const eventsWithAttendance = events.map(ev => ({
      ...ev,
      attended: attendanceMap.get(ev._id.toString()) || 0
    }));

    // Cache for 1 minute
    serverCache.set('events', eventsWithAttendance, CACHE_TTL.EVENTS);

    return NextResponse.json(eventsWithAttendance);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const body = await req.json();
    const parseResult = eventSchema.safeParse(body);
    if (!parseResult.success) {
      console.error('Event Validation Error:', parseResult.error.errors);
      return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
    }

    const eventData = parseResult.data as any;

    // Enforce scope restrictions
    eventData.targetCampuses = enforceCampusScope(admin.role, admin.campusId, eventData.targetCampuses, admin.permissions, 'events');
    eventData.targetGroups = enforceGroupScope(admin.role, admin.groups, eventData.targetGroups, admin.permissions, 'events');

    if (eventData.recurring) {
      // Ahead-of-time duplication
      const seriesId = new mongoose.Types.ObjectId().toString();

      const occurrences = generateOccurrences(
        eventData.date || new Date().toISOString().split('T')[0],
        eventData.recurrenceEndDate,
        eventData.recurrencePattern || 'weekly',
        eventData.recurrenceDay,
        eventData.recurrenceWeekOfMonth,
        52 // max 1 year of occurrences at a time
      );

      if (occurrences.length === 0) {
        return NextResponse.json({ error: 'No valid occurrences found for this pattern' }, { status: 400 });
      }

      const eventsToCreate = occurrences.map((dateStr, index) => ({
        ...eventData,
        date: dateStr,
        seriesId,
        isSeriesTemplate: index === 0,
        recurring: true,
      }));

      const createdEvents = await EventModel.insertMany(eventsToCreate);
      await Notification.create({
        title: `New Event: ${eventData.title}`,
        message: `A new event series has been scheduled. Check it out!`,
        type: 'new_event',
        sourceId: createdEvents[0]._id.toString(),
        targetCampuses: eventData.targetCampuses || ['all'],
        targetGroups: eventData.targetGroups || [],
      });
      await sendPushToTargeted({
        title: `New Event: ${eventData.title}`,
        body: `A new event series has been scheduled. Check it out!`,
        type: 'new_event'
      }, eventData.targetCampuses || ['all'], eventData.targetGroups || []);

      // Invalidate events cache
      serverCache.invalidate('events');

      return NextResponse.json(createdEvents[0], { status: 201 });
    } else {
      const event = await EventModel.create(eventData);
      await Notification.create({
        title: `New Event: ${event.title}`,
        message: `A new event has been scheduled. Check it out!`,
        type: 'new_event',
        sourceId: event._id.toString(),
        targetCampuses: event.targetCampuses || ['all'],
        targetGroups: event.targetGroups || [],
      });
      await sendPushToTargeted({
        title: `New Event: ${event.title}`,
        body: `A new event has been scheduled. Check it out!`,
        type: 'new_event'
      }, event.targetCampuses || ['all'], event.targetGroups || []);

      // Invalidate events cache
      serverCache.invalidate('events');

      return NextResponse.json(event, { status: 201 });
    }
  } catch (error: any) {
    console.error('Event Creation 500 Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create event' }, { status: 500 });
  }
}
