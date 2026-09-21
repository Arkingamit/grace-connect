export function sermonWatchHref(sermon: { id?: string; seriesId?: string | null }) {
  if (sermon.seriesId) return `/sermons/series/${sermon.seriesId}`;
  return sermon.id ? `/sermons?sermon=${encodeURIComponent(sermon.id)}` : '/sermons';
}
