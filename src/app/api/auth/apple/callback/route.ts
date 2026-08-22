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

function backWithError(req: Request, message: string, path = '/login') {
  const url = new URL(safeRedirectPath(path), new URL(req.url).origin);
  url.searchParams.set('appleError', message);
  return NextResponse.redirect(url, 303);
}

function backToLogin(req: Request, message: string) {
  return backWithError(req, message, '/login');
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

    const session = state ? await AppleAuthSession.findOne({ state }) : null;
    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) await session.deleteOne();
      return backToLogin(req, 'Apple sign-in expired. Please try again.');
    }

    const redirectTo = safeRedirectPath(session.redirectTo);
    const isRegister = session.intent === 'register';

    if (appleError) {
      await session.deleteOne();
      return backWithError(
        req,
        /cancel/i.test(appleError)
          ? 'Apple sign-in was canceled.'
          : 'Apple sign-in failed. Please try again.',
        isRegister ? redirectTo : '/login',
      );
    }

    const payload = await verifyAppleIdToken(idToken, {
      audience: APPLE_WEB_CLIENT_ID,
      nonce: session.nonce,
    });

    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    if (!email) {
      await session.deleteOne();
      return backWithError(
        req,
        'Apple did not share an email address. Please try again and choose to share your email.',
        isRegister ? redirectTo : '/login',
      );
    }

    if (isRegister) {
      session.status = 'verified';
      session.email = email;
      session.identityToken = idToken;
      await session.save();
      const dest = new URL(redirectTo, new URL(req.url).origin);
      dest.searchParams.set('appleState', session.state);
      return NextResponse.redirect(dest, 303);
    }

    await session.deleteOne();

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
