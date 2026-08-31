/**
 * Client half of the browser-based Sign in with Apple flow.
 *
 * Android WebViews frequently refuse to load Apple's pages and hand them to the
 * system browser instead. When that happens the app never receives the redirect
 * back, so the shell starts the flow, then polls until Apple has verified it and
 * redeems the result itself. iOS uses the same path so we avoid the native
 * Capacitor plugin, which surfaces AuthorizationError 1000 when misconfigured.
 */

export interface AppleFlowStart {
  state: string;
  url: string;
}

export interface AppleFlowOutcome {
  ok: boolean;
  error?: string;
  /** Nobody came back in time, or another page already redeemed the flow. */
  timedOut?: boolean;
}

export async function startAppleBrowserFlow(options: {
  intent: 'login' | 'register';
  redirectTo: string;
}): Promise<AppleFlowStart> {
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

export async function waitForAppleFlow(
  state: string,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<AppleFlowOutcome> {
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  const intervalMs = options.intervalMs ?? 2500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    try {
      const res = await fetch(`/api/auth/apple/status?state=${encodeURIComponent(state)}`, {
        cache: 'no-store',
      });
      if (!res.ok) continue;

      const data = await res.json();
      if (data.status === 'verified') return { ok: true };
      if (data.status === 'error') {
        return { ok: false, error: data.error || 'Apple sign-in failed. Please try again.' };
      }
      if (data.status === 'expired') {
        return { ok: false, error: 'Apple sign-in expired. Please try again.' };
      }
      // 'missing' means another tab or the WebView already redeemed the flow.
      if (data.status === 'missing') return { ok: false, timedOut: true };
    } catch {
      // Offline or transient — keep waiting until the deadline.
    }
  }

  return { ok: false, timedOut: true };
}
