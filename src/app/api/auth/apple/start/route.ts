import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AppleAuthSession from '@/models/AppleAuthSession';
import {
  createAppleAuthorizeUrl,
  createAppleFlowSecrets,
  safeRedirectPath,
} from '@/lib/apple-auth';

export const dynamic = 'force-dynamic';

/** Window the member has to finish signing in with Apple. */
const FLOW_TTL_MS = 10 * 60 * 1000;

/**
 * Entry point for the browser-based Apple flow (Android and web). The client
 * navigates here, we hand Apple a one-time state/nonce, and Apple posts the
 * result back to /api/auth/apple/callback.
 *
 * `mode=json` returns the state and authorize URL instead of redirecting, so the
 * native shell can keep polling /status while Apple runs. Android WebViews often
 * hand the Apple pages to the system browser, and polling is what lets the app
 * finish the sign-in itself instead of stranding the member in that browser.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = safeRedirectPath(url.searchParams.get('redirectTo'));
  const intent = url.searchParams.get('intent') === 'register' ? 'register' : 'login';
  const wantsJson = url.searchParams.get('mode') === 'json';

  try {
    await connectToDatabase();

    const { state, nonce } = createAppleFlowSecrets();

    await AppleAuthSession.create({
      state,
      nonce,
      status: 'pending',
      intent,
      redirectTo,
      expiresAt: new Date(Date.now() + FLOW_TTL_MS),
    });

    const authorizeUrl = createAppleAuthorizeUrl(state, nonce);

    if (wantsJson) {
      return NextResponse.json(
        { state, url: authorizeUrl },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.redirect(authorizeUrl, 302);
  } catch (error) {
    console.error('Apple start error:', error);
    const message = 'Could not start Apple sign-in. Please try again.';
    if (wantsJson) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    const failure = new URL(intent === 'register' ? redirectTo : '/login', url.origin);
    failure.searchParams.set('appleError', message);
    return NextResponse.redirect(failure, 302);
  }
}
