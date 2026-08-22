import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AppleAuthSession from '@/models/AppleAuthSession';

export const dynamic = 'force-dynamic';

/**
 * Progress of a browser-based Apple sign-in, polled by the native shell while
 * Apple runs in the system browser. Only the status is exposed — the identity
 * token is redeemed by /api/auth/register or /api/auth/apple/complete.
 */
export async function GET(req: Request) {
  const state = new URL(req.url).searchParams.get('state') || '';
  if (!state) {
    return NextResponse.json({ error: 'state is required' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const session = await AppleAuthSession.findOne({ state })
      .select('status intent errorMessage expiresAt')
      .lean();

    if (!session) {
      return NextResponse.json({ status: 'missing' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ status: 'expired' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json(
      {
        status: session.status,
        intent: session.intent || 'login',
        ...(session.status === 'error' && session.errorMessage
          ? { error: session.errorMessage }
          : {}),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Apple status error:', error);
    return NextResponse.json({ error: 'Could not check Apple sign-in.' }, { status: 500 });
  }
}
