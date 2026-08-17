import { NextResponse } from 'next/server';
import { requireAdminWithScope } from '@/lib/api-auth';
import { memberUnderLeaderScope } from '@/lib/leader-scope';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { isFutureBirthday } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Protect super admin role
    if (targetUser.role === 'super_admin' && body.role && body.role !== 'super_admin') {
      return NextResponse.json({ error: 'Cannot change the role of a super admin' }, { status: 403 });
    }

    if (admin.role === 'campus_leader') {
      if (targetUser.campusId !== admin.campusId) {
        return NextResponse.json({ error: 'You can only edit members in your campus' }, { status: 403 });
      }
      body.campusId = admin.campusId;

      if (body.role && body.role !== targetUser.role) {
        if (!['member', 'group_leader'].includes(body.role)) {
          return NextResponse.json({ error: 'Campus leaders can only appoint members and FASL leaders' }, { status: 403 });
        }
      }
    } else if (admin.role === 'group_leader') {
      const inScope = memberUnderLeaderScope(
        { campusId: targetUser.campusId, groups: targetUser.groups || [] },
        { role: admin.role, campusId: admin.campusId, groups: admin.groups }
      );
      if (!inScope) {
        return NextResponse.json({ error: 'You can only edit members in your groups' }, { status: 403 });
      }
      // FASL / Core: edit members only — no role changes, no campus changes, no permission changes
      if (targetUser.role !== 'member' && String(targetUser._id) !== String(admin.userId)) {
        return NextResponse.json({ error: 'You can only edit members in your groups' }, { status: 403 });
      }
      body.role = targetUser.role;
      body.permissions = targetUser.permissions;
      if (admin.campusId !== 'global') {
        body.campusId = admin.campusId;
      } else {
        body.campusId = targetUser.campusId;
      }
      // Preserve groups outside this leader's assignment; only manage their own groups
      if (Array.isArray(body.groups)) {
        const outside = (targetUser.groups || []).filter((g: string) => !admin.groups.includes(g));
        const allowed = body.groups.filter((g: string) => admin.groups.includes(g));
        body.groups = [...new Set([...outside, ...allowed])];
      }
    }

    // Enforce permission scopes
    if (body.permissions && Array.isArray(body.permissions)) {
      if (admin.role === 'campus_leader') {
        // Campus leader can only assign permissions for their own campus
        const invalidPerms = body.permissions.filter((p: string) => !p.endsWith(`:${admin.campusId}`));
        if (invalidPerms.length > 0) {
          return NextResponse.json({ error: 'You can only grant module permissions for your own campus.' }, { status: 403 });
        }
      }
    }

    // Linked family profiles: email is system-managed and must not change
    const isLinkedEmail =
      typeof targetUser.email === 'string' &&
      (targetUser.email.startsWith('linked_') || targetUser.email.endsWith('@family.internal'));
    if (isLinkedEmail || targetUser.isLinkedProfile || targetUser.parentAccountId) {
      body.email = targetUser.email;
    }

    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      body.password = await bcrypt.hash(body.password, salt);
    }

    if (body.status === 'rejected') {
      body.rejectedAt = new Date();
      if (!body.rejectionReason) {
        return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 });
      }
      if (body.rejectionReason === 'other' && !String(body.rejectionNote || '').trim()) {
        return NextResponse.json({ error: 'Please specify the rejection reason' }, { status: 400 });
      }
    }

    if (body.status === 'approved') {
      body.rejectionReason = '';
      body.rejectionNote = '';
      body.rejectedAt = null;
    }

    if (body.birthday && isFutureBirthday(body.birthday)) {
      return NextResponse.json({ error: 'Birthday cannot be in the future' }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(id, body, { new: true, select: '-password' });

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const { id } = await params;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot delete a super admin account' }, { status: 403 });
    }

    if (admin.role === 'campus_leader') {
      if (targetUser.campusId !== admin.campusId) {
        return NextResponse.json({ error: 'You can only delete members in your campus' }, { status: 403 });
      }
    } else if (admin.role === 'group_leader') {
      return NextResponse.json({ error: 'FASL / Core Team leaders cannot delete members' }, { status: 403 });
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
