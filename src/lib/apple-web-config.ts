/** Services ID used by the browser Apple flow (web + Android). */
export const APPLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || 'com.graceconnect.web';

/**
 * Live site registered on the Apple Services ID. Apple rejects localhost
 * Return URLs, so local testing has to start the flow on this origin.
 */
export const APPLE_WEB_ORIGIN = (
  process.env.NEXT_PUBLIC_APPLE_SITE_URL || 'https://graceconnect.graceahmedabad.org'
).replace(/\/$/, '');

function isLocalWebHost(host: string) {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
}

/** HTTPS origin that Apple will accept (current site, or production when on localhost). */
export function appleWebFlowOrigin(): string {
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    !isLocalWebHost(window.location.host)
  ) {
    return window.location.origin;
  }
  return APPLE_WEB_ORIGIN;
}

/** Full-page Sign in with Apple using the registered `/api/auth/apple/callback`. */
export function appleWebStartHref(options: {
  intent: 'login' | 'register';
  redirectTo: string;
}): string {
  const params = new URLSearchParams({
    intent: options.intent,
    redirectTo: options.redirectTo,
  });
  return `${appleWebFlowOrigin()}/api/auth/apple/start?${params.toString()}`;
}
