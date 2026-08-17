import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import { WorshipVideo } from '@/models/Media';
import Notification from '@/models/Notification';
import { sendPushToTargeted } from '@/lib/push-utils';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const items = await WorshipVideo.find({}).sort({ createdAt: -1 });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const body = await req.json();
    const item = await WorshipVideo.create(body);

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

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
