import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifySession } from '@/lib/auth-utils';

// PUT: Update a linked profile
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { isAuth, userId } = await verifySession();
    if (!isAuth || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    // Verify the linked profile belongs to this user
    const profile = await User.findOne({ _id: id, parentAccountId: userId });
    if (!profile) {
      return NextResponse.json({ error: 'Linked profile not found or not owned by you' }, { status: 404 });
    }

    const body = await req.json();
    const { firstName, middleName, lastName, gender, birthday } = body;

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (middleName !== undefined) updateData.middleName = middleName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (gender !== undefined) updateData.gender = gender;
    if (birthday !== undefined) updateData.birthday = birthday;

    // Update the combined name field
    if (firstName !== undefined || lastName !== undefined) {
      updateData.name = `${firstName || profile.firstName} ${lastName || profile.lastName}`;
    }

    const updated = await User.findByIdAndUpdate(id, updateData, { new: true, projection: { password: 0 } }).lean();

    return NextResponse.json({ ...updated, id: (updated as any)._id.toString(), _id: (updated as any)._id.toString() });
  } catch (error: any) {
    console.error('Update linked profile error:', error);
    return NextResponse.json({ error: 'Failed to update linked profile' }, { status: 500 });
  }
}

// DELETE: Remove a linked profile
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { isAuth, userId } = await verifySession();
    if (!isAuth || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    // Verify the linked profile belongs to this user
    const profile = await User.findOne({ _id: id, parentAccountId: userId });
    if (!profile) {
      return NextResponse.json({ error: 'Linked profile not found or not owned by you' }, { status: 404 });
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete linked profile error:', error);
    return NextResponse.json({ error: 'Failed to delete linked profile' }, { status: 500 });
  }
}
