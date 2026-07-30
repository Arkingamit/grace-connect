import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminWithScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import Group from '@/models/Group';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role === 'group_leader') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (admin.role === 'campus_leader' && group.scope !== admin.campusId) {
      return NextResponse.json({ error: 'Forbidden: Different campus' }, { status: 403 });
    }

    const oldName = group.name;
    group.name = body.name || group.name;
    if (admin.role !== 'campus_leader') {
      group.scope = body.scope || group.scope;
    }
    
    await group.save();

    if (oldName !== group.name) {
      const User = (await import('@/models/User')).default;
      await User.updateMany(
        { groups: oldName },
        { $set: { "groups.$": group.name } }
      );
    }

    return NextResponse.json(group);
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A group with this name already exists' }, { status: 409 });
    }
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (admin.role === 'group_leader') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const { id } = await params;
    const group = await Group.findById(id);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (admin.role === 'campus_leader' && group.scope !== admin.campusId) {
      return NextResponse.json({ error: 'Forbidden: Different campus' }, { status: 403 });
    }

    await Group.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
