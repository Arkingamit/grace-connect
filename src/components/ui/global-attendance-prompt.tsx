"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

/**
 * Haversine distance calculation (client-side mirror of geo-utils.ts)
 */
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if today matches the session's recurrence schedule (client-side).
 */
function isSessionActiveToday(session: any): boolean {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Check if past end date
  if (session.recurrenceEndDate && session.recurrenceEndDate < todayStr) return false;

  // Non-recurring: just match date
  if (!session.recurring) return session.date === todayStr;

  // The start date must be <= today
  if (session.date > todayStr) return false;

  const pattern = session.recurrencePattern;
  if (pattern === 'daily') return true;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = dayNames[now.getDay()];

  if (pattern === 'weekly' || pattern === 'biweekly') {
    if (session.recurrenceDay && todayDayName !== session.recurrenceDay) return false;

    if (pattern === 'biweekly') {
      // Check if the week count from start date is even
      const startDate = new Date(session.date + 'T00:00:00');
      const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);
      if (diffWeeks % 2 !== 0) return false;
    }
    return true;
  }

  if (pattern === 'monthly') {
    const startDate = new Date(session.date + 'T00:00:00');
    return now.getDate() === startDate.getDate();
  }

  if (pattern === 'custom_monthly') {
    if (session.recurrenceDay && todayDayName !== session.recurrenceDay) return false;

    const weekOfMonth = session.recurrenceWeekOfMonth;
    const dayOfMonth = now.getDate();
    const weekNum = Math.ceil(dayOfMonth / 7);

    if (weekOfMonth === 'last') {
      // Check if there's no more of this day-of-week in this month
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      return nextWeek.getMonth() !== now.getMonth();
    }

    const weekMap: Record<string, number> = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 };
    return weekNum === (weekMap[weekOfMonth] || 1);
  }

  return false;
}

/**
 * Check if current time is within the session's time window.
 */
function isWithinTimeWindow(startTime: string, endTime: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  
  return currentMinutes >= (sh * 60 + sm) && currentMinutes <= (eh * 60 + em);
}

const CACHE_KEY = 'attendanceSessions';
const CHECKED_KEY = 'attendanceCheckedDates';

/**
 * Send a browser push notification to remind the user to check in.
 */
function sendAttendanceNotification(session: any) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  const title = `Time to Check In: ${session.title || 'Church Service'}`;
  const options = {
    body: 'Please tap here to turn on GPS and mark your attendance.',
    icon: '/favicon.ico',
    tag: `attendance-${session._id}`
  };
  
  const notification = new Notification(title, options);
  notification.onclick = () => {
    window.focus();
    // In a real app we might route them to a specific check-in screen,
    // but focusing the window gives them the chance to use the quick action button.
    notification.close();
  };
}

/**
 * GlobalAttendancePrompt — completely invisible.
 * 
 * Flow:
 * 1. On first load, fetches all sessions from the server and caches them in localStorage.
 * 2. On every subsequent page load, reads from localStorage.
 * 3. Checks client-side if today matches any session's recurring schedule AND current time is within window.
 * 4. If yes, silently requests GPS. If user is within the geofence radius, sends check-in to server.
 * 5. Refreshes the cache from the server every 6 hours.
 */
