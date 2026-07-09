import { NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import EventRegistration from '@/models/EventRegistration';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const items = await EventRegistration.find({}).sort({ registeredAt: -1 });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch event registrations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const body = await req.json();

    // Prevent duplicate registrations
    const existing = await EventRegistration.findOne({ eventId: body.eventId, userEmail: body.userEmail });
    if (existing) {
      return NextResponse.json({ error: 'You are already registered for this event.' }, { status: 400 });
    }

    const item = await EventRegistration.create({ ...body, registeredAt: new Date() });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create event registration' }, { status: 500 });
  }
}
