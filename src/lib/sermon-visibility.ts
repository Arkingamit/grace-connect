import { Sermon, SermonSeries } from '@/models/Media';
import { serverCache } from '@/lib/cache';

/** Mark every sermon in a series as guest-visible or members-only. */
export async function applySeriesGuestVisibility(seriesId: string, visibleToGuests: boolean) {
  if (!seriesId) return;
  await Sermon.updateMany({ seriesId }, { $set: { visibleToGuests: !!visibleToGuests } });
  serverCache.invalidate('media:sermons');
}

/** Sermons added to an Everyone series inherit that visibility. */
export async function inheritSeriesGuestVisibility(body: { seriesId?: string | null; visibleToGuests?: boolean }) {
  if (!body.seriesId) return body;
  const series = await SermonSeries.findById(body.seriesId).select('visibleToGuests').lean();
  if (series?.visibleToGuests) body.visibleToGuests = true;
  return body;
}
