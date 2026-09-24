import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { LiveStream } from '@/models/Media';
import { notifyLiveIfNeeded } from '@/lib/notify-members';
import {
  formatChurchClock,
  getChurchClock,
  isChurchDayMatch,
  isChurchPastCheckWindow,
  isChurchWithinCheckWindow,
} from '@/lib/church-time';
import { checkYouTubeLive } from '@/lib/youtube-live';
import { serverCache } from '@/lib/cache';
import { getAutoCheckers, type LiveAutoChecker } from '@/lib/live-auto-checkers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function hasEnabledChecker(stream: any) {
  return getAutoCheckers(stream).some((c) => c.enabled && !!c.youtubeChannelId);
}

/**
 * Vercel Cron hits this every minute. Check time is India (Asia/Kolkata).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const configs = (await LiveStream.find({}).lean()).filter(hasEnabledChecker);

    if (configs.length === 0) {
      return NextResponse.json({ message: 'No auto-check configs found', checked: 0 });
    }

    const now = new Date();
    const results = await runLiveChecks(configs, now);

    const activeCheckers = configs.flatMap((config) =>
      getAutoCheckers(config)
        .filter((checker) => checker.enabled && checker.youtubeChannelId)
        .filter((checker) => {
          const windowMinutes = Number(checker.checkWindowMinutes) > 0 ? Number(checker.checkWindowMinutes) : 30;
          return isChurchDayMatch(now, checker) && isChurchWithinCheckWindow(now, checker.time || '10:00', windowMinutes);
        })
    );
    const minInterval = Math.min(
      ...activeCheckers.map((checker) => Math.max(15, Number(checker.checkIntervalSeconds) || 30)),
      60
    );
    if (activeCheckers.length > 0 && minInterval < 60) {
      await new Promise((resolve) => setTimeout(resolve, minInterval * 1000));
      const latest = (await LiveStream.find({}).lean()).filter(hasEnabledChecker);
      results.push(...(await runLiveChecks(latest, new Date())));
    }

    return NextResponse.json({
      checked: results.length,
      churchTime: formatChurchClock(getChurchClock(now)),
      results,
    });
  } catch (error: any) {
    console.error('Live check cron error:', error);
    return NextResponse.json({ error: 'Failed to run live check' }, { status: 500 });
  }
}

async function runLiveChecks(configs: any[], now: Date) {
  const results: any[] = [];

  for (const config of configs) {
    const checkers = getAutoCheckers(config).filter((c) => c.enabled && c.youtubeChannelId);
    if (checkers.length === 0) continue;

    let foundLive = false;
    let anyInWindow = false;
    let anyStillBroadcasting = false;
    let anyPastOwnWindow = false;
    const nextCheckers = [...getAutoCheckers(config)];

    for (const checker of checkers) {
      const intervalMs = Math.max(15, Number(checker.checkIntervalSeconds) || 30) * 1000;
      if (checker.lastAutoChecked) {
        const elapsed = now.getTime() - new Date(checker.lastAutoChecked).getTime();
        if (elapsed < intervalMs - 2000) {
          results.push({ campusId: config.campusId, checkerId: checker.id, status: 'skipped', reason: 'Too soon since last check' });
          continue;
        }
      }

      const windowMinutes = Number(checker.checkWindowMinutes) > 0 ? Number(checker.checkWindowMinutes) : 30;
      const dayMatch = isChurchDayMatch(now, checker);
      const withinWindow = dayMatch && isChurchWithinCheckWindow(now, checker.time || '10:00', windowMinutes);
      const pastWindow = dayMatch && isChurchPastCheckWindow(now, checker.time || '10:00', windowMinutes);

      if (withinWindow) anyInWindow = true;
      if (pastWindow) anyPastOwnWindow = true;

      if (!dayMatch) {
        results.push({ campusId: config.campusId, checkerId: checker.id, status: 'skipped', reason: 'Not the right day' });
        continue;
      }

      if (!withinWindow && !pastWindow) {
        results.push({ campusId: config.campusId, checkerId: checker.id, status: 'skipped', reason: 'Outside check window' });
        continue;
      }

      try {
        const liveResult = await checkYouTubeLive(checker.youtubeChannelId);
        touchChecker(nextCheckers, checker.id, now);

        if (liveResult.isLive && liveResult.videoId) {
          foundLive = true;
          anyStillBroadcasting = true;
          const updateData: any = {
            lastAutoChecked: now,
            autoCheckers: nextCheckers,
            isAutoEnabled: true,
          };

          if (withinWindow || config.liveSource === 'auto') {
            updateData.isLive = true;
            updateData.videoId = liveResult.videoId;
            updateData.liveSource = 'auto';
            updateData.liveSourceCheckerId = checker.id;
            const notifiedFor = await notifyLiveIfNeeded(
              {
                _id: config._id,
                title: config.title,
                campusId: config.campusId,
                videoId: liveResult.videoId,
                notifyWhenLive: config.notifyWhenLive,
                lastLiveNotifiedVideoId: config.lastLiveNotifiedVideoId,
              },
              !!config.isLive,
              true
            );
            if (notifiedFor) updateData.lastLiveNotifiedVideoId = notifiedFor;
          }

          await LiveStream.updateOne({ _id: config._id }, { $set: updateData });
          serverCache.invalidate('media:livestreams');
          results.push({
            campusId: config.campusId,
            checkerId: checker.id,
            status: withinWindow ? 'live' : 'still_live',
            videoId: liveResult.videoId,
          });
        } else {
          results.push({
            campusId: config.campusId,
            checkerId: checker.id,
            status: withinWindow ? 'not_live' : 'ended',
          });
        }
      } catch (err: any) {
        results.push({ campusId: config.campusId, checkerId: checker.id, status: 'error', error: err.message });
      }
    }

    const shouldAutoOff =
      config.isLive &&
      config.liveSource === 'auto' &&
      !foundLive &&
      !anyInWindow &&
      !anyStillBroadcasting &&
      anyPastOwnWindow;

    if (shouldAutoOff) {
      await LiveStream.updateOne(
        { _id: config._id },
        { $set: { isLive: false, lastAutoChecked: now, autoCheckers: nextCheckers, liveSourceCheckerId: '' } }
      );
      serverCache.invalidate('media:livestreams');
      results.push({ campusId: config.campusId, status: 'auto_off', reason: 'Auto stream ended' });
    } else if (nextCheckers.some((c, i) => c.lastAutoChecked !== getAutoCheckers(config)[i]?.lastAutoChecked)) {
      await LiveStream.updateOne({ _id: config._id }, { $set: { autoCheckers: nextCheckers, lastAutoChecked: now } });
    }
  }

  return results;
}

function touchChecker(checkers: LiveAutoChecker[], id: string, now: Date) {
  const index = checkers.findIndex((c) => c.id === id);
  if (index >= 0) {
    checkers[index] = { ...checkers[index], lastAutoChecked: now.toISOString() };
  }
}
