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
      // Campus leaders: only members at their campus
      query = { campusId: admin.campusId };
    } else if (admin.role === 'group_leader') {
      if (admin.groups.length === 0) {
        return NextResponse.json([]);
      }
      if (admin.campusId === 'global') {
        // Core Team Leader: members in their groups across all campuses
        query = { groups: { $in: admin.groups } };
      } else {
        // FASL Leader: members in their campus who are in their assigned groups
        query = { campusId: admin.campusId, groups: { $in: admin.groups } };
      }
    }

    // Exclude password, use .lean() for 30-50% faster serialization
    const users = await User.find(query, { password: 0 }).sort({ createdAt: -1 }).lean();

    // Resolve parent names for linked/family profiles (parent may be outside the filtered set)
    const parentIds = Array.from(new Set(
      users
        .map((u: any) => {
          if (u.parentAccountId) return String(u.parentAccountId);
          // Fallback: parse parent id from placeholder email linked_<parentId>_<ts>@family.internal
          const email = typeof u.email === 'string' ? u.email : '';
          const match = email.match(/^linked_([a-f\d]{24})_/i);
          return match?.[1] || null;
        })
        .filter(Boolean) as string[]
    ));

    let parentNameById: Record<string, string> = {};
    if (parentIds.length > 0) {
      const parents = await User.find(
        { _id: { $in: parentIds } },
        { name: 1, firstName: 1, lastName: 1, middleName: 1 }
      ).lean();
      parentNameById = Object.fromEntries(
        parents.map((p: any) => [
          String(p._id),
          p.name || `${p.firstName || ''} ${p.middleName ? p.middleName + ' ' : ''}${p.lastName || ''}`.trim() || 'Unknown',
        ])
      );
    }

    const enriched = users.map((u: any) => {
      const parentId = u.parentAccountId
        ? String(u.parentAccountId)
        : (typeof u.email === 'string' ? u.email.match(/^linked_([a-f\d]{24})_/i)?.[1] : undefined);
      return {
        ...u,
        parentAccountId: parentId || u.parentAccountId,
        parentName: parentId ? parentNameById[parentId] : undefined,
        isLinkedProfile: !!u.isLinkedProfile || (typeof u.email === 'string' && (u.email.startsWith('linked_') || u.email.endsWith('@family.internal'))),
      };
    });

    return NextResponse.json(enriched);
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
        return NextResponse.json({ error: 'Campus leaders can only appoint members and FASL leaders' }, { status: 403 });
      }
    } else if (admin.role === 'group_leader') {
      return NextResponse.json({ error: 'FASL / Core Team leaders cannot create users' }, { status: 403 });
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

    // Enforce permission scopes
    if (body.permissions && Array.isArray(body.permissions)) {
      if (admin.role === 'campus_leader') {
        const invalidPerms = body.permissions.filter((p: string) => !p.endsWith(`:${admin.campusId}`));
        if (invalidPerms.length > 0) {
          return NextResponse.json({ error: 'You can only grant module permissions for your own campus.' }, { status: 403 });
        }
      }
    }

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
