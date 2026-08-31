/**
 * Sign in with Apple for the native shells, without ever handing the member to
 * the standalone browser app.
 *
 * iOS gets the real ASAuthorization sheet, so nothing leaves the app at all.
 * Apple ships no native Android SDK — the plugin's Android class is a stub — so
 * Android, and iOS if the sheet is unavailable, loads Apple's pages in an in-app
 * browser (Custom Tab / SFSafariViewController) instead. Apple form-posts the
 * result to our callback rather than back to the WebView, so in that case the app
 * polls /status and redeems the flow itself, which puts the session cookie in the
 * WebView and lets us dismiss the browser.
 */

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { APPLE_IOS_CLIENT_ID } from './apple-web-config';
import { formatAppleAuthError } from './apple-error-message';

export type AppleSignInOutcome =
  /** Native sheet returned an identity token for /api/auth/login. */
  | { kind: 'token'; idToken: string; firstName?: string; lastName?: string; email?: string }
  /** Browser flow already established the session cookie. */
  | { kind: 'session' }
  | {
      kind: 'needs-registration';
      appleState: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    }
  | { kind: 'canceled' }
  | { kind: 'error'; message: string };

const POLL_INTERVAL_MS = 1000;
const FLOW_TIMEOUT_MS = 5 * 60 * 1000;
/** Apple's post can land just after the member dismisses the browser. */
const CHECKS_AFTER_DISMISS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** ASAuthorizationError.canceled is 1001. */
function isUserCanceled(message: string): boolean {
  return /\b1001\b|cancel/i.test(message);
}

/**
 * The on-device Apple sheet. Returns null when this platform or build cannot run
 * it, which means the caller should fall back to the browser flow.
 */
async function nativeAppleSheet(): Promise<AppleSignInOutcome | null> {
  if (Capacitor.getPlatform() !== 'ios') return null;

  let authorize: typeof import('@capacitor-community/apple-sign-in').SignInWithApple.authorize;
  try {
    const mod = await import('@capacitor-community/apple-sign-in');
    authorize = mod.SignInWithApple.authorize.bind(mod.SignInWithApple);
  } catch {
    return null;
  }

  try {
    const result = await authorize({
      clientId: APPLE_IOS_CLIENT_ID,
      // ASAuthorization runs entirely on-device and never redirects. Passing the
      // web Return URL here is what produced AuthorizationError 1000 for App
      // Review, so it stays empty.
      redirectURI: '',
      scopes: 'name email',
      state: randomHex(16),
      nonce: randomHex(16),
    });

    const idToken = result?.response?.identityToken;
    if (!idToken) return null;

    return {
      kind: 'token',
      idToken,
      firstName: result.response.givenName || undefined,
      lastName: result.response.familyName || undefined,
      email: result.response.email || undefined,
    };
  } catch (err: any) {
    const message = String(err?.message ?? err ?? '');
    if (isUserCanceled(message)) return { kind: 'canceled' };
    // Missing capability, unsigned build, no iCloud account — the browser flow
    // still works, so never dead-end the member here.
    console.warn('Native Apple sign-in unavailable, using the web flow:', message);
    return null;
  }
}

async function startFlow(options: {
  intent: 'login' | 'register';
  redirectTo: string;
}): Promise<{ state: string; url: string }> {
  const params = new URLSearchParams({
    mode: 'json',
    intent: options.intent,
    redirectTo: options.redirectTo,
  });
  const res = await fetch(`/api/auth/apple/start?${params.toString()}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.state || !data?.url) {
    throw new Error(data?.error || 'Could not start Apple sign-in. Please try again.');
  }
  return { state: data.state, url: data.url };
}

type FlowStatus = { done: true } | { failed: string } | { abandoned: true };

async function pollUntilSettled(state: string, wasDismissed: () => boolean): Promise<FlowStatus> {
  const deadline = Date.now() + FLOW_TIMEOUT_MS;
  let checksAfterDismiss = 0;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    try {
      const res = await fetch(`/api/auth/apple/status?state=${encodeURIComponent(state)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'verified') return { done: true };
        if (data.status === 'error') {
          return { failed: data.error || 'Apple sign-in failed. Please try again.' };
        }
        if (data.status === 'expired') return { failed: 'Apple sign-in expired. Please try again.' };
        // Another page already redeemed this flow.
        if (data.status === 'missing') return { abandoned: true };
      }
    } catch {
      // Offline or transient — keep waiting until the deadline.
    }

    if (wasDismissed() && ++checksAfterDismiss > CHECKS_AFTER_DISMISS) {
      return { abandoned: true };
    }
  }

  return { abandoned: true };
}

/** Trades a verified flow for a session cookie in the WebView. */
async function redeemFlow(state: string): Promise<AppleSignInOutcome> {
  const res = await fetch('/api/auth/apple/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  const data = await res.json().catch(() => ({}));

  if (data?.needsRegistration) {
    return {
      kind: 'needs-registration',
      appleState: data.appleState || state,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
    };
  }

  if (!res.ok || !data?.success) {
    return { kind: 'error', message: data?.error || 'Apple sign-in failed. Please try again.' };
  }

  return { kind: 'session' };
}

async function browserAppleFlow(options: {
  intent: 'login' | 'register';
  redirectTo: string;
  onStatus?: (message: string) => void;
}): Promise<AppleSignInOutcome> {
  const flow = await startFlow(options);

  let dismissed = false;
  const listener = await Browser.addListener('browserFinished', () => {
    dismissed = true;
  });

  try {
    await Browser.open({ url: flow.url, presentationStyle: 'fullscreen' });

    const status = await pollUntilSettled(flow.state, () => dismissed);
    if ('failed' in status) return { kind: 'error', message: status.failed };
    if ('abandoned' in status) return { kind: 'canceled' };

    options.onStatus?.('Finishing Apple sign-in…');
    return await redeemFlow(flow.state);
  } finally {
    await listener.remove();
    // Not implemented on every platform, and harmless if the sheet is already gone.
    await Browser.close().catch(() => {});
  }
}

/**
 * Runs Sign in with Apple inside the app: native sheet where it exists, in-app
 * browser everywhere else.
 */
export async function signInWithAppleInApp(options: {
  intent: 'login' | 'register';
  redirectTo: string;
  onStatus?: (message: string) => void;
}): Promise<AppleSignInOutcome> {
  try {
    const native = await nativeAppleSheet();
    if (native) return native;

    options.onStatus?.('Opening Apple sign-in…');
    return await browserAppleFlow(options);
  } catch (err: any) {
    return { kind: 'error', message: formatAppleAuthError(String(err?.message ?? err ?? '')) };
  }
}
