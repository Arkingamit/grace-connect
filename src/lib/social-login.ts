import User from '@/models/User';
import { buildSessionCookie, createSession, SessionCookie } from '@/lib/auth-utils';

export interface SocialLoginResult {
  ok: boolean;
  /** HTTP status to use when `ok` is false */
  status?: number;
  error?: string;
  rejectionReason?: string;
  rejectionNote?: string;
  /** First-time Google/Apple — finish the registration form before a session is issued */
  needsRegistration?: boolean;
  /** Only set when the caller asked to attach the cookie itself */
  sessionCookie?: SessionCookie;
}

export interface SocialLoginOptions {
  picture?: string;
  firstName?: string;
  lastName?: string;
  /**
   * Return the session cookie instead of setting it, for callers building their
   * own response (an OAuth callback redirect, for example).
   */
  returnCookie?: boolean;
}

export function namesFromOAuth(input: {
  email?: string;
  givenName?: string;
  familyName?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}): { firstName: string; lastName: string } {
  const emailLocal = String(input.email || 'member').split('@')[0] || 'Member';
  const fromDisplay = String(input.name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstName = (
    input.firstName ||
    input.givenName ||
    input.given_name ||
    fromDisplay[0] ||
    emailLocal
  ).trim() || 'Member';
  const lastName = (
    input.lastName ||
    input.familyName ||
    input.family_name ||
    fromDisplay.slice(1).join(' ') ||
    'Member'
  ).trim() || 'Member';
  return { firstName, lastName };
}

/**
 * Shared tail end of every social login: look the member up by their verified
 * email, then issue the session cookie. First-time visitors must finish the
 * registration form instead of getting an account here.
 * Caller must have already connected to the database and verified the token.
 */
export async function signInVerifiedEmail(
  email: string,
  providerLabel: 'Google' | 'Apple',
  options: SocialLoginOptions = {},
): Promise<SocialLoginResult> {
  const { picture, returnCookie } = options;
  const user = await User.findOne(
    { email },
    {
      _id: 1,
      email: 1,
      firstName: 1,
      lastName: 1,
      name: 1,
      role: 1,
      status: 1,
      permissions: 1,
    }
  ).lean();

  if (!user) {
    return { ok: false, status: 404, needsRegistration: true };
  }

  if (user.status === 'pending' || user.status === 'rejected') {
    await User.updateOne(
      { _id: user._id },
      { $set: { status: 'approved', rejectionReason: '', rejectionNote: '', rejectedAt: null } },
    );
    (user as { status: string }).status = 'approved';
  }

  // Embed role and permissions in the session JWT so requireAdmin needs no DB call
  const displayName = (user as any).name || `${(user as any).firstName} ${(user as any).lastName}`;
  const permissions = (user as any).permissions || [];
  const userId = (user as any)._id.toString();

  let sessionCookie: SessionCookie | undefined;
  if (returnCookie) {
    sessionCookie = await buildSessionCookie(userId, user.email, displayName, user.role, permissions);
  } else {
    await createSession(userId, user.email, displayName, user.role, permissions);
  }

  if (picture) {
    await User.updateOne({ _id: (user as any)._id }, { $set: { avatar: picture } });
  }

  return { ok: true, sessionCookie };
}
