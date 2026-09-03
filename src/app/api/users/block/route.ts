import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import ContentReport from '@/models/ContentReport';
import PrayerRequest from '@/models/PrayerRequest';
import { requireAuth } from '@/lib/api-auth';

/** Accounts the signed-in member has blocked. */
export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const me = await User.findById(session.userId, { blockedUsers: 1 })
      .populate('blockedUsers', 'name avatar')
      .lean();

    const blocked = ((me as any)?.blockedUsers || []).map((u: any) => ({
      id: String(u._id ?? u),
      name: u.name || 'Member',
      avatar: u.avatar || '',
    }));

    return NextResponse.json(blocked, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error listing blocked users:', error);
    return NextResponse.json({ error: 'Failed to load blocked accounts' }, { status: 500 });
  }
}

/**
 * Block a member. Their content leaves this member's feed immediately and a
 * report is opened so moderators are alerted to the account.
 */
export async function POST(req: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: 'Please sign in to block a member.' }, { status: 401 });
  }

  try {
    const { userId, contentId, reason } = (await req.json()) as {
      userId?: string;
      contentId?: string;
      reason?: string;
    };

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'This author cannot be blocked.' }, { status: 400 });
    }
    if (userId === session.userId) {
      return NextResponse.json({ error: 'You cannot block yourself.' }, { status: 400 });
    }

    await connectToDatabase();

    const target = await User.findById(userId, { name: 1 }).lean();
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    await User.findByIdAndUpdate(session.userId, { $addToSet: { blockedUsers: userId } });

    // Notify moderators about the blocked account (App Store guideline 1.2).
    const snapshot = contentId ? await PrayerRequest.findById(contentId).lean() : null;
    const reporter = await User.findById(session.userId, { name: 1 }).lean();

    await ContentReport.create({
      contentType: 'prayer',
      contentId: contentId || String(userId),
      contentSnapshot: snapshot
        ? `${(snapshot as any).title || ''}\n\n${(snapshot as any).content || ''}`.trim()
        : '',
      contentAuthorId: userId,
      contentAuthorName: (target as any).name || '',
      reporterId: session.userId,
      reporterName: (reporter as any)?.name || '',
      reason: 'harassment',
      details: reason || 'Member blocked this account from the prayer wall.',
      source: 'block',
      status: 'open',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json({ error: 'Failed to block this member' }, { status: 500 });
  }
}

/** Unblock a previously blocked member. */
export async function DELETE(req: Request) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { userId } = (await req.json()) as { userId?: string };
    if (!userId) return NextResponse.json({ error: 'Member is required' }, { status: 400 });

    await connectToDatabase();
    await User.findByIdAndUpdate(session.userId, { $pull: { blockedUsers: userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json({ error: 'Failed to unblock this member' }, { status: 500 });
  }
}
