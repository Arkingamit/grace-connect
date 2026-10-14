import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { GalleryAlbum } from '@/models/Media';
import User from '@/models/User';
import { verifySession } from '@/lib/auth-utils';
import { serverCache } from '@/lib/cache';
import { extractYoutubeVideoId, youtubeThumbnailUrl } from '@/lib/youtube';
import { notifyMembers } from '@/lib/notify-members';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'You must be signed in to upload videos to the gallery' }, { status: 401 });
    }

    const body = await req.json();
    const { title, videoUrl, category, description, campusId } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Video title is required' }, { status: 400 });
    }

    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.trim()) {
      return NextResponse.json({ error: 'YouTube video URL is required' }, { status: 400 });
    }

    const videoId = extractYoutubeVideoId(videoUrl);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube video URL. Please provide a valid YouTube link.' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findById(session.userId).select('role campusId groups name').lean();
    const userCampus = (user as any)?.campusId || 'all';

    const cleanVideoUrl = videoUrl.trim();
    const coverImage = body.coverImage?.trim() || youtubeThumbnailUrl(videoId);

    // Form target campuses: if leader/admin chose campusId, use it; otherwise default to all or user's campus
    let targetCampuses = ['all'];
    if (campusId && campusId !== 'all') {
      targetCampuses = [campusId];
    } else if (userCampus && userCampus !== 'global' && userCampus !== 'all' && (user as any)?.role === 'campus_leader') {
      targetCampuses = [userCampus];
    }

    const album = await GalleryAlbum.create({
      title: title.trim(),
      description: (description || '').trim(),
      url: cleanVideoUrl,
      videoUrl: cleanVideoUrl,
      category: category || 'General',
      coverImage,
      duration: body.duration || '',
      viewCount: body.viewCount || '',
      date: body.date || '',
      mediaType: 'videos',
      targetCampuses,
      targetGroups: ['all'],
      sortOrder: 0,
    });

    serverCache.invalidate('media:gallery');

    // Optional notification
    if (body.sendNotification) {
      try {
        await notifyMembers({
          title: `New Video: ${album.title}`,
          message: album.description || 'A new video has been added to the gallery.',
          type: 'new_gallery',
          sourceId: album._id.toString(),
          targetCampuses: album.targetCampuses || ['all'],
          targetGroups: album.targetGroups || [],
        });
      } catch (e) {
        console.warn('Failed to send gallery video notification:', e);
      }
    }

    return NextResponse.json(album, { status: 201 });
  } catch (error: any) {
    console.error('Error creating gallery video:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload video' }, { status: 500 });
  }
}
