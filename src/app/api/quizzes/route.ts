import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import connectToDatabase from '@/lib/db';
import { ListeningQuiz, ListeningQuizAttempt } from '@/models/ListeningQuiz';
import User from '@/models/User';

function isVisibleToUser(
  quiz: {
    targetCampuses?: string[];
    targetGroups?: string[];
    excludeCampuses?: string[];
    excludeGroups?: string[];
  },
  campusId: string,
  groups: string[],
  role?: string,
) {
  if (role && ['admin', 'super_admin'].includes(role)) return true;
  const excludes = quiz.excludeCampuses || [];
  if (excludes.includes(campusId)) return false;
  const eg = quiz.excludeGroups || [];
  if (groups.some((g) => eg.includes(g))) return false;

  const tc = quiz.targetCampuses || ['all'];
  const campusOk = tc.includes('all') || tc.length === 0 || tc.includes(campusId);
  if (!campusOk) return false;

  const tg = quiz.targetGroups || ['all'];
  if (!tg.length || tg.includes('all')) return true;
  return tg.some((g) => groups.includes(g));
}

/**
 * GET /api/quizzes
 * Member list of broadcast quizzes visible to their campus/groups.
 */
export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDatabase();
    const user = await User.findById(session.userId)
      .select('campusId groups role')
      .lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const quizzes = await ListeningQuiz.find({ quiz: { $ne: null } })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('title description quizGeneratedAt createdAt targetCampuses targetGroups excludeCampuses excludeGroups quiz')
      .lean();

    const visible = quizzes.filter((q) =>
      isVisibleToUser(q, user.campusId || '', user.groups || [], session.role as string),
    );

    const attempts = await ListeningQuizAttempt.find({
      userId: session.userId,
      quizId: { $in: visible.map((q) => q._id) },
    })
      .select('quizId scorePercentage')
      .lean();

    const attemptMap = new Map(
      attempts.map((a) => [String(a.quizId), a.scorePercentage]),
    );

    return NextResponse.json(
      visible.map((q) => ({
        id: String(q._id),
        title: q.title,
        description: q.description || '',
        questionCount: Array.isArray((q.quiz as { questions?: unknown[] })?.questions)
          ? (q.quiz as { questions: unknown[] }).questions.length
          : 0,
        createdAt: q.createdAt,
        completed: attemptMap.has(String(q._id)),
        scorePercentage: attemptMap.get(String(q._id)) ?? null,
      })),
    );
  } catch (error) {
    console.error('[quizzes/list]', error);
    return NextResponse.json({ error: 'Failed to load quizzes' }, { status: 500 });
  }
}
