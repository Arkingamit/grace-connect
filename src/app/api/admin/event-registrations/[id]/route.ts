import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import EventRegistration from '@/models/EventRegistration';
import User from '@/models/User';
import EventModel from '@/models/Event';
import { FIELD_LIMITS, clampEventResponses } from '@/lib/field-limits';

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
    const event = existing.eventId
      ? await EventModel.findById(existing.eventId).select('formFields').lean()
      : null;

    // Whitelist allowed update fields to prevent tampering with status, eventId, etc.
    const allowedFields: Record<string, any> = {};
    if (body.formData !== undefined) allowedFields.formData = body.formData;
    if (body.responses !== undefined) {
      allowedFields.responses = clampEventResponses(body.responses, (event as any)?.formFields);
    }
    if (body.userName !== undefined) allowedFields.userName = String(body.userName).slice(0, FIELD_LIMITS.name);
    if (body.userEmail !== undefined) allowedFields.userEmail = String(body.userEmail).slice(0, FIELD_LIMITS.email);
    if (body.status !== undefined && isAdmin) allowedFields.status = body.status; // Only admins can update status
    if (body.notes !== undefined && isAdmin) allowedFields.notes = body.notes;

    const updated = await EventRegistration.findByIdAndUpdate(
      id,
      { $set: allowedFields },
      { returnDocument: 'after' }
    );

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update event registration' }, { status: 500 });
  }
}
