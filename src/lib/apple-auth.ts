import { createHash, randomBytes } from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/** Module-level singleton — reuses cached Apple public keys across requests */
const appleJWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

/** Services ID, used by the browser-based flow (web + Android). */
export const APPLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || 'com.graceconnect.web';

/** Bundle ID, used by the native iOS plugin. */
export const APPLE_NATIVE_CLIENT_ID = 'com.graceconnect.app';

export const APPLE_SITE_URL = (
  process.env.APPLE_SITE_URL || 'https://graceconnect.graceahmedabad.org'
).replace(/\/$/, '');

export const APPLE_REDIRECT_URI = `${APPLE_SITE_URL}/api/auth/apple/callback`;

export function createAppleAuthorizeUrl(state: string, nonce: string): string {
  const params = new URLSearchParams({
    client_id: APPLE_WEB_CLIENT_ID,
    redirect_uri: APPLE_REDIRECT_URI,
    // `form_post` is required by Apple whenever name/email scopes are requested.
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state,
    nonce,
  });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

/** Only ever send members back to a path on our own site. */
export function safeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export function createAppleFlowSecrets() {
  return {
    state: randomBytes(32).toString('hex'),
    nonce: randomBytes(16).toString('hex'),
  };
}

/**
 * Apple echoes the nonce verbatim in the web flow but sends the SHA-256 digest
 * for some native clients, so accept either form.
 */
function nonceMatches(claim: unknown, expected: string): boolean {
  if (typeof claim !== 'string') return false;
  if (claim === expected) return true;
  return claim === createHash('sha256').update(expected).digest('hex');
}

export async function verifyAppleIdToken(
  idToken: string,
  options: { audience?: string | string[]; nonce?: string } = {},
) {
  const { payload } = await jwtVerify(idToken, appleJWKS, {
    issuer: 'https://appleid.apple.com',
    ...(options.audience ? { audience: options.audience } : {}),
  });

  if (options.nonce && !nonceMatches(payload.nonce, options.nonce)) {
    throw new Error('Apple nonce mismatch');
  }

  return payload;
}
