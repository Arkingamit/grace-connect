import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AttendanceSession from '@/models/AttendanceSession';
import AttendanceRecord from '@/models/AttendanceRecord';
import User from '@/models/User';
import { verifySession } from '@/lib/auth-utils';
import { getDistanceFromLatLonInMeters } from '@/lib/geo-utils';
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
    const { id, type, latitude, longitude } = body;

    // Fallback to sessionId for backwards compatibility if needed
    const actualId = id || body.sessionId;
    const actualType = type || 'session';

    if (!actualId || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let attTarget: any = null;
    let radius = 500;
    let targetLat = 0;
    let targetLon = 0;
    let startTime = '';
    let endTime = '';

    if (actualType === 'event') {
      const Event = mongoose.models.Event || mongoose.model('Event');
      attTarget = await Event.findById(actualId);
      if (attTarget && attTarget.attendanceConfig) {
        radius = attTarget.attendanceConfig.radius;
        targetLat = attTarget.attendanceConfig.latitude;
        targetLon = attTarget.attendanceConfig.longitude;
        
        // Compute time strings for event
        const now = new Date();
        const [startH, startM] = attTarget.time.split(':').map(Number);
        const openTime = new Date(now);
        openTime.setHours(startH, startM - attTarget.attendanceConfig.openMinutesBefore, 0, 0);

        const [endH, endM] = attTarget.endTime.split(':').map(Number);
        const closeTime = new Date(now);
        closeTime.setHours(endH, endM + attTarget.attendanceConfig.closeMinutesAfter, 0, 0);

        startTime = `${String(openTime.getHours()).padStart(2, '0')}:${String(openTime.getMinutes()).padStart(2, '0')}`;
        endTime = `${String(closeTime.getHours()).padStart(2, '0')}:${String(closeTime.getMinutes()).padStart(2, '0')}`;
      }
    } else {
      attTarget = await AttendanceSession.findById(actualId);
      if (attTarget) {
        radius = attTarget.radius;
        targetLat = attTarget.latitude;
        targetLon = attTarget.longitude;
        startTime = attTarget.startTime;
        endTime = attTarget.endTime;
      }
    }

    if (!attTarget) {
      return NextResponse.json({ error: 'Session/Event not found' }, { status: 404 });
    }

    const selfCheckInEnabled = actualType === 'session' ? (attTarget.checkInConfig?.selfCheckInEnabled ?? true) : true;
    const selfCheckInRequireGps = actualType === 'session' ? (attTarget.checkInConfig?.selfCheckInRequireGps ?? true) : true;

    if (!selfCheckInEnabled) {
      return NextResponse.json({ 
        error: 'Not allowed', 
        message: 'Self check-in is not enabled for this session. Please see a leader.' 
      }, { status: 403 });
    }

    // Verify time window
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    if (currentTimeStr < startTime || currentTimeStr > endTime) {
      return NextResponse.json({ 
        error: 'Outside time window', 
        message: 'This check-in window is currently closed.' 
      }, { status: 400 });
    }

    // Calculate distance using Haversine formula
    let distance = 0;
    
    if (selfCheckInRequireGps) {
      if (latitude === 0 && longitude === 0) {
        return NextResponse.json({ 
          error: 'GPS required', 
          message: 'GPS location is required to check in to this session.' 
        }, { status: 400 });
      }

      distance = getDistanceFromLatLonInMeters(
        latitude, 
        longitude, 
        targetLat, 
        targetLon
      );

      if (distance > radius) {
        return NextResponse.json({ 
          error: 'Out of range', 
          message: `You are too far away. Distance: ${Math.round(distance)}m. Max allowed: ${radius}m.` 
        }, { status: 400 });
      }
    }

    // Today's date string for per-day duplicate check (supports recurring sessions)
    const todayStr = now.toISOString().split('T')[0];

    // Check if already checked in for THIS date
    const query: any = actualType === 'event' 
      ? { eventId: actualId, userId: session.userId, date: todayStr }
      : { sessionId: actualId, userId: session.userId, date: todayStr };
      
    const existing = await AttendanceRecord.findOne(query);
    if (existing) {
      return NextResponse.json({ 
        error: 'Already checked in', 
        message: 'You have already checked in for this session today.' 
      }, { status: 400 });
    }

    const recordData: any = {
      userId: session.userId,
      distance: Math.round(distance),
      date: todayStr,
    };
    if (actualType === 'event') recordData.eventId = actualId;
    else recordData.sessionId = actualId;

    const record = await AttendanceRecord.create(recordData);

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    console.error('Error checking in:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Already checked in', message: 'You have already checked in today.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
  }
}
