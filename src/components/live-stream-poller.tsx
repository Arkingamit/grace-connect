"use client";

import { useEffect, useRef } from 'react';
import { canPublishAllCampuses, useAdminData } from '@/lib/admin-data-context';
import { isChurchDayMatch, isChurchWithinCheckWindow } from '@/lib/church-time';
import { getAutoCheckers } from '@/lib/live-auto-checkers';

export function LiveStreamPoller() {
  const { liveStreams, updateLiveStream, currentUser } = useAdminData();
  const campusId = currentUser?.campusId || 'main';
  const canWatchAll = canPublishAllCampuses(currentUser?.role);

  const streamsToWatch = (canWatchAll
    ? liveStreams
    : liveStreams.filter((ls) => ls.campusId === campusId)
  ).filter((ls) => getAutoCheckers(ls).some((c) => c.enabled && c.youtubeChannelId));

  const streamsRef = useRef(streamsToWatch);
  const updateRef = useRef(updateLiveStream);

  useEffect(() => {
    streamsRef.current = streamsToWatch;
    updateRef.current = updateLiveStream;
  }, [streamsToWatch, updateLiveStream]);

  const watchKey = streamsToWatch
    .flatMap((s) => getAutoCheckers(s).filter((c) => c.enabled && c.youtubeChannelId))
    .map((c) => `${c.id}:${c.checkIntervalSeconds || 30}:${c.time}:${c.youtubeChannelId}`)
    .join('|');

  useEffect(() => {
    if (streamsRef.current.length === 0) return;

    const checkYouTubeLive = async () => {
      const now = new Date();

      for (const stream of streamsRef.current) {
        const checkers = getAutoCheckers(stream).filter((c) => c.enabled && c.youtubeChannelId);
        for (const checker of checkers) {
          if (!checker.time) continue;
          if (!isChurchDayMatch(now, checker)) continue;
          const windowMinutes = Number(checker.checkWindowMinutes) > 0 ? Number(checker.checkWindowMinutes) : 30;
          if (!isChurchWithinCheckWindow(now, checker.time, windowMinutes)) continue;

          try {
            const channelHandle = checker.youtubeChannelId.startsWith('@')
              ? checker.youtubeChannelId
              : `@${checker.youtubeChannelId}`;
            const res = await fetch(`/api/youtube/check-live?channelId=${encodeURIComponent(channelHandle)}`);
            if (!res.ok) continue;
            const data = await res.json();

            if (data.isLive && (!stream.isLive || stream.videoId !== data.videoId)) {
              updateRef.current(stream.campusId, {
                videoId: data.videoId,
                isLive: true,
                liveSource: 'auto',
                liveSourceCheckerId: checker.id,
              });
            }
          } catch (err) {
            console.error('LiveStreamPoller error:', err);
          }
        }
      }
    };

    checkYouTubeLive();

    const intervals = streamsRef.current.flatMap((s) =>
      getAutoCheckers(s)
        .filter((c) => c.enabled && c.youtubeChannelId)
        .map((c) => Math.max(15, Number(c.checkIntervalSeconds) || 30))
    );
    const intervalSeconds = intervals.length ? Math.min(...intervals) : 30;
    const interval = setInterval(checkYouTubeLive, intervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [campusId, watchKey]);

  return null;
}
