import { OAuth2Client, type TokenPayload } from 'google-auth-library';

/** Web OAuth client — browser widget and Android requestIdToken / server_client_id. */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '641349616597-i769rj34s7j08odnfurq27quo5f0jv7k.apps.googleusercontent.com';

/** iOS client — native Sign-In on iOS mints tokens with this audience. */
export const GOOGLE_IOS_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
  '641349616597-5npf7tgp6ifsu9evc1h4oe328rr8o12c.apps.googleusercontent.com';

/**
 * Every audience we accept on Google ID tokens. Native iOS tokens carry the iOS
 * client ID while web and Android carry the web client ID, so a single-audience
 * check rejects half of our own sign-ins (same strategy as APPLE_CLIENT_IDS).
 */
export const GOOGLE_CLIENT_IDS = (
  process.env.GOOGLE_CLIENT_IDS || `${GOOGLE_WEB_CLIENT_ID},${GOOGLE_IOS_CLIENT_ID}`
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Module-level singleton — reuses cached Google public keys across requests
const googleClient = new OAuth2Client(GOOGLE_WEB_CLIENT_ID);

function audienceAllowed(value: unknown): boolean {
  const values = (Array.isArray(value) ? value : [value])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return values.some((item) => GOOGLE_CLIENT_IDS.includes(item));
}

/**
 * Accepts Google ID tokens (native / GIS button) and access tokens from the
 * web OAuth popup used by the custom Continue with Google button.
 */
export async function verifyGoogleIdToken(credential: string): Promise<TokenPayload | undefined> {
  if (credential.split('.').length === 3) {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_IDS,
    });
    return ticket.getPayload() ?? undefined;
  }

  const info = await googleClient.getTokenInfo(credential);
  if (!info.email || (!audienceAllowed(info.aud) && !audienceAllowed(info.azp))) {
    return undefined;
  }

  return {
    iss: 'https://accounts.google.com',
    aud: info.aud || info.azp || GOOGLE_WEB_CLIENT_ID,
    sub: info.sub || '',
    email: info.email,
    email_verified: Boolean(info.email_verified),
    exp: info.expiry_date ? Math.floor(info.expiry_date / 1000) : undefined,
  } as TokenPayload;
}
