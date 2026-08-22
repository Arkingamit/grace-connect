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
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = safeRedirectPath(url.searchParams.get('redirectTo'));
  const intent = url.searchParams.get('intent') === 'register' ? 'register' : 'login';

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

    return NextResponse.redirect(createAppleAuthorizeUrl(state, nonce), 302);
  } catch (error) {
    console.error('Apple start error:', error);
    const failure = new URL(intent === 'register' ? redirectTo : '/login', url.origin);
    failure.searchParams.set('appleError', 'Could not start Apple sign-in. Please try again.');
    return NextResponse.redirect(failure, 302);
  }
}
