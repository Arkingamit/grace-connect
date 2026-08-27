import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AppleAuthSession, { type IAppleAuthSession } from '@/models/AppleAuthSession';
import User from '@/models/User';
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
 * Record the failure on the flow so a native shell polling /status sees it too,
 * then send whoever is holding the page back with the same message.
 */
async function failFlow(
  req: Request,
  session: IAppleAuthSession,
  message: string,
  path: string,
) {
  session.status = 'error';
  session.errorMessage = message;
  await session.save();
  return backWithError(req, message, path);
}

/**
 * Apple posts the sign-in result here (response_mode=form_post). We verify the
 * identity token, then either issue a session cookie or send first-time members
 * to the registration form.
 *
 * This may run in the app's WebView or in the system browser, so the flow record
 * survives until it is redeemed — that is what lets the app finish a sign-in
 * that Android handed off to the browser.
 */
export async function POST(req: Request) {
  let state = '';
  try {
    const form = await req.formData();
    state = String(form.get('state') || '');
    const idToken = String(form.get('id_token') || '');
    const appleError = String(form.get('error') || '');

    await connectToDatabase();

    const session = await AppleAuthSession.findOne({ state });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) await session.deleteOne();
      return backToLogin(req, 'Apple sign-in expired. Please try again.');
    }

    const redirectTo = safeRedirectPath(session.redirectTo);

    if (appleError) {
      return failFlow(
        req,
        session,
        /cancel/i.test(appleError)
          ? 'Apple sign-in was canceled.'
          : 'Apple sign-in failed. Please try again.',
        '/login',
      );
    }

    const payload = await verifyAppleIdToken(idToken, {
      audience: APPLE_WEB_CLIENT_ID,
      nonce: session.nonce,
    });

    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    if (!email) {
      return failFlow(
        req,
        session,
        'Apple did not share an email address. Please try again and choose to share your email.',
        '/login',
      );
    }

    let firstName = '';
    let lastName = '';
    const rawUser = form.get('user');
    if (typeof rawUser === 'string' && rawUser) {
      try {
        const appleUser = JSON.parse(rawUser);
        firstName = String(appleUser?.name?.firstName || '').trim();
        lastName = String(appleUser?.name?.lastName || '').trim();
      } catch {
        // Apple only sends the name JSON on the first authorization.
      }
    }

    session.status = 'verified';
    session.email = email;
    session.identityToken = idToken;
    if (firstName) session.firstName = firstName;
    if (lastName) session.lastName = lastName;
    await session.save();

    const existing = await User.findOne({ email }, { _id: 1 }).lean();
    if (!existing) {
      const dest = new URL('/register', new URL(req.url).origin);
      dest.searchParams.set('appleState', session.state);
      if (session.firstName) dest.searchParams.set('firstName', session.firstName);
      if (session.lastName) dest.searchParams.set('lastName', session.lastName);
      return NextResponse.redirect(dest, 303);
    }

    const result = await signInVerifiedEmail(email, 'Apple', {
      returnCookie: true,
      firstName: session.firstName,
      lastName: session.lastName,
    });
    if (!result.ok || !result.sessionCookie) {
      return failFlow(
        req,
        session,
        result.error || 'Apple sign-in failed. Please try again.',
        '/login',
      );
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
