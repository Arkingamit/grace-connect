import { NextResponse } from 'next/server';
import { requireAdminWithScope, enforceCampusScope, enforceGroupScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import EventModel from '@/models/Event';
import { calculateNextOccurrence, generateOccurrences } from '@/lib/recurrence';
import { serverCache } from '@/lib/cache';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    // Enforce scope restrictions on update
    body.targetCampuses = enforceCampusScope(admin.role, admin.campusId, body.targetCampuses);
    body.targetGroups = enforceGroupScope(admin.role, admin.groups, body.targetGroups);

    const url = new URL(req.url);
    const updateSeries = url.searchParams.get('updateSeries') === 'true';

    if (updateSeries && body.seriesId) {
      // Find the event to get its date
      const originalEvent = await EventModel.findById(id);
      if (!originalEvent) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

      // Update the current event
      const event = await EventModel.findByIdAndUpdate(id, body, { new: true });
      
      // Delete all future occurrences in the series to regenerate them
      await EventModel.deleteMany({
        seriesId: body.seriesId,
        _id: { $ne: id },
        date: { $gt: originalEvent.date }
      });

      // Regenerate future occurrences
      const occurrences = generateOccurrences(
        event!.date,
        body.recurrenceEndDate,
        body.recurrencePattern || 'weekly',
        body.recurrenceDay,
        body.recurrenceWeekOfMonth,
        52
      );

      // Remove the first occurrence because we already updated the current event to be that one
      const futureDates = occurrences.filter(d => d > event!.date);

      if (futureDates.length > 0) {
        const eventsToCreate = futureDates.map(dateStr => ({
          ...body,
          _id: undefined, // let mongo generate new id
          id: undefined,
          date: dateStr,
          isSeriesTemplate: false,
        }));
        await EventModel.insertMany(eventsToCreate);
      }

      // Invalidate events cache
      serverCache.invalidate('events');

      return NextResponse.json(event);
    } else {
      const event = await EventModel.findByIdAndUpdate(id, body, { new: true });
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

      // Invalidate events cache
      serverCache.invalidate('events');

      return NextResponse.json(event);
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const { id } = await params;
    const url = new URL(req.url);
    const deleteSeries = url.searchParams.get('deleteSeries') === 'true';

    const event = await EventModel.findById(id);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    if (deleteSeries && event.seriesId) {
      await EventModel.deleteMany({
        seriesId: event.seriesId,
        date: { $gte: event.date }
      });
    } else {
      await EventModel.findByIdAndDelete(id);
    }
    
    // Invalidate events cache
    serverCache.invalidate('events');
    
    return NextResponse.json({ message: 'Event(s) deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
