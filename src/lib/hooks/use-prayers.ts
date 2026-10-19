import { useState, useCallback } from 'react';
import { PrayerRequest } from '@/lib/types';
import { mapId } from '@/lib/hooks/utils';

export function usePrayers() {
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);

  const updatePrayerStatus = useCallback(async (
    id: string,
    status: 'approved' | 'rejected',
    options?: { sendNotification?: boolean; targetGroups?: string[]; targetCampuses?: string[] }
  ) => {
    const res = await fetch(`/api/admin/prayers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        sendNotification: options?.sendNotification === true,
        targetGroups: options?.targetGroups,
        targetCampuses: options?.targetCampuses,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPrayerRequests(prev => prev.map(p => p.id === id ? mapId(updated) : p));
    }
  }, []);

  const deletePrayerRequest = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/prayers/${id}`, { method: 'DELETE' });
    if (res.ok) setPrayerRequests(prev => prev.filter(p => p.id !== id));
  }, []);

  return {
    prayerRequests,
    setPrayerRequests,
    updatePrayerStatus,
    deletePrayerRequest,
  };
}
