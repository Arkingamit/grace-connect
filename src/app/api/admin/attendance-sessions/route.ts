import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AttendanceSession from '@/models/AttendanceSession';
import User from '@/models/User';
import { verifySession } from '@/lib/auth-utils';

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

    const query: any = {};
    if (user.role === 'campus_leader') {
      query.campusId = user.campusId;
    }

    const sessions = await AttendanceSession.find(query).sort({ date: -1, startTime: -1 }).lean();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching attendance sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    
    // Default campus for campus leader if not provided or attempting to create for another
    if (user.role === 'campus_leader') {
      body.campusId = user.campusId;
    }

    body.createdBy = session.userId;

    const newSession = await AttendanceSession.create(body);
    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
