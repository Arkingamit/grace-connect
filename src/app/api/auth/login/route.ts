import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { OAuth2Client } from 'google-auth-library';
import { loginSchema } from '@/lib/validations';
import { getOAuthPicture } from '@/lib/oauth-picture';
import { verifyAppleIdToken } from '@/lib/apple-auth';
import { signInVerifiedEmail } from '@/lib/social-login';

// Module-level singleton — reuses cached Google public keys across requests
const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
    }
    const { credential, provider, picture: clientPicture } = parseResult.data;

    let email = '';
    let picture: string | undefined;

    if (provider === 'apple') {
      // The Apple JWT includes the email in the payload if requested
      const payload = await verifyAppleIdToken(credential);

      if (!payload || !payload.email || typeof payload.email !== 'string') {
        return NextResponse.json({ error: 'Invalid Apple token or missing email' }, { status: 400 });
      }
      email = payload.email.toLowerCase();
      picture = getOAuthPicture(payload);
    } else {
      // Verify Google token (reuses cached JWKS)
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return NextResponse.json({ error: 'Invalid Google token or missing email' }, { status: 400 });
      }
      email = payload.email.toLowerCase();
      picture = getOAuthPicture(payload);
    }

    if (!picture && clientPicture?.startsWith('https://')) {
      picture = getOAuthPicture({ picture: clientPicture });
    }

    const result = await signInVerifiedEmail(
      email,
      provider === 'apple' ? 'Apple' : 'Google',
      picture,
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.rejectionReason !== undefined
            ? { rejectionReason: result.rejectionReason, rejectionNote: result.rejectionNote }
            : {}),
        },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
