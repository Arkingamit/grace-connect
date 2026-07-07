import { useState, useCallback } from 'react';
import { Sermon, SermonSeries } from '@/lib/types';
import { mapId } from '@/lib/hooks/utils';

export function useSermons() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [sermonSeries, setSermonSeries] = useState<SermonSeries[]>([]);

  const addSermonSeries = useCallback(async (s: Omit<SermonSeries, 'id'>) => {
    const res = await fetch('/api/admin/media/sermon-series', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    if (res.ok) {
      const created = await res.json();
      setSermonSeries(prev => [...prev, mapId(created)]);
    }
  }, []);

  const updateSermonSeries = useCallback(async (id: string, s: Partial<SermonSeries>) => {
    const res = await fetch(`/api/admin/media/sermon-series/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    if (res.ok) {
      const updated = await res.json();
      setSermonSeries(prev => prev.map(series => series.id === id ? mapId(updated) : series));
    }
  }, []);

  const deleteSermonSeries = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/media/sermon-series/${id}`, { method: 'DELETE' });
    if (res.ok) setSermonSeries(prev => prev.filter(s => s.id !== id));
  }, []);

  const addSermon = useCallback(async (s: Omit<Sermon, 'id'>) => {
    const res = await fetch('/api/admin/media/sermons', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    if (res.ok) {
      const created = await res.json();
      setSermons(prev => [...prev, mapId(created)]);
    }
  }, []);

  const updateSermon = useCallback(async (id: string, s: Partial<Sermon>) => {
    const res = await fetch(`/api/admin/media/sermons/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    if (res.ok) {
      const updated = await res.json();
      setSermons(prev => prev.map(sermon => sermon.id === id ? mapId(updated) : sermon));
    }
  }, []);

  const deleteSermon = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/media/sermons/${id}`, { method: 'DELETE' });
    if (res.ok) setSermons(prev => prev.filter(s => s.id !== id));
  }, []);

  const reorderSermons = useCallback((updatedSermons: Sermon[]) => {
    const reordered = updatedSermons.map((s, i) => ({ ...s, sortOrder: i }));
    setSermons(reordered);
    fetch('/api/admin/media/sermons/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: reordered.map(s => ({ id: s.id, sortOrder: s.sortOrder })) }),
    });
  }, []);

  return {
    sermons,
    setSermons,
    sermonSeries,
    setSermonSeries,
    addSermonSeries,
    updateSermonSeries,
    deleteSermonSeries,
    addSermon,
    updateSermon,
    deleteSermon,
    reorderSermons,
  };
}
