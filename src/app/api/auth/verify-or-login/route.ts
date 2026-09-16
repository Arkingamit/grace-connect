import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { loginSchema } from '@/lib/validations';
import { getOAuthPicture } from '@/lib/oauth-picture';
import { verifyAppleIdToken } from '@/lib/apple-auth';
import { verifyGoogleIdToken } from '@/lib/google-auth';
import { signInVerifiedEmail } from '@/lib/social-login';
import User from '@/models/User';
import { formatRejectionMessage } from '@/lib/rejection-reasons';

/**
 * Unified auth endpoint: verify a Google/Apple token, then either log the
 * user in (existing account) or signal that they need to register (new user).
 *
 * Response shapes:
 *   { status: 'existing', success: true }             — logged in, redirect to /
 *   { status: 'pending' }                             — account awaiting approval
 *   { status: 'rejected', error, rejectionReason, rejectionNote }
 *   { status: 'new', email }                          — no account, start registration
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 },
      );
    }
    const { credential, provider, picture: clientPicture } = parseResult.data;

    let email = '';
    let picture: string | undefined;

    if (provider === 'apple') {
      const payload = await verifyAppleIdToken(credential);
      if (!payload || !payload.email || typeof payload.email !== 'string') {
        return NextResponse.json(
          { error: 'Invalid Apple token or missing email' },
          { status: 400 },
        );
      }
      email = payload.email.toLowerCase();
      picture = getOAuthPicture(payload);
    } else {
      const payload = await verifyGoogleIdToken(credential);
      if (!payload || !payload.email) {
        return NextResponse.json(
          { error: 'Invalid Google token or missing email' },
          { status: 400 },
        );
      }
      email = payload.email.toLowerCase();
      picture = getOAuthPicture(payload);
    }

    if (!picture && clientPicture?.startsWith('https://')) {
      picture = clientPicture;
    }

    // Check if user exists
    const user = await User.findOne(
      { email },
      { _id: 1, status: 1, rejectionReason: 1, rejectionNote: 1 },
    ).lean();

    if (!user) {
      // New user — no account yet
      return NextResponse.json(
        { status: 'new', email },
        { status: 200 },
      );
    }

    // User exists — handle status
    if ((user as any).status === 'pending') {
      return NextResponse.json(
        {
          status: 'pending',
          error: 'Your registration is pending approval from your campus pastor.',
        },
        { status: 200 },
      );
    }

    if ((user as any).status === 'rejected') {
      return NextResponse.json(
        {
          status: 'rejected',
          error: formatRejectionMessage(
            (user as any).rejectionReason,
            (user as any).rejectionNote,
          ),
          rejectionReason: (user as any).rejectionReason || '',
          rejectionNote: (user as any).rejectionNote || '',
        },
        { status: 200 },
      );
    }

    // Approved — sign in
    const result = await signInVerifiedEmail(
      email,
      provider === 'apple' ? 'Apple' : 'Google',
      { picture },
    );

    if (!result.ok) {
      return NextResponse.json(
        { status: 'error', error: result.error },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json(
      { status: 'existing', success: true },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('Verify-or-login Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
