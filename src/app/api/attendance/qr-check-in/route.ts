import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AttendanceSession from '@/models/AttendanceSession';
import AttendanceRecord from '@/models/AttendanceRecord';
import User from '@/models/User';
import { verifySession } from '@/lib/auth-utils';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { sessionId, eventId } = body;

    if (!sessionId && !eventId) {
      return NextResponse.json({ error: 'Missing required fields (sessionId or eventId)' }, { status: 400 });
    }

    // Verify the session/event exists and is active
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    let startTime = '';
    let endTime = '';

    if (eventId) {
      const Event = mongoose.models.Event || mongoose.model('Event');
      const event = await Event.findById(eventId);
      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      if (event.attendanceConfig) {
        const [startH, startM] = event.time.split(':').map(Number);
        const openTime = new Date(now);
        openTime.setHours(startH, startM - (event.attendanceConfig.openMinutesBefore || 0), 0, 0);

        const [endH, endM] = event.endTime.split(':').map(Number);
        const closeTime = new Date(now);
        closeTime.setHours(endH, endM + (event.attendanceConfig.closeMinutesAfter || 0), 0, 0);

        startTime = `${String(openTime.getHours()).padStart(2, '0')}:${String(openTime.getMinutes()).padStart(2, '0')}`;
        endTime = `${String(closeTime.getHours()).padStart(2, '0')}:${String(closeTime.getMinutes()).padStart(2, '0')}`;
      }
    } else {
      const attSession = await AttendanceSession.findById(sessionId);
      if (!attSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      startTime = attSession.startTime;
      endTime = attSession.endTime;
    }

    // Check time window
    if (startTime && endTime) {
      if (currentTimeStr < startTime || currentTimeStr > endTime) {
        return NextResponse.json({
          error: 'Outside time window',
          message: 'This check-in window is currently closed.'
        }, { status: 400 });
      }
    }

    // Check for duplicate
    const query: any = eventId
      ? { eventId, userId: session.userId, date: todayStr }
      : { sessionId, userId: session.userId, date: todayStr };

    const existing = await AttendanceRecord.findOne(query);
    if (existing) {
      return NextResponse.json({
        error: 'Already checked in',
        message: 'You have already checked in today.'
      }, { status: 400 });
    }

    // Create attendance record
    const recordData: any = {
      userId: session.userId,
      distance: 0,
      date: todayStr,
      method: 'qr_self',
    };
    if (eventId) recordData.eventId = eventId;
    else recordData.sessionId = sessionId;

    const record = await AttendanceRecord.create(recordData);

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    console.error('Error in QR self check-in:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Already checked in', message: 'You have already checked in today.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
  }
}
