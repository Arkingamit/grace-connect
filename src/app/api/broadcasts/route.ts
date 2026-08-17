import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Broadcast from '@/models/Broadcast';
import User from '@/models/User';
import { verifySession } from '@/lib/auth-utils';

export async function GET() {
  try {
    await connectToDatabase();
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const campusId = user.campusId || '';
    const userGroups: string[] = user.groups || [];
    const isAdmin = ['admin', 'super_admin'].includes(user.role);

    // Fetch broadcasts targeting the user's campus or all campuses
    const broadcasts = await Broadcast.find({
      $or: [
        { targetCampuses: { $in: [campusId, 'all'] } },
        { targetCampuses: { $size: 0 } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const visible = isAdmin
      ? broadcasts
      : broadcasts.filter((item: any) => {
          if (item.excludeCampuses?.includes(campusId)) return false;
          const tg = item.targetGroups || [];
          const groupMatch =
            tg.length === 0 ||
            tg.includes('all') ||
            tg.some((g: string) => userGroups.includes(g));
          if (!groupMatch) return false;
          if (item.excludeGroups?.some((g: string) => userGroups.includes(g))) return false;
          return true;
        });

    return NextResponse.json(visible);
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
