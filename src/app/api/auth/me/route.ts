import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { createSession, verifySession } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

function sameStringList(a: string[] = [], b: string[] = []) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export async function GET() {
  try {
    const jwt = await verifySession();

    if (!jwt.isAuth || !jwt.userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(jwt.userId, { password: 0 }).lean();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    const dbStatus = (user as any).status || 'approved';
    const dbRole = (user as any).role || 'member';
    const dbPermissions = ((user as any).permissions || []) as string[];

    // Cookie is issued at login/register. Re-issue it when a campus leader
    // approves (or otherwise changes) the member so requireAuth() sees it.
    if (
      jwt.status !== dbStatus ||
      jwt.role !== dbRole ||
      !sameStringList(jwt.permissions || [], dbPermissions)
    ) {
      const displayName =
        (user as any).name ||
        `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim();
      await createSession(
        String((user as any)._id),
        (user as any).email,
        displayName,
        dbRole,
        dbPermissions,
        dbStatus,
      );
    }

    const linkedProfiles = await User.find(
      { parentAccountId: jwt.userId },
      { password: 0 }
    ).lean();

    const formattedProfiles = linkedProfiles.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      _id: p._id.toString(),
    }));

    const formattedUser = {
      ...user,
      _id: String((user as any)._id),
      id: String((user as any)._id),
    };

    return NextResponse.json(
      { user: formattedUser, linkedProfiles: formattedProfiles },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch user session' }, { status: 500 });
  }
}
