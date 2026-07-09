import { NextResponse } from 'next/server';
import { requireAdminWithScope } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    
    let query: any = {};
    if (admin.role === 'campus_leader') {
      // Campus leaders see users in their campus or global users
      query = { $or: [{ campusId: admin.campusId }, { campusId: 'global' }] };
    } else if (admin.role === 'group_leader') {
      return NextResponse.json({ error: 'Group leaders cannot view the user list' }, { status: 403 });
    }

    // Exclude password, use .lean() for 30-50% faster serialization
    const users = await User.find(query, { password: 0 }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdminWithScope();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const body = await req.json();

    if (admin.role === 'campus_leader') {
      // Force campusId to match the leader's campus
      body.campusId = admin.campusId;
      
      // Enforce role appointment rules
      if (body.role && !['member', 'group_leader'].includes(body.role)) {
        return NextResponse.json({ error: 'Campus leaders can only appoint members and group leaders' }, { status: 403 });
      }
    } else if (admin.role === 'group_leader') {
      return NextResponse.json({ error: 'Group leaders cannot create users' }, { status: 403 });
    }

    // Auto-fill required fields that might be missing from the admin UI
    if (body.name && (!body.firstName || !body.lastName)) {
      const parts = body.name.trim().split(' ');
      body.firstName = parts[0] || 'Unknown';
      body.lastName = parts.slice(1).join(' ') || 'Unknown';
    }

    if (!body.gender) {
      body.gender = 'male'; // Defaulting to pass validation if missing in admin form
    }

    // Set user status to pending, and record the admin who added them.
    // The creator admin must explicitly approve this request before the user can log in.
    body.status = 'pending';
    body.createdBy = admin.userId;

    // Hash password if provided
    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      body.password = await bcrypt.hash(body.password, salt);
    }

    const user = await User.create(body);

    // Don't return password
    const userObj = user.toObject();
    delete userObj.password;

    return NextResponse.json(userObj, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
