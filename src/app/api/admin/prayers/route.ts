import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import PrayerRequest from '@/models/PrayerRequest';
import { verifySession } from '@/lib/auth-utils';
import User from '@/models/User';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const session = await verifySession();
    
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId);
    if (!user || !['campus_leader', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Campus leaders only see their campus. Admins see all.
    const query: any = {};
    if (user.role === 'campus_leader') {
      query.campusId = user.campusId;
    }

    const prayers = await PrayerRequest.find(query).sort({ createdAt: -1 });
    return NextResponse.json(prayers);
  } catch (error) {
    console.error('Error fetching admin prayers:', error);
    return NextResponse.json({ error: 'Failed to fetch prayers' }, { status: 500 });
  }
}
