import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AttendanceSession from '@/models/AttendanceSession';
import User from '@/models/User';
import { verifySession } from '@/lib/auth-utils';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId);
    if (!user || !['campus_leader', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attSession = await AttendanceSession.findById(id);
    if (!attSession) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (user.role === 'campus_leader' && attSession.campusId !== user.campusId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    Object.assign(attSession, body);
    await attSession.save();

    return NextResponse.json(attSession);
  } catch (error) {
    console.error('Error updating attendance session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    const session = await verifySession();
    if (!session.isAuth || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId);
    if (!user || !['campus_leader', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attSession = await AttendanceSession.findById(id);
    if (!attSession) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (user.role === 'campus_leader' && attSession.campusId !== user.campusId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await AttendanceSession.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attendance session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
