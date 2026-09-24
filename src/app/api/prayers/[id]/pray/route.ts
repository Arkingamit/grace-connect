import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import PrayerRequest from '@/models/PrayerRequest';
import { verifySession } from '@/lib/auth-utils';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    const session = await verifySession();
    // Track who prayed by userId if logged in, or IP if guest
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const identifier = session.isAuth && session.userId ? session.userId : ip;

    const prayer = await PrayerRequest.findById(id);
    if (!prayer) {
      return NextResponse.json({ error: 'Prayer request not found' }, { status: 404 });
    }

    const alreadyPrayed = prayer.prayedBy.some((id: string) => String(id) === String(identifier));

    if (alreadyPrayed) {
      prayer.prayedBy = prayer.prayedBy.filter((id: string) => String(id) !== String(identifier));
      prayer.prayedCount = Math.max(0, prayer.prayedBy.length);
      await prayer.save();
      return NextResponse.json({ success: true, prayed: false, prayedCount: prayer.prayedCount });
    }

    prayer.prayedBy.push(identifier);
    prayer.prayedCount = prayer.prayedBy.length;
    await prayer.save();

    return NextResponse.json({ success: true, prayed: true, prayedCount: prayer.prayedCount });
  } catch (error) {
    console.error('Error recording prayer:', error);
    return NextResponse.json({ error: 'Failed to record prayer' }, { status: 500 });
  }
}
