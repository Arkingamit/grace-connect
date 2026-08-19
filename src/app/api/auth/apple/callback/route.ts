import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AppleAuthSession from '@/models/AppleAuthSession';
import {
  APPLE_WEB_CLIENT_ID,
  safeRedirectPath,
  verifyAppleIdToken,
} from '@/lib/apple-auth';
import { signInVerifiedEmail } from '@/lib/social-login';

export const dynamic = 'force-dynamic';

function backToLogin(req: Request, message: string) {
  const url = new URL('/login', new URL(req.url).origin);
  url.searchParams.set('appleError', message);
  return NextResponse.redirect(url, 303);
}

/**
 * Apple posts the sign-in result here (response_mode=form_post). We verify the
 * identity token, issue the session cookie, and send the member back into the
 * app — all inside the same WebView, so no cookie handoff is needed.
 */
export async function POST(req: Request) {
  let state = '';
  try {
    const form = await req.formData();
    state = String(form.get('state') || '');
    const idToken = String(form.get('id_token') || '');
    const appleError = String(form.get('error') || '');

    await connectToDatabase();

    // Single use: consume the state record whatever the outcome.
    const session = state ? await AppleAuthSession.findOneAndDelete({ state }) : null;
    if (!session || session.expiresAt.getTime() < Date.now()) {
      return backToLogin(req, 'Apple sign-in expired. Please try again.');
    }

    const redirectTo = safeRedirectPath(session.redirectTo);

    if (appleError) {
      return backToLogin(
        req,
        /cancel/i.test(appleError)
          ? 'Apple sign-in was canceled.'
          : 'Apple sign-in failed. Please try again.',
      );
    }

    const payload = await verifyAppleIdToken(idToken, {
      audience: APPLE_WEB_CLIENT_ID,
      nonce: session.nonce,
    });

    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    if (!email) {
      return backToLogin(
        req,
        'Apple did not share an email address. Please try again and choose to share your email.',
      );
    }

    const result = await signInVerifiedEmail(email, 'Apple', { returnCookie: true });
    if (!result.ok || !result.sessionCookie) {
      return backToLogin(req, result.error || 'Apple sign-in failed. Please try again.');
    }

    const response = NextResponse.redirect(
      new URL(redirectTo, new URL(req.url).origin),
      303,
    );
    const { name, value, options } = result.sessionCookie;
    response.cookies.set(name, value, options);
    return response;
  } catch (error) {
    console.error('Apple callback error:', error);
    return backToLogin(req, 'Could not verify your Apple sign-in. Please try again.');
  }
}

/** Apple only uses POST here; a GET means someone opened the URL directly. */
export async function GET(req: Request) {
  return backToLogin(req, 'Start Apple sign-in from the login screen.');
}
