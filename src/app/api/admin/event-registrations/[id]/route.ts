import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import EventRegistration from '@/models/EventRegistration';
import User from '@/models/User';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    
    const existing = await EventRegistration.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    // Only allow updating if the user is an admin OR they are the owner of the registration
    const isAdmin = ['admin', 'super_admin', 'campus_leader', 'group_leader'].includes(session.role || '');
    if (!isAdmin) {
      const user = await User.findById(session.userId);
      if (!user || existing.userEmail !== user.email) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await req.json();

    const updated = await EventRegistration.findByIdAndUpdate(
      id,
      { $set: body },
      { returnDocument: 'after' }
    );

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update event registration' }, { status: 500 });
  }
}
