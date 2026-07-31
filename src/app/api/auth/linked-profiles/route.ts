import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifySession } from '@/lib/auth-utils';

// GET: Fetch all linked profiles for the current user
export async function GET() {
  try {
    const { isAuth, userId } = await verifySession();
    if (!isAuth || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const linkedProfiles = await User.find(
      { parentAccountId: userId },
      { password: 0 }
    ).lean();

    return NextResponse.json(
      linkedProfiles.map((p: any) => ({ ...p, id: p._id.toString(), _id: p._id.toString() }))
    );
  } catch (error: any) {
    console.error('Fetch linked profiles error:', error);
    return NextResponse.json({ error: 'Failed to fetch linked profiles' }, { status: 500 });
  }
}

// POST: Create a new linked profile under the current user
export async function POST(req: Request) {
  try {
    const { isAuth, userId } = await verifySession();
    if (!isAuth || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch the parent user to inherit campus and status
    const parentUser = await User.findById(userId).lean();
    if (!parentUser) {
      return NextResponse.json({ error: 'Parent account not found' }, { status: 404 });
    }

    const body = await req.json();
    const { firstName, middleName, lastName, gender, birthday, maritalStatus, marriageDate, campusId, phone, whatsapp } = body;

    if (!firstName || !lastName || !gender || !campusId) {
      return NextResponse.json({ error: 'First name, last name, gender, and campus are required' }, { status: 400 });
    }

    // Generate a unique placeholder email for the linked profile
    // Linked profiles don't have real emails — this is just for the unique constraint
    const placeholderEmail = `linked_${userId}_${Date.now()}@family.internal`;

    const newProfile = await User.create({
      firstName,
      middleName: middleName || '',
      lastName,
      name: `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim(),
      gender,
      birthday: birthday || '',
      maritalStatus: maritalStatus || 'single',
      marriageDate: marriageDate || '',
      campusId: campusId,
      phone: phone || '',
      whatsapp: whatsapp || '',
      email: placeholderEmail,
      status: 'pending', // Family profiles must be explicitly approved by Campus Leaders
      role: 'member',
      groups: [],
      isLinkedProfile: true,
      parentAccountId: userId,
      parentRelation: body.parentRelation || '',
    });

    const profileObj = newProfile.toObject();
    return NextResponse.json(
      { ...profileObj, id: profileObj._id.toString(), _id: profileObj._id.toString() },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create linked profile error:', error);
    return NextResponse.json({ error: 'Failed to create linked profile' }, { status: 500 });
  }
}
