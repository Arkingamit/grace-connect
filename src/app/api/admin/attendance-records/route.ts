import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import AttendanceRecord from '@/models/AttendanceRecord';
import AttendanceSession from '@/models/AttendanceSession';
import User from '@/models/User';
import { verifySession } from '@/lib/auth-utils';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    await connectToDatabase();
    
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId);
    if (!user || !['campus_leader', 'admin', 'super_admin', 'group_leader'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attSession = await AttendanceSession.findById(sessionId);
    if (!attSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (
      (user.role === 'campus_leader' || (user.role === 'group_leader' && user.campusId !== 'global')) &&
      attSession.campusId !== user.campusId &&
      attSession.campusId !== 'all'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const records = await AttendanceRecord.find({ sessionId }).sort({ markedAt: -1 }).lean();
    
    const targetCampuses: string[] =
      Array.isArray(attSession.targetCampuses) && attSession.targetCampuses.length > 0
        ? attSession.targetCampuses
        : attSession.campusId === 'all'
          ? ['all']
          : [attSession.campusId];
    const targetGroups: string[] =
      Array.isArray(attSession.targetGroups) && attSession.targetGroups.length > 0
        ? attSession.targetGroups
        : ['all'];
    const excludeCampuses: string[] = Array.isArray(attSession.excludeCampuses)
      ? attSession.excludeCampuses
      : [];
    const excludeGroups: string[] = Array.isArray(attSession.excludeGroups)
      ? attSession.excludeGroups
      : [];

    // Fetch users in session campus, then narrow for FASL / Core leaders
    const userQuery: any = { status: 'approved' };
    if (!targetCampuses.includes('all')) {
      userQuery.campusId = { $in: targetCampuses };
    }
    if (user.role === 'group_leader') {
      if (!user.groups || user.groups.length === 0) {
        return NextResponse.json([]);
      }
      userQuery.groups = { $in: user.groups };
      if (user.campusId !== 'global') {
        // FASL: only their campus members in their groups
        userQuery.campusId = user.campusId;
      }
      // Core (global): keep session campus filter when session is campus-scoped
      if (user.campusId === 'global' && !targetCampuses.includes('all')) {
        userQuery.campusId = { $in: targetCampuses };
      }
    }
    let allUsers = await User.find(userQuery)
      .select('name email gender birthday maritalStatus familyMemberId whatsapp campusId groups parentAccountId isLinkedProfile firstName lastName middleName')
      .lean();

    // Apply audience targeting (campuses / groups / excludes) like events & announcements
    allUsers = allUsers.filter((u: any) => {
      if (excludeCampuses.includes(u.campusId)) return false;
      const campusMatch =
        targetCampuses.includes('all') || targetCampuses.includes(u.campusId);
      if (!campusMatch) return false;
      const userGroups: string[] = Array.isArray(u.groups) ? u.groups : [];
      if (userGroups.some((g) => excludeGroups.includes(g))) return false;
      const groupMatch =
        targetGroups.includes('all') ||
        targetGroups.some((g) => userGroups.includes(g));
      return groupMatch;
    });

    // Resolve parent names for linked family profiles (same approach as /api/admin/users)
    const getParentId = (u: any): string | null => {
      if (u.parentAccountId) return String(u.parentAccountId);
      if (u.familyMemberId) return String(u.familyMemberId);
      const email = typeof u.email === 'string' ? u.email : '';
      const match = email.match(/^linked_([a-f\d]{24})_/i);
      return match?.[1] || null;
    };

    const parentIds = Array.from(
      new Set(
        allUsers
          .map((u: any) => {
            const email = typeof u.email === 'string' ? u.email : '';
            const isLinked =
              !!u.isLinkedProfile ||
              email.startsWith('linked_') ||
              email.endsWith('@family.internal');
            return isLinked ? getParentId(u) : null;
          })
          .filter(Boolean) as string[]
      )
    );

    let parentNameById: Record<string, string> = {};
    if (parentIds.length > 0) {
      const validIds = parentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      const parents = await User.find(
        { _id: { $in: validIds } },
        { name: 1, firstName: 1, lastName: 1, middleName: 1 }
      ).lean();
      parentNameById = Object.fromEntries(
        parents.map((p: any) => [
          String(p._id),
          p.name ||
            `${p.firstName || ''} ${p.middleName ? p.middleName + ' ' : ''}${p.lastName || ''}`.trim() ||
            'Unknown',
        ])
      );
    }

    // Map records by userId
    const recordMap = records.reduce((acc, r) => {
      acc[r.userId] = r;
      return acc;
    }, {} as Record<string, any>);

    const enrichedRecords = allUsers.map((u: any) => {
      const email = typeof u.email === 'string' ? u.email : '';
      const isLinkedProfile =
        !!u.isLinkedProfile ||
        email.startsWith('linked_') ||
        email.endsWith('@family.internal');
      const parentId = isLinkedProfile ? getParentId(u) : null;
      const parentName = parentId ? parentNameById[parentId] : undefined;

      return {
        ...(recordMap[u._id.toString()] || {
          _id: `unmarked_${u._id}`,
          sessionId,
          userId: u._id.toString(),
          status: 'unmarked',
          distance: 0,
          markedAt: null,
        }),
        user: {
          ...u,
          _id: u._id.toString(),
          id: u._id.toString(),
          parentAccountId: parentId || (u.parentAccountId ? String(u.parentAccountId) : undefined),
          isLinkedProfile,
          parentName: parentName || undefined,
        },
      };
    });

    // Sort: Present first, then Absent, then Unmarked, then by Name
    enrichedRecords.sort((a, b) => {
      const getStatusRank = (s: string) => s === 'present' ? 0 : s === 'absent' ? 1 : 2;
      const rankA = getStatusRank(a.status || 'present'); // existing records without status are assumed present
      const rankB = getStatusRank(b.status || 'present');
      if (rankA !== rankB) return rankA - rankB;
      return (a.user.name || '').localeCompare(b.user.name || '');
    });

    return NextResponse.json(enrichedRecords);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}
