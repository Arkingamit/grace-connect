import User from '@/models/User';
import { buildSessionCookie, createSession, SessionCookie } from '@/lib/auth-utils';
import { formatRejectionMessage } from '@/lib/rejection-reasons';

export interface SocialLoginResult {
  ok: boolean;
  /** HTTP status to use when `ok` is false */
  status?: number;
  error?: string;
  rejectionReason?: string;
  rejectionNote?: string;
  /** Only set when the caller asked to attach the cookie itself */
  sessionCookie?: SessionCookie;
}

export interface SocialLoginOptions {
  picture?: string;
  /**
   * Return the session cookie instead of setting it, for callers building their
   * own response (an OAuth callback redirect, for example).
   */
  returnCookie?: boolean;
}

/**
 * Shared tail end of every social login: look the member up by their verified
 * email, enforce approval status, then issue the session cookie.
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
      rejectionReason: 1,
      rejectionNote: 1,
    }
  ).lean();

  if (!user) {
    return {
      ok: false,
      status: 404,
      error: `No account found with this ${providerLabel} account. Please register first.`,
    };
  }

  if (user.status === 'pending') {
    return {
      ok: false,
      status: 403,
      error: 'Your registration is pending approval from your campus pastor',
    };
  }

  if (user.status === 'rejected') {
    return {
      ok: false,
      status: 403,
      error: formatRejectionMessage(
        (user as any).rejectionReason,
        (user as any).rejectionNote,
      ),
      rejectionReason: (user as any).rejectionReason || '',
      rejectionNote: (user as any).rejectionNote || '',
    };
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
