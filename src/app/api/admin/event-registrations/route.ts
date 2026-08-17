import { NextResponse } from 'next/server';
import { requireAdminWithScope, requireAuth } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import EventRegistration from '@/models/EventRegistration';
import User from '@/models/User';

export async function GET() {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const items = await EventRegistration.find({}).sort({ registeredAt: -1 }).lean();

    // Admins / campus leaders see all (campus leaders may still see cross-event regs;
    // event list itself is separately scoped in the UI).
    if (admin.role !== 'group_leader') {
      return NextResponse.json(items);
    }

    if (!admin.groups.length) {
      return NextResponse.json([]);
    }

    // Same scope as /api/admin/users — FASL: campus + groups; Core: groups across campuses
    const userQuery: Record<string, unknown> =
      admin.campusId === 'global'
        ? { groups: { $in: admin.groups } }
        : { campusId: admin.campusId, groups: { $in: admin.groups } };

    const scopedUsers = await User.find(userQuery).select('_id email').lean();
    const allowedIds = new Set(scopedUsers.map((u) => String(u._id)));
    const allowedEmails = new Set(
      scopedUsers.map((u) => (u.email || '').toLowerCase()).filter(Boolean)
    );

    const scoped = items.filter((reg) => {
      if (reg.userId && allowedIds.has(String(reg.userId))) return true;
      return allowedEmails.has((reg.userEmail || '').toLowerCase());
    });

    return NextResponse.json(scoped);
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
