"use client";

import { useEffect, useRef } from 'react';
import { useAdminData } from '@/lib/admin-data-context';

export function LiveStreamPoller() {
  const { liveStreams, updateLiveStream, currentUser } = useAdminData();
  const campusId = currentUser?.campusId || 'main'; // default to main or current user campus
  
  const currentStream = liveStreams.find(ls => ls.campusId === campusId);
  
  // Use refs to avoid re-triggering the interval if references change
  const streamRef = useRef(currentStream);
  const updateRef = useRef(updateLiveStream);
  
  useEffect(() => {
    streamRef.current = currentStream;
    updateRef.current = updateLiveStream;
  }, [currentStream, updateLiveStream]);

  useEffect(() => {
    // If auto is disabled or no channel handle, do nothing
    if (!streamRef.current?.isAutoEnabled || !streamRef.current?.youtubeChannelId) {
      return;
    }

    const checkYouTubeLive = async () => {
      const stream = streamRef.current;
      if (!stream) return;

      const { youtubeChannelId, recurrenceDay, time } = stream;
      if (!youtubeChannelId || !time) return;

      const now = new Date();
      
      // Parse the scheduled time
      const [hours, minutes] = time.split(':').map(Number);
      
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = days[now.getDay()];

      // Check day matching for both weekly and custom_monthly
      if (stream.recurrencePattern === 'weekly' || stream.recurrencePattern === 'custom_monthly') {
        if (recurrenceDay && currentDayName !== recurrenceDay) {
          return; // Wrong day, don't check
        }
      }

      // Check week matching for custom_monthly
      if (stream.recurrencePattern === 'custom_monthly' && stream.recurrenceWeekOfMonth) {
        const date = now.getDate();
        const weekOfMonth = Math.ceil(date / 7);
        let currentWeekStr = '';
        
        if (weekOfMonth === 1) currentWeekStr = '1st';
        else if (weekOfMonth === 2) currentWeekStr = '2nd';
        else if (weekOfMonth === 3) currentWeekStr = '3rd';
        else if (weekOfMonth === 4) currentWeekStr = '4th';
        
        // Check for 'last' week of month
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const isLastWeek = date > daysInMonth - 7;
        
        if (stream.recurrenceWeekOfMonth === 'last') {
          if (!isLastWeek) return;
        } else if (currentWeekStr !== stream.recurrenceWeekOfMonth) {
          return; // Wrong week of the month, don't check
        }
      }

      // Calculate the start of the 30-minute window
      const checkStart = new Date(now);
      checkStart.setHours(hours, minutes, 0, 0);
      
      // Calculate the end of the window (e.g. 30 mins after scheduled start)
      const checkEnd = new Date(checkStart.getTime() + 30 * 60000);

      // Are we within the 30-minute check window?
      if (now >= checkStart && now <= checkEnd) {
        try {
          const channelHandle = youtubeChannelId.startsWith('@') ? youtubeChannelId : `@${youtubeChannelId}`;
          const res = await fetch(`/api/youtube/check-live?channelId=${encodeURIComponent(channelHandle)}`);
          if (res.ok) {
            const data = await res.json();
            
            // If the status has changed (e.g. wasn't live, now is)
            if (data.isLive && (!stream.isLive || stream.videoId !== data.videoId)) {
              console.log("Automated checker found live stream:", data.videoId);
              updateRef.current(stream.campusId, {
                videoId: data.videoId,
                isLive: true
              });
            } else if (!data.isLive && stream.isLive) {
              // Wait, if it stopped being live, should we turn it off?
              // Only if we want automated turn-off. For safety, let's just leave it or turn it off.
              // We'll leave it on for now to prevent flickering if a glitch happens.
            }
          }
        } catch (err) {
          console.error("LiveStreamPoller error:", err);
        }
      }
    };

    // Run immediately once
    checkYouTubeLive();

    // Then poll every 30 seconds
    const interval = setInterval(checkYouTubeLive, 30000);

    return () => clearInterval(interval);
  }, [campusId]); // Re-bind interval if campus changes, but use refs for everything else

  return null; // Invisible background component
}
