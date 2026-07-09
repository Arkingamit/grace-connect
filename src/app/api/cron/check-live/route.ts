import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { LiveStream } from '@/models/Media';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max (polling for up to 30 min needs external trigger)

/**
 * Cron-triggered endpoint that checks if configured YouTube channels are live.
 * 
 * Flow:
 * 1. Find all LiveStream configs where isAutoEnabled=true
 * 2. Check if today matches the configured recurrence day
 * 3. Check if the current time is within the 30-minute check window
 * 4. Hit YouTube's /live page to see if the channel is currently broadcasting
 * 5. If live → update DB with isLive=true + videoId
 * 
 * This endpoint should be called by a cron service every 30 seconds 
 * (e.g. via Vercel Cron, external cron, or a setInterval in a long-running process).
 */
export async function GET(request: Request) {
  // Optional: Protect cron route with a secret
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // Find all live stream configs with auto-check enabled
    const configs = await LiveStream.find({ isAutoEnabled: true }).lean();

    if (configs.length === 0) {
      return NextResponse.json({ message: 'No auto-check configs found', checked: 0 });
    }

    const now = new Date();
    const results: any[] = [];

    for (const config of configs) {
      const channelId = config.youtubeChannelId;

      // Check if today matches the recurrence schedule
      if (!isDayMatch(now, config)) {
        // If it's not the right day but the stream is marked live from auto-check,
        // turn it off (the service ended yesterday or on a previous day)
        if (config.isLive && config.lastAutoChecked) {
          await LiveStream.updateOne({ _id: config._id }, { $set: { isLive: false } });
          results.push({ campusId: config.campusId, status: 'auto_off', reason: 'Not the right day anymore' });
        } else {
          results.push({ campusId: config.campusId, status: 'skipped', reason: 'Not the right day' });
        }
        continue;
      }

      if (!channelId) {
        results.push({ campusId: config.campusId, status: 'skipped', reason: 'No channel ID configured' });
        continue;
      }

      const withinWindow = isWithinCheckWindow(now, config.time || '10:00');

      if (!withinWindow) {
        // If the window has passed and stream was set live by auto-check, 
        // check one more time and turn off if no longer broadcasting
        if (config.isLive && isPastCheckWindow(now, config.time || '10:00')) {
          try {
            const liveResult = await checkYouTubeLive(channelId);
            if (!liveResult.isLive) {
              await LiveStream.updateOne({ _id: config._id }, { $set: { isLive: false, lastAutoChecked: now } });
              results.push({ campusId: config.campusId, status: 'auto_off', reason: 'Stream ended' });
            } else {
              results.push({ campusId: config.campusId, status: 'still_live' });
            }
          } catch (err: any) {
            results.push({ campusId: config.campusId, status: 'error', error: err.message });
          }
        } else {
          results.push({ campusId: config.campusId, status: 'skipped', reason: 'Outside check window' });
        }
        continue;
      }

      // Within the check window — ping YouTube
      try {
        const liveResult = await checkYouTubeLive(channelId);
        const updateData: any = { lastAutoChecked: now };

        if (liveResult.isLive && liveResult.videoId) {
          updateData.isLive = true;
          updateData.videoId = liveResult.videoId;
          results.push({ campusId: config.campusId, status: 'live', videoId: liveResult.videoId });
        } else {
          results.push({ campusId: config.campusId, status: 'not_live' });
        }

        await LiveStream.updateOne({ _id: config._id }, { $set: updateData });
      } catch (err: any) {
        results.push({ campusId: config.campusId, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({ checked: results.length, results });
  } catch (error: any) {
    console.error('Live check cron error:', error);
    return NextResponse.json({ error: 'Failed to run live check' }, { status: 500 });
  }
}

/**
 * Check if today matches the recurrence config.
 */
function isDayMatch(now: Date, config: any): boolean {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[now.getDay()];

  if (config.recurrencePattern === 'weekly') {
    return todayName === (config.recurrenceDay || 'Sunday');
  }

  if (config.recurrencePattern === 'custom_monthly') {
    // Check if today is the Nth <Day> of the month
    // e.g. "1st Sunday", "2nd Wednesday", "last Friday"
    if (todayName !== (config.recurrenceDay || 'Sunday')) return false;

    const dayOfMonth = now.getDate();
    const weekOfMonth = Math.ceil(dayOfMonth / 7);
    const configWeek = config.recurrenceWeekOfMonth || '1st';

    if (configWeek === 'last') {
      // Check if this is the last occurrence of this day in the month
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return dayOfMonth + 7 > daysInMonth;
    }

    const weekMap: Record<string, number> = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 };
    return weekOfMonth === (weekMap[configWeek] || 1);
  }

  return false;
}

/**
 * Check if current time is within 30 minutes of the configured check time.
 * e.g. if time is "10:00", window is 10:00 to 10:30.
 */
function isWithinCheckWindow(now: Date, configTime: string): boolean {
  const [hours, minutes] = configTime.split(':').map(Number);
  
  const windowStart = new Date(now);
  windowStart.setHours(hours, minutes, 0, 0);
  
  const windowEnd = new Date(windowStart);
  windowEnd.setMinutes(windowEnd.getMinutes() + 30);

  return now >= windowStart && now <= windowEnd;
}

/**
 * Check if current time is past the 30-minute check window (but within 2 hours after).
 * Used to auto-turn-off streams after the service likely ended.
 */
function isPastCheckWindow(now: Date, configTime: string): boolean {
  const [hours, minutes] = configTime.split(':').map(Number);
  
  const windowEnd = new Date(now);
  windowEnd.setHours(hours, minutes + 30, 0, 0);
  
  // Check up to 2 hours after the window to catch long services
  const autoOffDeadline = new Date(windowEnd);
  autoOffDeadline.setHours(autoOffDeadline.getHours() + 2);

  return now > windowEnd && now <= autoOffDeadline;
}
/**
 * Scrape YouTube to check if a channel is currently live.
 */
async function checkYouTubeLive(channelId: string): Promise<{ isLive: boolean; videoId?: string }> {
  let cleanId = channelId.trim();
  let url = '';

  // Handle full URLs
  if (cleanId.includes('youtube.com/')) {
    try {
      const urlObj = new URL(cleanId);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'channel' && pathParts[1]) {
        cleanId = pathParts[1];
      } else if (pathParts[0]?.startsWith('@')) {
        cleanId = pathParts[0];
      } else {
        cleanId = pathParts[0];
      }
    } catch (e) {
      // continue
    }
  }

  if (cleanId.startsWith('@')) {
    url = `https://www.youtube.com/${cleanId}/live`;
  } else if (cleanId.startsWith('UC') && cleanId.length > 15) {
    url = `https://www.youtube.com/channel/${cleanId}/live`;
  } else {
    url = `https://www.youtube.com/@${cleanId}/live`;
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    cache: 'no-store',
  });

  const html = await res.text();
  const canonicalMatch = html.match(/rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)"/);

  if (canonicalMatch && canonicalMatch[1]) {
    return { isLive: true, videoId: canonicalMatch[1] };
  }

  return { isLive: false };
}
