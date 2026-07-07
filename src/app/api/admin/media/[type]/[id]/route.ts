import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminWithScope, enforceCampusScope, enforceGroupScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import { Sermon, SermonSeries, WorshipVideo, GalleryAlbum, LiveStream } from '@/models/Media';
import { serverCache } from '@/lib/cache';

const models: any = {
  sermons: Sermon,
  'sermon-series': SermonSeries,
  'worship-videos': WorshipVideo,
  gallery: GalleryAlbum,
  livestreams: LiveStream,
};

export async function PUT(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const { type, id } = await params;
    const Model = models[type];
    
    if (!Model) {
      return NextResponse.json({ error: 'Invalid media type' }, { status: 400 });
    }

    const body = await req.json();

    // Verify existing item scope
    const existingItem = await Model.findById(id);
    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    if ((type === 'gallery' || type === 'sermons') && admin.role === 'campus_leader') {
       if (!existingItem.targetCampuses.includes(admin.campusId) && !existingItem.targetCampuses.includes('all')) {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
       }
    } else if (type === 'livestreams' && admin.role === 'campus_leader') {
       if (existingItem.campusId !== admin.campusId) {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
       }
    }

    // Enforce scope for models that support it
    if (type === 'gallery' || type === 'sermons') {
      body.targetCampuses = enforceCampusScope(admin.role, admin.campusId, body.targetCampuses);
      body.targetGroups = enforceGroupScope(admin.role, admin.groups, body.targetGroups);
    } else if (type === 'livestreams') {
      if (admin.role === 'campus_leader' || admin.role === 'group_leader') {
        body.campusId = admin.campusId;
      }
    }

    const item = await Model.findByIdAndUpdate(id, body, { new: true });

    // Invalidate media cache for this type
    serverCache.invalidate(`media:${type}`);

    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const { type, id } = await params;
    const Model = models[type];

    if (!Model) {
      return NextResponse.json({ error: 'Invalid media type' }, { status: 400 });
    }

    const existingItem = await Model.findById(id);
    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    if ((type === 'gallery' || type === 'sermons') && admin.role === 'campus_leader') {
       if (!existingItem.targetCampuses.includes(admin.campusId) && !existingItem.targetCampuses.includes('all')) {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
       }
    } else if (type === 'livestreams' && admin.role === 'campus_leader') {
       if (existingItem.campusId !== admin.campusId) {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
       }
    }

    await Model.findByIdAndDelete(id);

    // Invalidate media cache for this type
    serverCache.invalidate(`media:${type}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
