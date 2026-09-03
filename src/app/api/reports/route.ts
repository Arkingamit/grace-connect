import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import ContentReport from '@/models/ContentReport';
import PrayerRequest from '@/models/PrayerRequest';
import User from '@/models/User';
import { requireAdmin, requireAuth } from '@/lib/api-auth';
import { reportSchema } from '@/lib/validations';

/** Moderator queue of reported content (App Store guideline 1.2). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const reports = await ContentReport.find({}).sort({ status: 1, createdAt: -1 }).limit(300).lean();

    return NextResponse.json(
      reports.map((r: any) => ({ ...r, id: String(r._id) })),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Error fetching content reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

/** Members flag objectionable content from inside the app. */
export async function POST(req: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: 'Please sign in to report content.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    await connectToDatabase();

    const prayer = await PrayerRequest.findById(parsed.data.contentId).lean();
    if (!prayer) {
      return NextResponse.json({ error: 'This content no longer exists.' }, { status: 404 });
    }

    const existing = await ContentReport.findOne({
      contentId: parsed.data.contentId,
      reporterId: session.userId,
      source: 'report',
    });
    if (existing) {
      return NextResponse.json({ success: true, alreadyReported: true });
    }

    const reporter = await User.findById(session.userId, { name: 1 }).lean();

    await ContentReport.create({
      contentType: 'prayer',
      contentId: parsed.data.contentId,
      contentSnapshot: `${(prayer as any).title || ''}\n\n${(prayer as any).content || ''}`.trim(),
      contentAuthorId: (prayer as any).authorId,
      contentAuthorName: (prayer as any).authorName,
      reporterId: session.userId,
      reporterName: (reporter as any)?.name || '',
      reason: parsed.data.reason,
      details: parsed.data.details,
      source: 'report',
      status: 'open',
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating content report:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
