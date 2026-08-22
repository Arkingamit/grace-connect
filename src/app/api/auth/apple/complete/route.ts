import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AppleAuthSession from '@/models/AppleAuthSession';
import { signInVerifiedEmail } from '@/lib/social-login';

export const dynamic = 'force-dynamic';

/**
 * Redeems a verified Apple login flow for a session cookie. Used by the native
 * shell when Android ran the Apple pages in the system browser, so the cookie
 * lands in the app's WebView rather than the browser.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const state = typeof body.state === 'string' ? body.state : '';
    if (!state) {
      return NextResponse.json({ error: 'state is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Single use: the verified flow is spent whatever happens next.
    const session = await AppleAuthSession.findOneAndDelete({
      state,
      intent: 'login',
      status: 'verified',
    });

    if (!session?.email || session.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Apple sign-in expired. Please try again.' },
        { status: 400 },
      );
    }

    const result = await signInVerifiedEmail(session.email, 'Apple');
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.rejectionReason !== undefined
            ? { rejectionReason: result.rejectionReason, rejectionNote: result.rejectionNote }
            : {}),
        },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Apple complete error:', error);
    return NextResponse.json({ error: 'Could not finish Apple sign-in.' }, { status: 500 });
  }
}
