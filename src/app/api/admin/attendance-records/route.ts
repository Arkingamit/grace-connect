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
    if (!user || !['campus_leader', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attSession = await AttendanceSession.findById(sessionId);
    if (!attSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (user.role === 'campus_leader' && attSession.campusId !== user.campusId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const records = await AttendanceRecord.find({ sessionId }).sort({ markedAt: -1 }).lean();
    
    // Fetch rich user details for each record
    const userIds = records.map(r => r.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email gender birthday maritalStatus familyMemberId')
      .lean();
    const userMap = users.reduce((acc, u) => {
      acc[u._id.toString()] = u;
      return acc;
    }, {} as Record<string, any>);

    const enrichedRecords = records.map(r => ({
      ...r,
      user: userMap[r.userId] || { name: 'Unknown User', email: '', gender: '', birthday: '', maritalStatus: '' }
    }));

    return NextResponse.json(enrichedRecords);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}
