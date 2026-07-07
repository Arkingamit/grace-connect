import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminWithScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import Group from '@/models/Group';

// Default groups to seed if the DB is empty
const DEFAULT_GROUPS = [
  { name: 'Young Adults', scope: 'global' },
  { name: 'Families', scope: 'global' },
  { name: 'Men', scope: 'global' },
  { name: 'Women', scope: 'global' },
  { name: 'Seniors', scope: 'global' },
  { name: 'New Members', scope: 'global' },
  { name: 'Couples', scope: 'global' },
  { name: 'Youth', scope: 'global' },
];

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    let groups = await Group.find({}).sort({ createdAt: 1 });

    // Seed default groups if collection is empty
    if (groups.length === 0) {
      groups = await Group.insertMany(DEFAULT_GROUPS);
    }

    return NextResponse.json(groups);
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role === 'group_leader') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const group = await Group.create({
      name: body.name,
      scope: admin.role === 'campus_leader' ? admin.campusId : (body.scope || 'global'),
    });
    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A group with this name already exists' }, { status: 409 });
    }
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
