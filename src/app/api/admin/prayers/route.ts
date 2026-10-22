import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import PrayerRequest from '@/models/PrayerRequest';
import { verifySession } from '@/lib/auth-utils';
import { enforceCampusScope } from '@/lib/api-auth';
import User from '@/models/User';

export async function GET(req: Request) {
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

    const hasPrayerPerm = Array.isArray(user.permissions) && user.permissions.some((p: string) => p.startsWith('prayers:'));
    const isLeadershipRole = ['campus_leader', 'admin', 'super_admin'].includes(user.role);

    if (!isLeadershipRole && !hasPrayerPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role and permission-based campus scoping
    const query: any = {};
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      const allowedCampuses = enforceCampusScope(user.role, user.campusId, undefined, user.permissions, 'prayers');
      if (!allowedCampuses.includes('all')) {
        query.campusId = { $in: allowedCampuses };
      }
    }

    const prayers = await PrayerRequest.find(query).sort({ createdAt: -1 }).lean();

    // Collect authorIds that lack submitterName so we can backfill for leaders
    const missingUserIds = prayers
      .filter((p: any) => !p.submitterName && p.authorId)
      .map((p: any) => p.authorId);

    let userMap = new Map<string, any>();
    if (missingUserIds.length > 0) {
      const users = await User.find(
        { _id: { $in: missingUserIds } },
        { firstName: 1, lastName: 1, name: 1, email: 1, phone: 1 }
      ).lean();
      users.forEach((u: any) => userMap.set(u._id.toString(), u));
    }

    const enriched = prayers.map((p: any) => {
      let submitterName = p.submitterName;
      let submitterEmail = p.submitterEmail;
      let submitterPhone = p.submitterPhone;

      if (!submitterName && p.authorId && userMap.has(p.authorId.toString())) {
        const u = userMap.get(p.authorId.toString());
        submitterName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
        submitterEmail = u.email;
        submitterPhone = u.phone;
      }

      return {
        ...p,
        id: p._id.toString(),
        submitterName: submitterName || (p.isAnonymous ? 'Anonymous Submitter' : p.authorName),
        submitterEmail,
        submitterPhone,
        targetGroups: Array.isArray(p.targetGroups) ? p.targetGroups : [],
        isBroadcast: !!p.isBroadcast,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching admin prayers:', error);
    return NextResponse.json({ error: 'Failed to fetch prayers' }, { status: 500 });
  }
}
