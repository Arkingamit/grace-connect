/**
 * Notification Deep Linking Helper
 * Resolves standard deep-link routes for each notification type across:
 * - Capacitor Native Push (Android / iOS)
 * - Web Push (Service Worker)
 * - In-app floating toasts
 * - Notifications history page (/notifications)
 */

export function getNotificationDeepLink(type?: string, sourceId?: string): string {
  if (!type) return '/notifications';

  const cleanSourceId = sourceId ? String(sourceId).trim() : '';

  switch (type) {
    case 'new_event':
    case 'event_reminder':
      return cleanSourceId ? `/events?rsvp=${encodeURIComponent(cleanSourceId)}` : '/events';

    case 'new_announcement':
    case 'recurring_announcement':
    case 'announcement':
      return cleanSourceId ? `/announcements?id=${encodeURIComponent(cleanSourceId)}` : '/announcements';

    case 'new_gallery':
    case 'gallery':
      return cleanSourceId ? `/gallery?album=${encodeURIComponent(cleanSourceId)}` : '/gallery';

    case 'new_sermon':
    case 'sermon':
      return cleanSourceId ? `/sermons?sermon=${encodeURIComponent(cleanSourceId)}` : '/sermons';

    case 'new_worship_video':
    case 'worship':
      return cleanSourceId ? `/music?video=${encodeURIComponent(cleanSourceId)}` : '/music';

    case 'new_note':
    case 'note':
    case 'broadcast':
      return cleanSourceId ? `/broadcasts?id=${encodeURIComponent(cleanSourceId)}` : '/broadcasts';

    case 'new_prayer':
    case 'prayer':
      return cleanSourceId ? `/prayer-wall?prayer=${encodeURIComponent(cleanSourceId)}` : '/prayer-wall';

    case 'live_now':
      return '/live';

    case 'attendance':
      return '/check-in';

    case 'prayer-approval':
    case 'user-approval':
    case 'system':
    case 'greeting':
    default:
      return '/notifications';
  }
}
