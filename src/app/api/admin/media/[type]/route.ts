import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminWithScope, requireAuth, enforceCampusScope, enforceGroupScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import { Sermon, SermonSeries, WorshipVideo, GalleryAlbum, LiveStream } from '@/models/Media';
import Notification from '@/models/Notification';
import { sendPushToTargeted } from '@/lib/push-utils';
import { serverCache, CACHE_TTL } from '@/lib/cache';
import { fetchGooglePhotosCover } from '@/lib/google-photos';

export const dynamic = 'force-dynamic';

const models: any = {
  sermons: Sermon,
  'sermon-series': SermonSeries,
  'worship-videos': WorshipVideo,
  gallery: GalleryAlbum,
  livestreams: LiveStream,
};

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { type } = await params;

    // Check in-memory cache first
    const cacheKey = `media:${type}`;
    const cached = serverCache.get(cacheKey);
    if (cached) return NextResponse.json(cached);

    await connectToDatabase();
    const Model = models[type];

    if (!Model) {
      return NextResponse.json({ error: 'Invalid media type' }, { status: 400 });
    }

    // .lean() returns plain JS objects — 30-50% faster than full Mongoose documents
    const items = await Model.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();

    // Use shorter TTL for livestreams since they're real-time
    const ttl = type === 'livestreams' ? CACHE_TTL.LIVESTREAMS : CACHE_TTL.SERMONS;
    serverCache.set(cacheKey, items, ttl, ['media']);

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const { type } = await params;
    const Model = models[type];

    if (!Model) {
      return NextResponse.json({ error: 'Invalid media type' }, { status: 400 });
    }

    const body = await req.json();

    // Enforce scope for models that support it
    if (type === 'gallery' || type === 'sermons') {
      body.targetCampuses = enforceCampusScope(admin.role, admin.campusId, body.targetCampuses, admin.permissions, type);
      body.targetGroups = enforceGroupScope(admin.role, admin.groups, body.targetGroups, admin.permissions, type);
    } else if (type === 'livestreams') {
      if (admin.role === 'campus_leader' || admin.role === 'group_leader') {
        body.campusId = admin.campusId;
      }
    }

    // Auto-fetch and store cover image so clients can show it immediately
    if (type === 'gallery' && body.url && !body.coverImage) {
      try {
        const cover = await fetchGooglePhotosCover(body.url);
        if (cover) body.coverImage = cover;
      } catch (e) {
        console.warn('Could not auto-fetch gallery cover on create:', e);
      }
    }

    const item = await Model.create(body);

    if (type === 'sermons') {
      await Notification.create({
        title: `New Sermon: ${item.title}`,
        message: `A new sermon by ${item.pastor || 'our pastor'} is available.`,
        type: 'new_sermon',
        sourceId: item._id.toString(),
        targetCampuses: item.targetCampuses || ['all'],
        targetGroups: item.targetGroups || [],
      });
      await sendPushToTargeted({
        title: `New Sermon: ${item.title}`,
        body: `A new sermon by ${item.pastor || 'our pastor'} is available.`,
        type: 'new_sermon'
      }, item.targetCampuses || ['all'], item.targetGroups || []);
    } else if (type === 'worship-videos') {
      await Notification.create({
        title: `New Worship Video: ${item.title}`,
        message: `A new worship video has been added.`,
        type: 'new_worship_video',
        sourceId: item._id.toString(),
        targetCampuses: ['all'],
        targetGroups: [],
      });
      await sendPushToTargeted({
        title: `New Worship Video: ${item.title}`,
        body: `A new worship video has been added.`,
        type: 'new_worship_video'
      }, ['all'], []);
    }

    // Invalidate media cache for this type
    serverCache.invalidate(`media:${type}`);

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
