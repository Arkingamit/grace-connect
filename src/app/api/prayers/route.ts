import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import PrayerRequest from '@/models/PrayerRequest';
import User from '@/models/User';
import Campus from '@/models/Campus';
import { verifySession } from '@/lib/auth-utils';
import { prayerRequestSchema } from '@/lib/validations';
import { FIELD_LIMITS, PRAYER_FIELD_LIMITS } from '@/lib/field-limits';
import { sendPushToUsers } from '@/lib/push-utils';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const session = await verifySession();

    // Derive allowed privacy levels from the JWT role
    const allowedPrivacy: Array<'public' | 'members' | 'staff'> = ['public'];
    let userRole: string | undefined = undefined;
    let userGroups: string[] = [];
    let isStaff = false;

    if (session.isAuth && session.userId) {
      userRole = session.role;
      if (userRole === 'member' || userRole === 'group_leader' || userRole === 'campus_leader' || userRole === 'admin' || userRole === 'super_admin') {
        allowedPrivacy.push('members');
      }
      if (userRole === 'campus_leader' || userRole === 'admin' || userRole === 'super_admin') {
        allowedPrivacy.push('staff');
        isStaff = true;
      }

      // Fetch user groups for group-scoped prayers
      const userDoc = await User.findById(session.userId, { groups: 1, role: 1 }).lean();
      if (userDoc) {
        userGroups = (userDoc as any).groups || [];
      }
    }

    const prayers = await PrayerRequest.find({
      privacy: { $in: allowedPrivacy },
      status: 'approved',
    })
      .sort({ createdAt: -1 })
      .lean();

    // Filter by target groups (unless staff or open to all)
    const filteredPrayers = prayers.filter((p: any) => {
      if (isStaff) return true;
      const targetGrps = Array.isArray(p.targetGroups) ? p.targetGroups : [];
      if (targetGrps.length === 0 || targetGrps.includes('all')) return true;
      if (!session.isAuth) return false;
      return targetGrps.some((g: string) => userGroups.includes(g));
    });

    const mappedPrayers = filteredPrayers.map((p: any) => {
      const isAnon = !!p.isAnonymous;
      const mapped: any = {
        ...p,
        id: p._id.toString(),
        authorName: isAnon ? 'Anonymous' : (p.authorName || 'Anonymous'),
        isAnonymous: isAnon,
        targetGroups: Array.isArray(p.targetGroups) ? p.targetGroups : [],
        isBroadcast: !!p.isBroadcast,
      };

      // Strict privacy sanitization: public members NEVER see submitter identity
      delete mapped.submitterName;
      delete mapped.submitterEmail;
      delete mapped.submitterPhone;
      if (isAnon) {
        delete mapped.authorId;
      }

      return mapped;
    });

    return NextResponse.json(mappedPrayers);
  } catch (error) {
    console.error('Error fetching prayer requests:', error);
    return NextResponse.json({ error: 'Failed to fetch prayer requests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const parseResult = prayerRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const session = await verifySession();

    let authorName = 'Anonymous';
    let authorId: string | undefined = undefined;
    let submitterName: string | undefined = undefined;
    let submitterEmail: string | undefined = undefined;
    let submitterPhone: string | undefined = undefined;
    let campusId = data.campusId || 'global';
    let targetGroups: string[] = [];

    if (session.isAuth && session.userId) {
      const user = await User.findById(session.userId, {
        firstName: 1,
        lastName: 1,
        name: 1,
        email: 1,
        phone: 1,
        campusId: 1,
        groups: 1,
      }).lean();

      if (user) {
        authorId = session.userId;
        campusId = (user as any).campusId || campusId;
        const realName = (user as any).name || `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || (user as any).email;
        submitterName = realName;
        submitterEmail = (user as any).email;
        submitterPhone = (user as any).phone;

        if (data.isAnonymous) {
          authorName = 'Anonymous';
        } else {
          authorName = data.authorName || realName || 'Anonymous';
        }

        // Validate user requested groups against their assigned groups
        const userGroups: string[] = (user as any).groups || [];
        if (Array.isArray(data.targetGroups)) {
          targetGroups = data.targetGroups.filter((g: string) => userGroups.includes(g));
        }
      }
    } else {
      // Guest submission
      submitterName = data.submitterName || (data.isAnonymous ? 'Guest Submitter' : (data.authorName || 'Guest'));
      submitterEmail = data.submitterEmail;
      submitterPhone = data.submitterPhone;
      authorName = data.isAnonymous ? 'Anonymous' : (data.authorName || 'Anonymous');
    }

    let broadcastScope = data.broadcastScope || (targetGroups.length > 0 ? 'group' : 'campus');
    let targetCampuses: string[] = Array.isArray(data.targetCampuses) ? data.targetCampuses : [];

    // Verify campus leader broadcast permission
    if (campusId && campusId !== 'global') {
      try {
        const campusDoc = await Campus.findById(campusId, { prayerBroadcastLevel: 1 }).lean();
        const allowedLevel = (campusDoc as any)?.prayerBroadcastLevel || 'all_campuses';
        if (allowedLevel === 'group_only') {
          broadcastScope = 'group';
        } else if (allowedLevel === 'campus_only' && broadcastScope === 'all_campuses') {
          broadcastScope = 'campus';
        }
      } catch (err) {
        console.warn('Could not check campus broadcast level:', err);
      }
    }

    if (broadcastScope === 'all_campuses') {
      targetCampuses = ['all'];
      targetGroups = [];
    } else if (broadcastScope === 'campus') {
      targetCampuses = [campusId];
      targetGroups = [];
    } else if (broadcastScope === 'group') {
      targetCampuses = [campusId];
    }

    const prayer = await PrayerRequest.create({
      title: data.title.slice(0, PRAYER_FIELD_LIMITS.title),
      content: data.content.slice(0, PRAYER_FIELD_LIMITS.content),
      isAnonymous: !!data.isAnonymous,
      privacy: data.privacy || 'public',
      category: data.category || 'General',
      authorName: String(authorName).slice(0, FIELD_LIMITS.name),
      authorId,
      submitterName,
      submitterEmail,
      submitterPhone,
      campusId,
      targetCampuses,
      targetGroups,
      broadcastScope,
      isBroadcast: targetGroups.length > 0 || broadcastScope === 'all_campuses',
      status: 'pending',
    });

    // Notify authorized campus leaders and admins who can accept prayers for this campus
    try {
      const targetCampus = prayer.campusId || 'global';
      const leaderCriteria: any[] = [
        { role: { $in: ['admin', 'super_admin'] } },
        { permissions: 'prayers:global' },
      ];

      if (targetCampus && targetCampus !== 'global') {
        leaderCriteria.push(
          { role: 'campus_leader', campusId: targetCampus },
          { permissions: `prayers:${targetCampus}` }
        );
      } else {
        leaderCriteria.push({ role: 'campus_leader' });
      }

      const authorizedUsers = await User.find({
        status: 'approved',
        $or: leaderCriteria,
      }, { _id: 1 }).lean();

      const leaderUserIds = authorizedUsers.map((u: any) => u._id.toString());
      if (leaderUserIds.length > 0) {
        let campusName = '';
        if (targetCampus && targetCampus !== 'global') {
          const campusDoc = await Campus.findById(targetCampus, { name: 1 }).lean();
          if (campusDoc) campusName = (campusDoc as any).name;
        }

        const prayerTitleDisplay = prayer.title.length > 35 ? `${prayer.title.slice(0, 32)}...` : prayer.title;
        await sendPushToUsers({
          title: '🙏 New Prayer Request to Review',
          body: `"${prayerTitleDisplay}" from ${authorName} needs review${campusName ? ` (${campusName})` : ''}.`,
          type: 'admin_prayer_review',
          sourceId: prayer._id.toString(),
          url: '/admin/prayers',
        }, leaderUserIds);
      }
    } catch (notifyErr) {
      console.warn('[prayers] Failed to send push notification to authorized prayer reviewers:', notifyErr);
    }

    return NextResponse.json(prayer, { status: 201 });
  } catch (error) {
    console.error('Error creating prayer request:', error);
    return NextResponse.json({ error: 'Failed to create prayer request' }, { status: 500 });
  }
}
