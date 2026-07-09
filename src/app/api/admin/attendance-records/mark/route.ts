import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AttendanceRecord from '@/models/AttendanceRecord';
import AttendanceSession from '@/models/AttendanceSession';
import User from '@/models/User';
import { requireAdminWithScope } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const adminUser = await requireAdminWithScope();
    if (!adminUser || !['campus_leader', 'admin', 'super_admin'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();
    
    const body = await req.json();
    const { sessionId, userId, status } = body;

    if (!sessionId || !userId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (status !== 'present' && status !== 'absent' && status !== 'unmarked') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify campus leader scope
    if (adminUser.role === 'campus_leader' && session.campusId !== adminUser.campusId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (status === 'unmarked') {
      // If deleting the record manually
      await AttendanceRecord.deleteOne({ sessionId, userId, date: session.date });
      return NextResponse.json({ success: true, message: 'Record removed' });
    }

    // Upsert the record
    const updatedRecord = await AttendanceRecord.findOneAndUpdate(
      { sessionId, userId, date: session.date },
      { 
        $set: { 
          status, 
          method: 'manual', 
          scannedBy: adminUser.userId
        },
        $setOnInsert: { markedAt: new Date(), distance: 0 }
      },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ success: true, record: updatedRecord });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
