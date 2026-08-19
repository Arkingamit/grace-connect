import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AppleAuthSession from '@/models/AppleAuthSession';
import { signInVerifiedEmail } from '@/lib/social-login';

export const dynamic = 'force-dynamic';

/**
 * Called from inside the app's WebView, so the session cookie set here lands in
 * the cookie jar the app actually uses — the system browser that ran the Apple
 * flow has a separate one.
 */
export async function GET(req: Request) {
  try {
    const state = new URL(req.url).searchParams.get('state') || '';
    if (!state) {
      return NextResponse.json({ status: 'expired' });
    }

    await connectToDatabase();

    const session = await AppleAuthSession.findOne({ state });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ status: 'expired' });
    }

    if (session.status === 'pending') {
      return NextResponse.json({ status: 'pending' });
    }

    // Terminal states are single use.
    await AppleAuthSession.deleteOne({ _id: session._id });

    if (session.status === 'error' || !session.email) {
      return NextResponse.json({
        status: 'error',
        error: session.errorMessage || 'Apple sign-in failed. Please try again.',
      });
    }

    const result = await signInVerifiedEmail(session.email, 'Apple');
    if (!result.ok) {
      return NextResponse.json({
        status: 'error',
        error: result.error,
        rejectionReason: result.rejectionReason,
        rejectionNote: result.rejectionNote,
      });
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Apple poll error:', error);
    return NextResponse.json({ status: 'error', error: 'Apple sign-in failed. Please try again.' });
  }
}
