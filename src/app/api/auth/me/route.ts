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

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch user session' }, { status: 500 });
  }
}
