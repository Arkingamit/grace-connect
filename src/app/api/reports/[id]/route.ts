import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import ContentReport from '@/models/ContentReport';
import PrayerRequest from '@/models/PrayerRequest';
import User from '@/models/User';
import { requireAdmin } from '@/lib/api-auth';

type Action = 'remove_content' | 'eject_user' | 'dismiss';

/**
 * Moderator action on a report. Grace commits to acting within 24 hours by
 * removing the content and ejecting the member who posted it.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { action, note } = (await req.json()) as { action: Action; note?: string };
    if (!['remove_content', 'eject_user', 'dismiss'].includes(action)) {
      return NextResponse.json({ error: 'Unknown moderation action' }, { status: 400 });
    }

    await connectToDatabase();

    const report = await ContentReport.findById(params.id);
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    if (action === 'remove_content' || action === 'eject_user') {
      await PrayerRequest.findByIdAndDelete(report.contentId);
    }

    if (action === 'eject_user' && report.contentAuthorId) {
      await User.findByIdAndUpdate(report.contentAuthorId, {
        status: 'rejected',
        suspendedAt: new Date(),
        suspensionReason: 'Posted objectionable content (Terms of Use section 4).',
      });
      // Close every other open report against this account in the same sweep.
      await ContentReport.updateMany(
        { contentAuthorId: report.contentAuthorId, status: 'open', _id: { $ne: report._id } },
        {
          status: 'user_ejected',
          resolvedBy: admin.userId,
          resolvedAt: new Date(),
          resolutionNote: 'Account ejected for objectionable content.',
        },
      );
    }

    report.status =
      action === 'dismiss'
        ? 'dismissed'
        : action === 'eject_user'
          ? 'user_ejected'
          : 'content_removed';
    report.resolvedBy = admin.userId;
    report.resolvedAt = new Date();
    report.resolutionNote = note || '';
    await report.save();

    return NextResponse.json({ success: true, status: report.status });
  } catch (error) {
    console.error('Error resolving content report:', error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}
