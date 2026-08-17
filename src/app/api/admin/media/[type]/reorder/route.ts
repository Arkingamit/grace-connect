import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import { GalleryAlbum, Sermon } from '@/models/Media';
import { serverCache } from '@/lib/cache';

const models: any = {
  gallery: GalleryAlbum,
  sermons: Sermon,
};

/**
 * PUT /api/admin/media/[type]/reorder
 * Accepts { items: [{ id, sortOrder }] } and does a single bulkWrite instead of N PUT requests.
 * Replaces the N individual PUT calls from reorderGalleryAlbums / reorderSermons.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const { type } = await params;
    const Model = models[type];

    if (!Model) {
      return NextResponse.json({ error: 'Invalid media type for reorder' }, { status: 400 });
    }

    const { items } = await req.json() as { items: { id: string; sortOrder: number }[] };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 });
    }

    // Single bulkWrite instead of N individual findByIdAndUpdate calls
    const bulkOps = items.map(({ id, sortOrder }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder } },
      },
    }));

    await Model.bulkWrite(bulkOps, { ordered: false });

    // Invalidate media cache for this type
    serverCache.invalidate(`media:${type}`);

    return NextResponse.json({ success: true, updated: items.length });
  } catch (error) {
    console.error('Reorder error:', error);
    return NextResponse.json({ error: 'Failed to reorder items' }, { status: 500 });
  }
}
