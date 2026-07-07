import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import PrayerRequest from '@/models/PrayerRequest';
import User from '@/models/User';
import { verifySession } from '@/lib/auth-utils';
import { prayerRequestSchema } from '@/lib/validations';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const session = await verifySession();

    // Derive allowed privacy levels from the JWT role — no DB query needed
    const allowedPrivacy: Array<'public' | 'members' | 'staff'> = ['public'];

    if (session.isAuth) {
      const role = session.role;
      if (role === 'member' || role === 'group_leader' || role === 'campus_leader' || role === 'admin' || role === 'super_admin') {
        allowedPrivacy.push('members');
      }
      if (role === 'campus_leader' || role === 'admin' || role === 'super_admin') {
        allowedPrivacy.push('staff');
      }
    }

    const prayers = await PrayerRequest.find({
      privacy: { $in: allowedPrivacy },
      status: 'approved',
    })
      .sort({ createdAt: -1 })
      .lean();

    const mappedPrayers = prayers.map((p: any) => ({
      ...p,
      id: p._id.toString()
    }));

    return NextResponse.json(mappedPrayers);
  } catch (error) {
    console.error('Error fetching prayer requests:', error);
    return NextResponse.json({ error: 'Failed to fetch prayer requests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const parseResult = prayerRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const session = await verifySession();

    let authorName = data.isAnonymous ? 'Anonymous' : (data.authorName || 'Anonymous');
    let authorId = undefined;
    let campusId = data.campusId || 'global';

    // Only query DB if we need the user's campusId (anonymous posts can skip)
    if (session.isAuth && session.userId && !data.isAnonymous) {
      const user = await User.findById(session.userId, { firstName: 1, lastName: 1, campusId: 1 }).lean();
      if (user) {
        if (!data.authorName) {
          authorName = `${(user as any).firstName} ${(user as any).lastName}`;
        }
        authorId = session.userId;
        campusId = (user as any).campusId;
      }
    } else if (session.isAuth && session.userId && data.isAnonymous) {
      // Still need campusId for anonymous posts — use lean minimal query
      const user = await User.findById(session.userId, { campusId: 1 }).lean();
      if (user) {
        authorId = session.userId;
        campusId = (user as any).campusId;
      }
    }

    const prayer = await PrayerRequest.create({
      title: data.title,
      content: data.content,
      isAnonymous: !!data.isAnonymous,
      privacy: data.privacy || 'public',
      category: data.category || 'General',
      authorName,
      authorId,
      campusId,
      status: 'pending',
    });

    return NextResponse.json(prayer, { status: 201 });
  } catch (error) {
    console.error('Error creating prayer request:', error);
    return NextResponse.json({ error: 'Failed to create prayer request' }, { status: 500 });
  }
}
