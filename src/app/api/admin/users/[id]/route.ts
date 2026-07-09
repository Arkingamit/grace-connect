import { NextResponse } from 'next/server';
import { requireAdminWithScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

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

    // Enforce campus scope for campus leaders
    if (admin.role === 'campus_leader') {
      if (targetUser.campusId !== admin.campusId) {
        return NextResponse.json({ error: 'You can only edit users in your campus' }, { status: 403 });
      }
      
      // Enforce role appointment rules
      if (body.role && body.role !== targetUser.role) {
        if (!['member', 'group_leader'].includes(body.role)) {
          return NextResponse.json({ error: 'Campus leaders can only appoint members and group leaders' }, { status: 403 });
        }
      }
    } else if (admin.role === 'group_leader') {
      return NextResponse.json({ error: 'Group leaders cannot edit users' }, { status: 403 });
    }
    
    // Hash password if it is being updated
    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      body.password = await bcrypt.hash(body.password, salt);
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

    // Protect super admin deletion
    if (targetUser.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot delete a super admin account' }, { status: 403 });
    }

    // Enforce campus scope for campus leaders
    if (admin.role === 'campus_leader') {
      if (targetUser.campusId !== admin.campusId) {
        return NextResponse.json({ error: 'You can only delete users in your campus' }, { status: 403 });
      }
    } else if (admin.role === 'group_leader') {
      return NextResponse.json({ error: 'Group leaders cannot delete users' }, { status: 403 });
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
