import type { FlipCardItem } from '@/lib/types';

export const HIGHLIGHT_DURATION_OPTIONS = [
  { value: 6, label: '6 hours' },
  { value: 12, label: '12 hours' },
  { value: 24, label: '1 day' },
  { value: 48, label: '2 days' },
  { value: 72, label: '3 days' },
  { value: 168, label: '1 week' },
  { value: 336, label: '2 weeks' },
  { value: 0, label: 'Forever' },
] as const;

export type HighlightPublishFields = {
  showOnHighlight: boolean;
  highlightDurationHours: number;
  highlightExpiresAt?: string | null;
};

export const DEFAULT_HIGHLIGHT_FIELDS: HighlightPublishFields = {
  showOnHighlight: false,
  highlightDurationHours: 24,
  highlightExpiresAt: null,
};

export function computeHighlightExpiresAt(
  showOnHighlight: boolean,
  durationHours: number,
  from: Date = new Date(),
): string | null {
  if (!showOnHighlight) return null;
  // 0 = Forever (no expiry)
  if (!Number(durationHours) || Number(durationHours) <= 0) return null;
  return new Date(from.getTime() + Number(durationHours) * 60 * 60 * 1000).toISOString();
}

export function withHighlightExpiry<T extends HighlightPublishFields>(fields: T): T {
  return {
    ...fields,
    highlightExpiresAt: computeHighlightExpiresAt(
      fields.showOnHighlight,
      fields.highlightDurationHours,
    ),
  };
}

export function isHighlightActive(item: {
  showOnHighlight?: boolean;
  highlightExpiresAt?: string | Date | null;
}): boolean {
  if (!item?.showOnHighlight) return false;
  // No expiry date = Forever
  if (!item.highlightExpiresAt) return true;
  return new Date(item.highlightExpiresAt).getTime() > Date.now();
}

type HighlightSource = {
  id: string;
  title?: string;
  description?: string;
  content?: string;
  showOnHighlight?: boolean;
  highlightExpiresAt?: string | Date | null;
  targetCampuses?: string[];
  targetGroups?: string[];
  excludeCampuses?: string[];
  excludeGroups?: string[];
};

export function contentToHighlightItems(args: {
  events?: HighlightSource[];
  announcements?: HighlightSource[];
  sermons?: HighlightSource[];
  worshipVideos?: HighlightSource[];
  notes?: HighlightSource[];
}): FlipCardItem[] {
  const items: FlipCardItem[] = [];

  const audienceOf = (src: HighlightSource) => ({
    targetCampuses: src.targetCampuses?.length ? src.targetCampuses : ['all'],
    targetGroups: src.targetGroups?.length ? src.targetGroups : ['all'],
    excludeCampuses: src.excludeCampuses || [],
    excludeGroups: src.excludeGroups || [],
    highlightExpiresAt: src.highlightExpiresAt
      ? String(src.highlightExpiresAt)
      : null,
  });

  for (const event of args.events || []) {
    if (!isHighlightActive(event)) continue;
    items.push({
      id: `pub-event-${event.id}`,
      type: 'event',
      itemId: event.id,
      title: event.title,
      description: event.description,
      buttonText: 'View Event',
      buttonLink: '/events',
      ...audienceOf(event),
    });
  }

  for (const ann of args.announcements || []) {
    if (!isHighlightActive(ann)) continue;
    items.push({
      id: `pub-announcement-${ann.id}`,
      type: 'announcement',
      itemId: ann.id,
      title: ann.title,
      description: ann.content || ann.description,
      buttonText: 'Read Announcement',
      buttonLink: '/announcements',
      ...audienceOf(ann),
    });
  }

  for (const sermon of args.sermons || []) {
    if (!isHighlightActive(sermon)) continue;
    items.push({
      id: `pub-sermon-${sermon.id}`,
      type: 'sermon',
      itemId: sermon.id,
      title: sermon.title,
      description: sermon.description,
      buttonText: 'Watch Sermon',
      buttonLink: '/sermons',
      ...audienceOf(sermon),
    });
  }

  for (const video of args.worshipVideos || []) {
    if (!isHighlightActive(video)) continue;
    items.push({
      id: `pub-worship-${video.id}`,
      type: 'worship_video',
      itemId: video.id,
      title: video.title,
      description: video.description || 'Join us in worship',
      buttonText: 'Watch Video',
      buttonLink: '/',
      ...audienceOf(video),
    });
  }

  for (const note of args.notes || []) {
    if (!isHighlightActive(note)) continue;
    items.push({
      id: `pub-note-${note.id}`,
      type: 'note',
      itemId: note.id,
      title: note.title,
      description: note.description || note.content,
      buttonText: 'Open Note',
      buttonLink: '/#notes',
      ...audienceOf(note),
    });
  }

  return items;
}

/** Manual flip-card items + publisher-opted content, de-duped by type+itemId. */
export function mergeHighlightItems(
  manualItems: FlipCardItem[] = [],
  publishedItems: FlipCardItem[] = [],
): FlipCardItem[] {
  const seen = new Set<string>();
  const merged: FlipCardItem[] = [];

  for (const item of [...publishedItems, ...manualItems]) {
    const key = item.itemId ? `${item.type}:${item.itemId}` : `id:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

/**
 * Manual highlight time window:
 * - highlightExpiresAt in the future → active
 * - no highlightExpiresAt → forever / legacy → active
 * - expired → inactive
 */
export function isManualHighlightActive(item: FlipCardItem): boolean {
  if (item.highlightExpiresAt) {
    return new Date(item.highlightExpiresAt).getTime() > Date.now();
  }
  return true;
}

export function isManualHighlightVisible(
  item: FlipCardItem,
  campusId: string,
  userGroups: string[],
  role?: string,
): boolean {
  if (!isManualHighlightActive(item)) return false;
  if (role === 'super_admin' || role === 'admin') return true;

  const campuses = item.targetCampuses;
  const campusMatch =
    !campuses ||
    campuses.length === 0 ||
    campuses.includes('all') ||
    campuses.includes(campusId);
  if (!campusMatch) return false;
  if (item.excludeCampuses?.includes(campusId)) return false;

  const groups = item.targetGroups;
  const groupMatch =
    !groups ||
    groups.length === 0 ||
    groups.includes('all') ||
    groups.some((g) => userGroups.includes(g));
  if (!groupMatch) return false;
  if (item.excludeGroups?.some((g) => userGroups.includes(g))) return false;

  return true;
}

export function applyHighlightExpiryToFlipItem(item: FlipCardItem): FlipCardItem {
  const hours = item.highlightDurationHours ?? 0;
  return {
    ...item,
    highlightDurationHours: hours,
    highlightExpiresAt: computeHighlightExpiresAt(true, hours),
  };
}
