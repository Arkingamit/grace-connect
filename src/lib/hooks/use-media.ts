import { useState, useCallback } from 'react';
import { WorshipVideo, LiveStream } from '@/lib/types';
import { mapId } from '@/lib/hooks/utils';

export function useMedia() {
  const [worshipVideos, setWorshipVideos] = useState<WorshipVideo[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);

  const addWorshipVideo = useCallback(async (v: Omit<WorshipVideo, 'id'>) => {
    const res = await fetch('/api/admin/media/worship-videos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v),
    });
    if (res.ok) {
      const created = await res.json();
      setWorshipVideos(prev => [...prev, mapId(created)]);
    }
  }, []);

  const updateWorshipVideo = useCallback(async (id: string, v: Partial<WorshipVideo>) => {
    const res = await fetch(`/api/admin/media/worship-videos/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v),
    });
    if (res.ok) {
      const updated = await res.json();
      setWorshipVideos(prev => prev.map(video => video.id === id ? mapId(updated) : video));
    }
  }, []);

  const deleteWorshipVideo = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/media/worship-videos/${id}`, { method: 'DELETE' });
    if (res.ok) setWorshipVideos(prev => prev.filter(v => v.id !== id));
  }, []);

  const updateLiveStream = useCallback(async (campusId: string, updates: Partial<LiveStream>) => {
    const ls = liveStreams.find(l => l.campusId === campusId);
    
    if (ls && (ls._id || ls.id)) {
      // Update existing
      const id = ls._id || ls.id;
      const res = await fetch(`/api/admin/media/livestreams/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setLiveStreams(prev => prev.map(l => l.campusId === campusId ? mapId(updated) : l));
      }
    } else {
      // Create new
      const payload = { ...updates, campusId };
      // Provide defaults for required fields if they are missing
      if (!payload.title) payload.title = 'Live Broadcast';
      if (!payload.description) payload.description = 'Join our live service';
      
      const res = await fetch(`/api/admin/media/livestreams`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setLiveStreams(prev => [...prev, mapId(created)]);
      }
    }
  }, [liveStreams]);

  return {
    worshipVideos,
    setWorshipVideos,
    liveStreams,
    setLiveStreams,
    addWorshipVideo,
    updateWorshipVideo,
    deleteWorshipVideo,
    updateLiveStream,
  };
}
