import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifySession } from '@/lib/auth-utils';

export async function GET() {
  try {
    const { isAuth, userId } = await verifySession();
    
    if (!isAuth || !userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(userId, { password: 0 }); // Exclude password
    
    if (!user) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    // Fetch linked profiles for this user
    const linkedProfiles = await User.find(
      { parentAccountId: userId },
      { password: 0 }
    ).lean();

    const formattedProfiles = linkedProfiles.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      _id: p._id.toString(),
    }));

    return NextResponse.json({ user, linkedProfiles: formattedProfiles });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch user session' }, { status: 500 });
  }
}
