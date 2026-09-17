import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { verifySession, deleteSession } from '@/lib/auth-utils';
import { deleteUserAccount } from '@/lib/delete-user-account';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  try {
    const { isAuth, userId } = await verifySession();
    if (!isAuth || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const result = await deleteUserAccount(userId);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    await deleteSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
