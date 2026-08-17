import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { GalleryAlbum } from '@/models/Media';
import { serverCache } from '@/lib/cache';
import { fetchGooglePhotosAlbum, normalizeGooglePhotosUrl } from '@/lib/google-photos';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let albumUrl = searchParams.get('url');
  const albumId = searchParams.get('albumId');
  const persistCover = searchParams.get('persistCover') === '1';

  if (!albumUrl) {
    return NextResponse.json({ error: 'Album URL is required' }, { status: 400 });
  }

  if (albumUrl.trim() === '') {
    return NextResponse.json({ error: 'Album URL is empty', photos: [] }, { status: 400 });
  }

  const normalized = normalizeGooglePhotosUrl(albumUrl);
  if (!normalized) {
    console.warn(`Rejected non-Google-Photos URL: ${albumUrl.substring(0, 80)}`);
    return NextResponse.json({ error: 'URL must be a Google Photos album link', photos: [] }, { status: 400 });
  }
  albumUrl = normalized;

  try {
    console.log(`Fetching gallery photos from: ${albumUrl}`);

    const { photos, coverImage } = await fetchGooglePhotosAlbum(albumUrl);

    if (photos.length === 0) {
      return NextResponse.json({
        error: 'No photos found in the provided album URL. Make sure the album is public.',
        photos: [],
      });
    }

    // Persist cover on the album so future loads show it immediately (no skeleton)
    if (persistCover && albumId && coverImage) {
      try {
        await connectToDatabase();
        const updated = await GalleryAlbum.findByIdAndUpdate(
          albumId,
          { coverImage },
          { new: true }
        );
        if (updated) {
          serverCache.invalidate('media:gallery');
        }
      } catch (persistErr) {
        console.warn('Failed to persist gallery cover image:', persistErr);
      }
    }

    return NextResponse.json({ photos, coverImage });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return NextResponse.json({ error: 'Request to Google Photos timed out' }, { status: 504 });
    }
    console.error('Gallery API Internal Error:', error);
    return NextResponse.json({
      error: error?.message || 'Internal Server Error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: error?.message?.includes('Google Photos') ? 502 : 500 });
  }
}
