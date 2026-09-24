import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import { WorshipVideo } from '@/models/Media';
import { notifyMembers, takeSendNotificationFlag } from '@/lib/notify-members';

export async function GET() {
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
    const sendNotification = takeSendNotificationFlag(body);
    const item = await WorshipVideo.create(body);

    if (sendNotification) {
      await notifyMembers({
        title: `New Worship Video: ${item.title}`,
        message: 'A new worship video has been added.',
        type: 'new_worship_video',
        sourceId: item._id.toString(),
        targetCampuses: ['all'],
        targetGroups: [],
      });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
