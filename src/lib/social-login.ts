import User from '@/models/User';
import { createSession } from '@/lib/auth-utils';
import { formatRejectionMessage } from '@/lib/rejection-reasons';

export interface SocialLoginResult {
  ok: boolean;
  /** HTTP status to use when `ok` is false */
  status?: number;
  error?: string;
  rejectionReason?: string;
  rejectionNote?: string;
}

/**
 * Shared tail end of every social login: look the member up by their verified
 * email, enforce approval status, then issue the session cookie.
 * Caller must have already connected to the database and verified the token.
 */
export async function signInVerifiedEmail(
  email: string,
  providerLabel: 'Google' | 'Apple',
  picture?: string,
): Promise<SocialLoginResult> {
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
  await createSession(
    (user as any)._id.toString(),
    user.email,
    displayName,
    user.role,
    permissions,
  );

  if (picture) {
    await User.updateOne({ _id: (user as any)._id }, { $set: { avatar: picture } });
  }

  return { ok: true };
}
