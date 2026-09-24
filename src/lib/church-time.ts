import { parseTimeParts } from '@/lib/event-status';

/** Grace Ahmedabad local time. Server cron must use this, not UTC. */
export const CHURCH_TIMEZONE = 'Asia/Kolkata';

export type ChurchClock = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  weekday: string;
};

export function getChurchClock(date = new Date()): ChurchClock {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: CHURCH_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  let hours = Number(parts.hour);
  if (hours === 24) hours = 0;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hours,
    minutes: Number(parts.minute),
    seconds: Number(parts.second),
    weekday: parts.weekday,
  };
}

export function formatChurchClock(clock: ChurchClock): string {
  const hh = String(clock.hours).padStart(2, '0');
  const mm = String(clock.minutes).padStart(2, '0');
  return `${clock.weekday} ${clock.year}-${String(clock.month).padStart(2, '0')}-${String(clock.day).padStart(2, '0')} ${hh}:${mm} IST`;
}

export function isChurchDayMatch(
  now: Date,
  config: { recurrencePattern?: string; recurrenceDay?: string; recurrenceWeekOfMonth?: string }
): boolean {
  const clock = getChurchClock(now);

  if (config.recurrencePattern === 'weekly') {
    return clock.weekday === (config.recurrenceDay || 'Sunday');
  }

  if (config.recurrencePattern === 'custom_monthly') {
    if (clock.weekday !== (config.recurrenceDay || 'Sunday')) return false;

    const weekOfMonth = Math.ceil(clock.day / 7);
    const configWeek = config.recurrenceWeekOfMonth || '1st';

    if (configWeek === 'last') {
      const daysInMonth = new Date(clock.year, clock.month, 0).getDate();
      return clock.day + 7 > daysInMonth;
    }

    const weekMap: Record<string, number> = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 };
    return weekOfMonth === (weekMap[configWeek] || 1);
  }

  return false;
}

export function isChurchWithinCheckWindow(now: Date, configTime: string, windowMinutes = 30): boolean {
  const parts = parseTimeParts(configTime);
  if (!parts) return false;
  const clock = getChurchClock(now);
  const nowMin = clock.hours * 60 + clock.minutes;
  const start = parts.hours * 60 + parts.minutes;
  return nowMin >= start && nowMin <= start + windowMinutes;
}

/** True from the end of the check window through 2 extra hours (auto-off). */
export function isChurchPastCheckWindow(now: Date, configTime: string, windowMinutes = 30): boolean {
  const parts = parseTimeParts(configTime);
  if (!parts) return false;
  const clock = getChurchClock(now);
  const nowMin = clock.hours * 60 + clock.minutes;
  const end = parts.hours * 60 + parts.minutes + windowMinutes;
  return nowMin > end && nowMin <= end + 120;
}
