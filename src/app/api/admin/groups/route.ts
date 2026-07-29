import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminWithScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import Group from '@/models/Group';

async function ensureGroupIndexes() {
  try {
    // Old schema had unique on name alone — drop so campus groups can share a Core name
    await Group.collection.dropIndex('name_1');
  } catch {
    // Index may not exist
  }
  await Group.syncIndexes();
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    await ensureGroupIndexes();
    const groups = await Group.find({}).sort({ createdAt: 1 });
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
    await ensureGroupIndexes();
    const body = await req.json();
    const scope =
      admin.role === 'campus_leader' ? admin.campusId : (body.scope || 'global');

    let name = (body.name || '').trim();
    let coreGroupId: string | null = null;

    // Campus FASL group linked to a Core (global) group
    if (scope !== 'global' && body.coreGroupId) {
      const core = await Group.findById(body.coreGroupId);
      if (!core || core.scope !== 'global') {
        return NextResponse.json({ error: 'Invalid core group' }, { status: 400 });
      }
      const alreadyLinked = await Group.findOne({
        scope,
        coreGroupId: core._id,
      });
      if (alreadyLinked) {
        return NextResponse.json(
          { error: `This campus already has a FASL group linked to "${core.name}"` },
          { status: 409 }
        );
      }
      name = core.name;
      coreGroupId = String(core._id);
    }

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Creating a Core group must not carry a core link
    if (scope === 'global') {
      coreGroupId = null;
    }

    const group = await Group.create({
      name,
      scope,
      coreGroupId: coreGroupId || null,
    });

    let appointedLeader: any = null;
    if (body.leaderId) {
      const User = (await import('@/models/User')).default;
      const leader = await User.findById(body.leaderId);
      if (!leader) {
        return NextResponse.json(
          { ...group.toObject(), warning: 'Group created but leader was not found' },
          { status: 201 }
        );
      }

      const canElevate =
        leader.role === 'member' || leader.role === 'group_leader';
      const leaderCampusId = scope === 'global' ? 'global' : scope;
      const nextGroups = Array.from(
        new Set([...(leader.groups || []), group.name])
      );

      const update: Record<string, unknown> = { groups: nextGroups };
      if (canElevate) {
        update.role = 'group_leader';
        update.campusId = leaderCampusId;
      }

      appointedLeader = await User.findByIdAndUpdate(
        body.leaderId,
        update,
        { new: true, projection: { password: 0 } }
      ).lean();
    }

    return NextResponse.json(
      {
        ...group.toObject(),
        leader: appointedLeader
          ? {
              id: String(appointedLeader._id),
              name:
                appointedLeader.name ||
                `${appointedLeader.firstName || ''} ${appointedLeader.lastName || ''}`.trim(),
              role: appointedLeader.role,
              campusId: appointedLeader.campusId,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A group with this name already exists for this scope' },
        { status: 409 }
      );
    }
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
