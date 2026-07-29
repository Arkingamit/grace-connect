import { NextResponse } from 'next/server';
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
    
    // Fetch users in session campus, then narrow for FASL / Core leaders
    const userQuery: any = { status: 'approved' };
    if (attSession.campusId !== 'all') {
      userQuery.campusId = attSession.campusId;
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
      // Core (global): groups filter only — drop campus lock if session is campus-specific
      // Keep session campus filter when session is campus-scoped so Core sees that campus's group members
      if (user.campusId === 'global' && attSession.campusId !== 'all') {
        userQuery.campusId = attSession.campusId;
      }
    }
    const allUsers = await User.find(userQuery)
      .select('name email gender birthday maritalStatus familyMemberId whatsapp campusId groups')
      .lean();

    // Map records by userId
    const recordMap = records.reduce((acc, r) => {
      acc[r.userId] = r;
      return acc;
    }, {} as Record<string, any>);

    const enrichedRecords = allUsers.map(u => ({
      // If there's a record, spread it, otherwise just provide the user data
      // We set status to 'unmarked' if no record exists
      ...(recordMap[u._id.toString()] || { 
        _id: `unmarked_${u._id}`, 
        sessionId, 
        userId: u._id.toString(), 
        status: 'unmarked',
        distance: 0,
        markedAt: null,
      }),
      user: u
    }));

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