export function GlobalAttendancePrompt() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.includes('/admin')) return;

    const run = async () => {
      try {
        // --- Step 1: Always fetch fresh sessions from server and cache locally ---
        let sessions: any[] = [];
        try {
          const res = await fetch('/api/attendance/active?all=true');
          if (res.ok) {
            const serverData = await res.json();
            if (Array.isArray(serverData)) {
              sessions = serverData;
              localStorage.setItem(CACHE_KEY, JSON.stringify({
                sessions,
                fetchedAt: Date.now()
              }));
            }
          }
        } catch {
          // If server unreachable, fall back to cached data
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            try {
              sessions = JSON.parse(cached).sessions || [];
            } catch { /* ignore corrupt cache */ }
          }
        }

        if (sessions.length === 0) return;

        // --- Step 2: Check if any session is active right now (client-side) ---
        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const checkedDates: Record<string, string> = JSON.parse(localStorage.getItem(CHECKED_KEY) || '{}');

        // Clean old entries (keep last 30 days only)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        for (const key of Object.keys(checkedDates)) {
          const dateStr = key.split('::')[1];
          if (dateStr && dateStr < `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`) {
            delete checkedDates[key];
          }
        }

        const eligibleSession = sessions.find(s => {
          const checkKey = `${s._id}::${todayKey}`;
          if (checkedDates[checkKey]) return false; // Already processed today

          // Check recurrence match
          if (!isSessionActiveToday(s)) return false;

          // Check time window
          const startTime = s.startTime || s.time;
          const endTime = s.endTime;
          if (!startTime || !endTime) return false;

          // Check if self check-in is allowed
          if (s.type === 'session' && s.checkInConfig?.selfCheckInEnabled === false) return false;

          return isWithinTimeWindow(startTime, endTime);
        });

        if (!eligibleSession) return;

        // If GPS is not required, check in immediately
        const requireGps = eligibleSession.type === 'session' ? (eligibleSession.checkInConfig?.selfCheckInRequireGps ?? true) : true;
        if (!requireGps) {
          try {
            const res = await fetch('/api/attendance/check-in', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: eligibleSession._id,
                type: eligibleSession.type || 'session',
                latitude: 0,
                longitude: 0
              })
            });

            if (res.ok) {
              checkedDates[`${eligibleSession._id}::${todayKey}`] = 'checked-in';
              localStorage.setItem(CHECKED_KEY, JSON.stringify(checkedDates));
            }
          } catch {
            // Silently fail
          }
          return;
        }

        // --- Step 3: Request notification permission early ---
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }

        // --- Step 4: Silently get GPS and check if within geofence ---
        if (Capacitor.isNativePlatform()) {
          try {
            await Geolocation.requestPermissions();
          } catch (e) {
            console.warn("Native location permission request failed", e);
          }
        }
        if (!navigator.geolocation) {
          sendAttendanceNotification(eligibleSession);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            const targetLat = eligibleSession.latitude || eligibleSession.attendanceConfig?.latitude;
            const targetLon = eligibleSession.longitude || eligibleSession.attendanceConfig?.longitude;
            const radius = eligibleSession.radius || eligibleSession.attendanceConfig?.radius || 500;

            if (targetLat === undefined || targetLon === undefined) return;

            const distance = getDistanceInMeters(userLat, userLon, targetLat, targetLon);

            if (distance > radius) {
              // User is NOT at the location — do nothing, don't mark as processed
              // so it can try again if they arrive later
              return;
            }

            // --- Step 5: User IS at the location — send check-in to server ---
            try {
              const res = await fetch('/api/attendance/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: eligibleSession._id,
                  type: eligibleSession.type || 'session',
                  latitude: userLat,
                  longitude: userLon
                })
              });

              if (res.ok) {
                checkedDates[`${eligibleSession._id}::${todayKey}`] = 'checked-in';
                localStorage.setItem(CHECKED_KEY, JSON.stringify(checkedDates));
              }
            } catch {
              // Silently fail
            }
          },
          () => {
            // Location denied — send a notification to remind the user
            const notifKey = `${eligibleSession._id}::${todayKey}`;
            if (!checkedDates[`notif::${notifKey}`]) {
              sendAttendanceNotification(eligibleSession);
              checkedDates[`notif::${notifKey}`] = 'notified';
              localStorage.setItem(CHECKED_KEY, JSON.stringify(checkedDates));
            }
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
      } catch {
        // Silently fail
      }
    };

    // Run after a short delay to not block page load
    const timer = setTimeout(run, 2000);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
