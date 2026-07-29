"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { format, isToday as isDateToday } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Images, ArrowRight, Users } from 'lucide-react';
import type { Event } from '@/lib/admin-data-context';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getEventStatus,
  eventDateKey,
  toLocalDateKey,
  isSameLocalDay,
  pickDayForFilter,
  parseLocalDate,
  combineDateAndTime,
  EVENT_STATUS_LABEL,
  EVENT_STATUS_DOT,
  EVENT_STATUS_BADGE,
  type EventLifecycleStatus,
} from '@/lib/event-status';
import { MapsPinIcon } from '@/components/ui/maps-pin-icon';
import { getMapsUrl } from '@/lib/maps';

const categoryColors: Record<string, string> = {
  Worship: 'bg-primary/10 text-primary',
  Prayer: 'bg-prayer/10 text-prayer',
  Youth: 'bg-success/10 text-success',
  Study: 'bg-accent/10 text-accent-foreground',
  Outreach: 'bg-destructive/10 text-destructive',
  Fellowship: 'bg-muted text-muted-foreground',
};

function formatTime(time: string) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return time;
  return `${hour % 12 || 12}:${m || '00'} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function getAvailabilityStatus(registered: number, capacity: number) {
  if (capacity === 0) return { text: 'Open Registration', color: 'text-success' };
  if (registered === 0) return { text: 'Open Registration', color: 'text-success' };
  const pct = (registered / capacity) * 100;
  if (pct >= 100) return { text: 'Full', color: 'text-destructive' };
  if (pct >= 90) return { text: 'Almost Full', color: 'text-accent' };
  if (pct >= 75) return { text: 'Filling Up', color: 'text-accent' };
  return { text: 'Available', color: 'text-success' };
}

export type EventCalendarFilter = 'all' | 'upcoming' | 'ongoing' | 'past' | 'registered';

type Props = {
  events: Event[];
  registeredEventIds: Set<string>;
  onRsvp: (event: Event) => void;
  onOpenAlbum: (event: Event) => void;
  requireSignInForRegistered?: boolean;
  isSignedIn?: boolean;
};

function DayLocationButton({ event }: { event: Event }) {
  const href = getMapsUrl({
    mapUrl: event.mapUrl,
    location: event.location,
    latitude: event.attendanceConfig?.latitude,
    longitude: event.attendanceConfig?.longitude,
  });
  if (!href || !event.location?.trim()) {
    return <span className="line-clamp-1 text-xs text-[#7A6150]">{event.location || 'TBA'}</span>;
  }
  return (
    <div
      className="inline-flex min-w-0 max-w-full -space-x-px rounded-lg shadow-sm shadow-black/5"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        asChild
        variant="outline"
        className="flex-1 min-w-0 justify-start rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 h-7 px-2 text-[11px] font-medium text-[#1A202C] border-[#E5D5C5]/60 bg-white hover:bg-[#F3EAE1]"
      >
        <a href={href} target="_blank" rel="noopener noreferrer">
          <span className="truncate">{event.location}</span>
        </a>
      </Button>
      <Button
        asChild
        variant="outline"
        size="icon"
        className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 h-7 w-7 shrink-0 border-[#E5D5C5]/60 bg-white hover:bg-[#F3EAE1] p-0 [&_img]:!size-4"
        aria-label="Open directions in Maps"
      >
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center">
          <MapsPinIcon className="w-4 h-4" />
        </a>
      </Button>
    </div>
  );
}

export function EventMonthCalendar({
  events,
  registeredEventIds,
  onRsvp,
  onOpenAlbum,
  requireSignInForRegistered = true,
  isSignedIn = true,
}: Props) {
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [month, setMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [filter, setFilter] = useState<EventCalendarFilter>('all');

  const matchesFilter = (event: Event, active: EventCalendarFilter, now: Date) => {
    if (active === 'all') return true;
    if (active === 'registered') {
      return registeredEventIds.has(event.id) || registeredEventIds.has(String(event._id || ''));
    }
    return getEventStatus(event, now) === active;
  };

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const list = events.filter((event) => matchesFilter(event, filter, now));

    return list.sort((a, b) => {
      const statusA = getEventStatus(a, now);
      const statusB = getEventStatus(b, now);
      const rank = (s: typeof statusA) => (s === 'ongoing' ? 0 : s === 'upcoming' ? 1 : 2);
      const r = rank(statusA) - rank(statusB);
      if (r !== 0) return r;

      const ta = combineDateAndTime(a.date, a.time).getTime();
      const tb = combineDateAndTime(b.date, b.time).getTime();
      // Past: newest first; upcoming/ongoing: soonest first
      return statusA === 'past' ? tb - ta : ta - tb;
    });
  }, [events, filter, registeredEventIds]);

  // When a status filter is chosen, jump to a day that has matching events
  useEffect(() => {
    if (filter === 'all') return;
    const now = new Date();
    const target = pickDayForFilter(events, filter, registeredEventIds, now);
    if (!target) return;
    const next = parseLocalDate(toLocalDateKey(target));
    setSelectedDay(next);
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1, 12));
    // Only react to filter changes — not every events refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of filteredEvents) {
      const key = eventDateKey(event);
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    }
    return map;
  }, [filteredEvents]);

  const dayStatusModifiers = useMemo(() => {
    const now = new Date();
    const past: Date[] = [];
    const ongoing: Date[] = [];
    const upcoming: Date[] = [];

    for (const [key, dayEvents] of eventsByDay.entries()) {
      const statuses = dayEvents.map((e) => getEventStatus(e, now));
      const day = parseLocalDate(key);
      if (statuses.includes('ongoing')) ongoing.push(day);
      else if (statuses.includes('upcoming')) upcoming.push(day);
      else past.push(day);
    }

    return { past, ongoing, upcoming };
  }, [eventsByDay]);

  const selectedKey = toLocalDateKey(selectedDay);
  const dayEvents = eventsByDay.get(selectedKey) || [];

  // "All" and status filters: show the full matching list (like the old tabs).
  // If a specific day is selected and it has matches, still show the full list for All;
  // day selection mainly drives the calendar highlight + dots.
  const agendaEvents = filteredEvents;

  const agendaTitle =
    filter === 'all'
      ? 'All events'
      : filter === 'registered'
        ? 'Registered events'
        : `${filter.charAt(0).toUpperCase()}${filter.slice(1)} events`;

  const chips: { id: EventCalendarFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'past', label: 'Past' },
    { id: 'registered', label: 'Registered' },
  ];

  const applyFilter = (next: EventCalendarFilter) => {
    setFilter(next);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => applyFilter(chip.id)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors',
              filter === chip.id
                ? 'bg-[#8B2323] text-white border-[#8B2323]'
                : 'bg-white text-[#7A6150] border-[#E5D5C5]/70 hover:border-[#8B2323]/40'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Month + agenda card stack */}
      <div className="relative">
        <div className="rounded-[2rem] bg-gradient-to-b from-[#8B2323] to-[#5C1111] text-white shadow-lg overflow-hidden pt-5 pb-16 px-3 sm:px-4">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selectedDay}
            onSelect={(day) => {
              if (day) {
                const next = new Date(day);
                next.setHours(12, 0, 0, 0);
                setSelectedDay(next);
              }
            }}
            showOutsideDays
            modifiers={{
              hasPast: dayStatusModifiers.past,
              hasOngoing: dayStatusModifiers.ongoing,
              hasUpcoming: dayStatusModifiers.upcoming,
            }}
            modifiersClassNames={{
              hasPast: 'rdp-day-has-event rdp-day-past',
              hasOngoing: 'rdp-day-has-event rdp-day-ongoing',
              hasUpcoming: 'rdp-day-has-event rdp-day-upcoming',
            }}
            className="w-full p-0 bg-transparent text-white"
            classNames={{
              months: 'flex flex-col space-y-3 w-full',
              month: 'space-y-3 w-full',
              caption: 'flex justify-center pt-1 relative items-center mb-2',
              caption_label: 'text-base font-semibold tracking-wide text-white',
              nav: 'space-x-1 flex items-center',
              nav_button:
                'h-8 w-8 bg-white/10 hover:bg-white/20 text-white border-0 rounded-full inline-flex items-center justify-center opacity-90 hover:opacity-100',
              nav_button_previous: 'absolute left-1',
              nav_button_next: 'absolute right-1',
              table: 'w-full border-collapse',
              head_row: 'flex w-full',
              head_cell: 'text-white/70 rounded-md flex-1 font-medium text-[11px] uppercase tracking-wider',
              row: 'flex w-full mt-1.5',
              cell: 'flex-1 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
              day: cn(
                'h-10 w-full max-w-[2.75rem] mx-auto p-0 font-medium rounded-full text-white/90',
                'hover:bg-white/15 aria-selected:opacity-100 relative'
              ),
              day_selected:
                'bg-[#F5C6C6] text-[#8B2323] hover:bg-[#F0B4B4] hover:text-[#8B2323] focus:bg-[#F5C6C6] focus:text-[#8B2323] font-bold shadow-md',
              day_today: 'ring-1 ring-white/50',
              day_outside: 'text-white/35 opacity-70',
              day_disabled: 'text-white/25 opacity-50',
              day_hidden: 'invisible',
            }}
            components={{
              DayContent: ({ date }) => {
                const key = toLocalDateKey(date);
                const has = eventsByDay.has(key);
                let status: EventLifecycleStatus | null = null;
                if (has) {
                  const now = new Date();
                  const statuses = (eventsByDay.get(key) || []).map((e) => getEventStatus(e, now));
                  if (statuses.includes('ongoing')) status = 'ongoing';
                  else if (statuses.includes('upcoming')) status = 'upcoming';
                  else status = 'past';
                }
                const selected = isSameLocalDay(date, selectedDay);
                return (
                  <span className="relative inline-flex flex-col items-center justify-center w-full h-full">
                    <span>{date.getDate()}</span>
                    {has && status && (
                      <span
                        className={cn(
                          'absolute bottom-1 h-1 w-1 rounded-full',
                          selected ? 'bg-[#8B2323]' : EVENT_STATUS_DOT[status]
                        )}
                      />
                    )}
                  </span>
                );
              },
            }}
          />
        </div>

        {/* Agenda sheet */}
        <div className="relative -mt-12 mx-2 sm:mx-3 rounded-[1.75rem] bg-white border border-[#E5D5C5]/50 shadow-xl p-4 sm:p-5 min-h-[220px]">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-serif font-bold text-[#1A202C]">{agendaTitle}</h3>
              {dayEvents.length > 0 && (
                <p className="text-[11px] text-[#7A6150] mt-0.5">
                  {dayEvents.length} on {isDateToday(selectedDay) ? 'today' : format(selectedDay, 'MMM d')}
                </p>
              )}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7A6150] shrink-0">
              {agendaEvents.length} {agendaEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {filter === 'registered' && requireSignInForRegistered && !isSignedIn ? (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-[#8B2323]/25 mx-auto mb-3" />
              <p className="font-semibold text-[#1A202C]">Sign in required</p>
              <p className="text-sm text-[#7A6150] mt-1">Sign in to see your registered events.</p>
            </div>
          ) : agendaEvents.length === 0 ? (
            <div className="text-center py-10">
              <CalendarIcon className="w-10 h-10 text-[#8B2323]/20 mx-auto mb-3" />
              <p className="font-semibold text-[#1A202C]">
                {filter === 'all' ? 'No events this day' : `No ${filter} events`}
              </p>
              <p className="text-sm text-[#7A6150] mt-1">
                {filter === 'all'
                  ? 'Pick another date or browse other months.'
                  : 'Try a different filter or month.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-0 relative">
              <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[#E5D5C5]/80" aria-hidden />
              {agendaEvents.map((event) => {
                const now = new Date();
                const status = getEventStatus(event, now);
                const availability = getAvailabilityStatus(event.registered, event.capacity);
                const isPast = status === 'past';
                const isRegistered =
                  registeredEventIds.has(event.id) || registeredEventIds.has(String(event._id || ''));
                const showDate = true;
                const onSelectedDay = eventDateKey(event) === selectedKey;

                return (
                  <li key={event.id} className="relative pl-8 pb-5 last:pb-0">
                    <span
                      className={cn(
                        'absolute left-1.5 top-2 h-3 w-3 rounded-full border-2 border-white shadow-sm z-10',
                        EVENT_STATUS_DOT[status]
                      )}
                    />
                    <div
                      className={cn(
                        'w-full rounded-2xl border bg-[#FAF7F2]/50 hover:bg-[#FAF7F2] transition-colors p-3',
                        onSelectedDay ? 'border-[#8B2323]/40 ring-1 ring-[#8B2323]/20' : 'border-[#E5D5C5]/40'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const d = parseLocalDate(event.date);
                          setSelectedDay(d);
                          setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12));
                          onRsvp(event);
                        }}
                        className="w-full text-left"
                      >
                        {showDate && (
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8B2323]/80 mb-1">
                            {format(parseLocalDate(event.date), 'EEE, MMM d')}
                          </p>
                        )}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className={cn('font-bold text-sm leading-snug', isPast ? 'text-muted-foreground' : 'text-[#1A202C]')}>
                            {event.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className={cn('shrink-0 text-[9px] px-2 py-0 font-semibold border', EVENT_STATUS_BADGE[status])}
                          >
                            {EVENT_STATUS_LABEL[status]}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <Badge variant="outline" className={`${categoryColors[event.category] || ''} border-current text-[9px] px-1.5 py-0`}>
                            {event.category}
                          </Badge>
                          {isRegistered && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-200 text-emerald-700 bg-emerald-50">
                              Registered
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs text-[#7A6150]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0 text-[#8B2323]/70" />
                            <span>
                              {formatTime(event.time)}
                              {event.endTime ? ` – ${formatTime(event.endTime)}` : ''}
                            </span>
                          </div>
                        </div>
                      </button>

                      <div className="mt-2">
                        <DayLocationButton event={event} />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#E5D5C5]/40 pt-2.5">
                        <span className={cn('text-[10px] font-medium', isPast ? 'text-muted-foreground' : availability.color)}>
                          {isPast ? 'Event Ended' : availability.text}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {event.googlePhotosUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-xl"
                              onClick={() => onOpenAlbum(event)}
                              title="View Event Photos"
                            >
                              <Images className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            disabled={isPast || event.registered >= event.capacity}
                            onClick={() => onRsvp(event)}
                            className="h-8 text-xs rounded-xl px-3 bg-[#8B2323] hover:bg-[#721515]"
                          >
                            {isPast ? 'Ended' : event.registered >= event.capacity ? 'Full' : isRegistered ? 'View RSVP' : 'RSVP'}
                            {!isPast && event.registered < event.capacity && <ArrowRight className="w-3 h-3 ml-1" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
