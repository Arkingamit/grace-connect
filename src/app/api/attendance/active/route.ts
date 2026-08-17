import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AttendanceSession from '@/models/AttendanceSession';
import User from '@/models/User';
import EventModel from '@/models/Event';
import { verifySession } from '@/lib/auth-utils';

import mongoose from 'mongoose';
import { generateOccurrences } from '@/lib/recurrence';

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const fetchAll = url.searchParams.get('all') === 'true';
    const forScanner = url.searchParams.get('forScanner') === 'true';

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    
    // Helper to check if a recurring document is active today
    const isRecurringActiveToday = (doc: any) => {
      if (!doc.recurring) return doc.date === todayStr;
      
      const endDate = doc.recurrenceEndDate || doc.endDate || null;
      if (endDate && endDate < todayStr) return false;
      
      if (doc.recurrencePattern === 'daily') return true;
      
      const occurrences = generateOccurrences(
        doc.date,
        endDate || todayStr,
        doc.recurrencePattern,
        doc.recurrenceDay,
        doc.recurrenceWeekOfMonth,
        52
      );
      
      return occurrences.includes(todayStr);
    };

    const leaderRoles = ['admin', 'super_admin', 'campus_leader', 'group_leader'];
    const isLeaderRole = leaderRoles.includes(user.role);
    const isElevated = ['admin', 'super_admin', 'campus_leader'].includes(user.role);
    const userIdStr = String(user._id);

    // 1. Find AttendanceSessions
    const sessionQuery: any = forScanner
      ? {
          $or: [
            { campusId: user.campusId },
            { campusId: 'all' },
            { targetCampuses: { $in: [user.campusId, 'all'] } },
            { assignedScannerIds: userIdStr },
          ],
        }
      : {
          $or: [{ campusId: user.campusId }, { campusId: 'all' }],
        };

    // If not fetching all, also filter by current time window
    if (!fetchAll) {
      sessionQuery.startTime = { $lte: currentTimeStr };
      sessionQuery.endTime = { $gte: currentTimeStr };
    }

    const sessionsRaw = await AttendanceSession.find(sessionQuery).lean();

    // If fetching all, return all sessions for the user's campus (for client-side caching)
    // If not, filter by today's recurrence
    let sessions = fetchAll
      ? sessionsRaw.filter((s: any) => {
          // Only exclude sessions that are definitively ended
          const endDate = s.recurrenceEndDate || null;
          if (!s.recurring && s.date < todayStr) return false;
          if (endDate && endDate < todayStr) return false;
          return true;
        })
      : sessionsRaw.filter(isRecurringActiveToday);

    if (forScanner) {
      sessions = sessions.filter((s: any) => {
        if (s.checkInConfig?.scannerEnabled === false) return false;
        const assigned: string[] = Array.isArray(s.assignedScannerIds)
          ? s.assignedScannerIds.map(String)
          : [];
        if (assigned.length > 0) {
          return assigned.includes(userIdStr) || isElevated;
        }
        return isLeaderRole;
      });
    }

    // 2. Find Events with attendance enabled
    const eventsRaw = await EventModel.find({
      'attendanceConfig.enabled': true,
      $or: [
        { targetCampuses: { $in: [user.campusId, 'all'] } },
        { targetCampuses: { $size: 0 } } // global if empty
      ]
    }).lean();
    
    const events = fetchAll
      ? eventsRaw
      : eventsRaw.filter(isRecurringActiveToday);

    if (fetchAll) {
      // Return full data for client-side caching
      const mappedSessions = sessions.map((s: any) => ({ ...s, type: 'session' }));
      const mappedEvents = events.map((ev: any) => ({
        _id: ev._id,
        title: ev.title,
        date: ev.date,
        startTime: ev.time,
        endTime: ev.endTime,
        latitude: ev.attendanceConfig?.latitude,
        longitude: ev.attendanceConfig?.longitude,
        radius: ev.attendanceConfig?.radius || 500,
        recurring: ev.isRecurring,
        recurrencePattern: ev.recurrencePattern,
        recurrenceDay: ev.recurrenceDay,
        recurrenceWeekOfMonth: ev.recurrenceWeekOfMonth,
        recurrenceEndDate: ev.recurrenceEndDate || ev.endDate,
        type: 'event'
      }));

      return NextResponse.json([...mappedSessions, ...mappedEvents]);
    }

    // Original behaviour: only return sessions active RIGHT NOW
    // We need to check if the event's time window matches
    const activeEvents = events.filter((ev: any) => {
      if (!ev.attendanceConfig) return false;
      
      // Calculate open/close time windows
      const [startH, startM] = ev.time.split(':').map(Number);
      const openTime = new Date(now);
      openTime.setHours(startH, startM - ev.attendanceConfig.openMinutesBefore, 0, 0);

      const [endH, endM] = ev.endTime.split(':').map(Number);
      const closeTime = new Date(now);
      closeTime.setHours(endH, endM + ev.attendanceConfig.closeMinutesAfter, 0, 0);

      return now >= openTime && now <= closeTime;
    }).map((ev: any) => ({
      _id: ev._id,
      title: ev.title,
      startTime: ev.time, // Using the event's base time for display
      endTime: ev.endTime,
      radius: ev.attendanceConfig.radius,
      latitude: ev.attendanceConfig.latitude,
      longitude: ev.attendanceConfig.longitude,
      type: 'event'
    }));

    const mappedSessions = sessions.map((s: any) => ({ ...s, type: 'session' }));

    return NextResponse.json([...mappedSessions, ...activeEvents]);
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
