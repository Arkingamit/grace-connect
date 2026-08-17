import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Campus from '@/models/Campus';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await connectToDatabase();
    const superAdminCount = await User.countDocuments({ role: 'super_admin' });
    return NextResponse.json({ hasSuperAdmin: superAdminCount > 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check setup status' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const superAdminCount = await User.countDocuments({ role: 'super_admin' });
    if (superAdminCount > 0) {
      return NextResponse.json({ error: 'Super admin already exists' }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, email, password, gender } = body;

    if (!firstName || !lastName || !email || !password || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for existing campuses, create default if none
    let campus = await Campus.findOne();
    if (!campus) {
      campus = await Campus.create({
        name: 'Main Campus',
        address: 'Main Campus Address',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const superAdmin = await User.create({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      password: hashedPassword,
      gender,
      role: 'super_admin',
      status: 'approved',
      campusId: campus._id.toString(),
    });

    return NextResponse.json({
      message: 'Super admin created successfully',
      user: { id: superAdmin._id, email: superAdmin.email }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create super admin' }, { status: 500 });
  }
}
