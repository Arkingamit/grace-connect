import type { LiveAutoChecker, LiveStream } from '@/lib/types';

export type { LiveAutoChecker };

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newAutoChecker(partial: Partial<LiveAutoChecker> = {}): LiveAutoChecker {
  return {
    id: makeId(),
    name: '',
    enabled: true,
    youtubeChannelId: '',
    recurrencePattern: 'weekly',
    recurrenceDay: 'Sunday',
    recurrenceWeekOfMonth: '1st',
    time: '10:00',
    checkIntervalSeconds: 30,
    checkWindowMinutes: 30,
    ...partial,
  };
}

/** Prefer the new list; fall back to the old single-checker fields. */
export function getAutoCheckers(stream?: Partial<LiveStream> | null): LiveAutoChecker[] {
  if (Array.isArray(stream?.autoCheckers) && stream.autoCheckers.length > 0) {
    return stream.autoCheckers.map((checker) => newAutoChecker(checker));
  }

  if (stream?.isAutoEnabled || stream?.youtubeChannelId) {
    return [
      newAutoChecker({
        id: 'legacy',
        name: 'Auto checker',
        enabled: !!stream.isAutoEnabled,
        youtubeChannelId: stream.youtubeChannelId || '',
        recurrencePattern: stream.recurrencePattern || 'weekly',
        recurrenceDay: stream.recurrenceDay || 'Sunday',
        recurrenceWeekOfMonth: stream.recurrenceWeekOfMonth || '1st',
        time: stream.time || '10:00',
        checkIntervalSeconds: stream.checkIntervalSeconds || 30,
        checkWindowMinutes: stream.checkWindowMinutes || 30,
      }),
    ];
  }

  return [];
}

const DEFAULT_INTERVAL = 30;
const DEFAULT_WINDOW = 30;

/** Non-IT saves keep the existing interval/window. */
export function lockLiveFrequency(body: any, existing?: any) {
  const existingCheckers = Array.isArray(existing?.autoCheckers) ? existing.autoCheckers : [];
  if (Array.isArray(body.autoCheckers)) {
    body.autoCheckers = body.autoCheckers.map((checker: any) => {
      const previous = existingCheckers.find((c: any) => c.id === checker.id);
      return {
        ...checker,
        checkIntervalSeconds: previous?.checkIntervalSeconds || DEFAULT_INTERVAL,
        checkWindowMinutes: previous?.checkWindowMinutes || DEFAULT_WINDOW,
      };
    });
  }
  body.checkIntervalSeconds = existing?.checkIntervalSeconds || DEFAULT_INTERVAL;
  body.checkWindowMinutes = existing?.checkWindowMinutes || DEFAULT_WINDOW;
  return body;
}

export function syncLegacyAutoFields(checkers: LiveAutoChecker[]) {
  const firstEnabled = checkers.find((c) => c.enabled) || checkers[0];
  return {
    autoCheckers: checkers,
    isAutoEnabled: checkers.some((c) => c.enabled && !!c.youtubeChannelId),
    youtubeChannelId: firstEnabled?.youtubeChannelId || '',
    recurrencePattern: firstEnabled?.recurrencePattern || 'weekly',
    recurrenceDay: firstEnabled?.recurrenceDay || 'Sunday',
    recurrenceWeekOfMonth: firstEnabled?.recurrenceWeekOfMonth || '1st',
    time: firstEnabled?.time || '10:00',
    checkIntervalSeconds: firstEnabled?.checkIntervalSeconds || 30,
    checkWindowMinutes: firstEnabled?.checkWindowMinutes || 30,
  };
}
