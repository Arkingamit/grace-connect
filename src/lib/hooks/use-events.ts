import { useState, useCallback } from 'react';
import { Event, EventRegistration } from '@/lib/types';
import { mapId } from '@/lib/hooks/utils';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);

  const addEvent = useCallback(async (e: Omit<Event, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/admin/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(e),
    });
    if (res.ok) {
      const created = await res.json();
      setEvents(prev => [...prev, mapId(created)]);
      import('sonner').then(({ toast }) => toast.success('Event created successfully'));
    } else {
      const errorData = await res.json().catch(() => ({}));
      import('sonner').then(({ toast }) => toast.error(errorData.error || 'Failed to create event'));
    }
  }, []);

  const updateEvent = useCallback(async (id: string, u: Partial<Event>, updateSeries?: boolean) => {
    const url = updateSeries ? `/api/admin/events/${id}?updateSeries=true` : `/api/admin/events/${id}`;
    const res = await fetch(url, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u),
    });
    if (res.ok) {
      if (updateSeries) {
        window.location.reload();
      } else {
        const updated = await res.json();
        setEvents(prev => prev.map(e => e.id === id ? mapId(updated) : e));
        import('sonner').then(({ toast }) => toast.success('Event updated successfully'));
      }
    } else {
      const errorData = await res.json().catch(() => ({}));
      import('sonner').then(({ toast }) => toast.error(errorData.error || 'Failed to update event'));
    }
  }, []);

  const deleteEvent = useCallback(async (id: string, deleteSeries?: boolean) => {
    const url = deleteSeries ? `/api/admin/events/${id}?deleteSeries=true` : `/api/admin/events/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      if (deleteSeries) {
        window.location.reload();
      } else {
        setEvents(prev => prev.filter(e => e.id !== id));
        setEventRegistrations(prev => prev.filter(r => r.eventId !== id));
      }
    }
  }, []);

  const addEventRegistration = useCallback(async (reg: Omit<EventRegistration, 'id' | 'registeredAt'>) => {
    const res = await fetch('/api/admin/event-registrations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reg),
    });
    if (res.ok) {
      const created = await res.json();
      setEventRegistrations(prev => [...prev, mapId(created)]);
      setEvents(prev => prev.map(e => e.id === reg.eventId ? { ...e, registered: e.registered + 1 } : e));
    }
  }, []);

  const getEventRegistrations = useCallback((eventId: string) => {
    return eventRegistrations.filter(r => r.eventId === eventId);
  }, [eventRegistrations]);

  return {
    events,
    setEvents,
    eventRegistrations,
    setEventRegistrations,
    addEvent,
    updateEvent,
    deleteEvent,
    addEventRegistration,
    getEventRegistrations,
  };
}
