export type EventLifecycleStatus = 'past' | 'ongoing' | 'upcoming';

export type EventStatusInput = {
  date: string;
  time?: string;
  endTime?: string;
  endDate?: string;
};

/** Parse "HH:mm", "H:mm", or "h:mm AM/PM" into hours/minutes. */
export function parseTimeParts(time?: string): { hours: number; minutes: number } | null {
  if (!time?.trim()) return null;
  const raw = time.trim();

  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hours = parseInt(ampm[1], 10);
    const minutes = parseInt(ampm[2], 10);
    const period = ampm[3].toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  }

  const twentyFour = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    return {
      hours: parseInt(twentyFour[1], 10),
      minutes: parseInt(twentyFour[2], 10),
    };
  }

  return null;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Parse a date string as a local calendar day (avoids UTC off-by-one for YYYY-MM-DD).
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return startOfLocalDay(new Date());

  const ymd = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12, 0, 0, 0);
  }

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return startOfLocalDay(new Date());
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Combine a date string with optional time into a local Date. */
export function combineDateAndTime(dateStr: string, time?: string, fallback: 'start' | 'end' = 'start'): Date {
  const base = parseLocalDate(dateStr);

  const parts = parseTimeParts(time);
  if (parts) {
    base.setHours(parts.hours, parts.minutes, 0, 0);
    return base;
  }

  if (fallback === 'end') {
    base.setHours(23, 59, 59, 999);
  } else {
    base.setHours(0, 0, 0, 0);
  }
  return base;
}

export function getEventBounds(event: EventStatusInput): { start: Date; end: Date } {
  const start = combineDateAndTime(event.date, event.time, 'start');
  const endDate = event.endDate || event.date;

  if (event.endTime?.trim()) {
    const end = combineDateAndTime(endDate, event.endTime, 'end');
    if (end.getTime() < start.getTime()) {
      end.setDate(end.getDate() + 1);
    }
    return { start, end };
  }

  if (!event.time?.trim()) {
    const end = combineDateAndTime(endDate, undefined, 'end');
    return { start, end };
  }

  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return { start, end };
}

export function getEventStatus(event: EventStatusInput, now: Date = new Date()): EventLifecycleStatus {
  const { start, end } = getEventBounds(event);
  const t = now.getTime();
  if (t > end.getTime()) return 'past';
  if (t >= start.getTime() && t <= end.getTime()) return 'ongoing';
  return 'upcoming';
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function eventDateKey(event: EventStatusInput): string {
  return toLocalDateKey(parseLocalDate(event.date));
}

/** Pick the best day to show for a filter (today if it matches, else nearest match). */
export function pickDayForFilter<T extends EventStatusInput & { id?: string }>(
  events: T[],
  filter: 'all' | 'upcoming' | 'ongoing' | 'past' | 'registered',
  registeredIds: Set<string>,
  now: Date = new Date()
): Date | null {
  const matching = events.filter((event) => {
    if (filter === 'all') return true;
    if (filter === 'registered') return registeredIds.has(String(event.id));
    return getEventStatus(event, now) === filter;
  });

  if (matching.length === 0) return null;

  const todayKey = toLocalDateKey(now);
  const todayMatch = matching.find((e) => eventDateKey(e) === todayKey);
  if (todayMatch) {
    return parseLocalDate(todayMatch.date);
  }

  const sorted = [...matching].sort(
    (a, b) => combineDateAndTime(a.date, a.time).getTime() - combineDateAndTime(b.date, b.time).getTime()
  );

  if (filter === 'past') {
    const last = sorted[sorted.length - 1];
    return parseLocalDate(last.date);
  }

  // upcoming / ongoing / registered / all — prefer soonest from now
  const upcomingish = sorted.find((e) => combineDateAndTime(e.date, e.time).getTime() >= startOfLocalDay(now).getTime());
  const pick = upcomingish || sorted[0];
  return parseLocalDate(pick.date);
}

export const EVENT_STATUS_LABEL: Record<EventLifecycleStatus, string> = {
  past: 'Ended',
  ongoing: 'In Progress',
  upcoming: 'Upcoming',
};

export const EVENT_STATUS_DOT: Record<EventLifecycleStatus, string> = {
  past: 'bg-[#9CA3AF]',
  ongoing: 'bg-emerald-500',
  upcoming: 'bg-[#8B2323]',
};

export const EVENT_STATUS_BADGE: Record<EventLifecycleStatus, string> = {
  past: 'bg-muted text-muted-foreground border-border',
  ongoing: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  upcoming: 'bg-[#FBE8E8] text-[#8B2323] border-[#8B2323]/20',
};
