import { useState, useCallback } from 'react';
import { Announcement } from '@/lib/types';
import { mapId } from '@/lib/hooks/utils';

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const addAnnouncement = useCallback(async (a: Omit<Announcement, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/admin/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(a),
    });
    if (res.ok) {
      const created = await res.json();
      setAnnouncements(prev => [...prev, mapId(created)]);
    }
  }, []);

  const updateAnnouncement = useCallback(async (id: string, u: Partial<Announcement>) => {
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u),
    });
    if (res.ok) {
      const updated = await res.json();
      setAnnouncements(prev => prev.map(a => a.id === id ? mapId(updated) : a));
    }
  }, []);

  const deleteAnnouncement = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
    if (res.ok) setAnnouncements(prev => prev.filter(a => a.id !== id));
  }, []);

  return {
    announcements,
    setAnnouncements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
  };
}
