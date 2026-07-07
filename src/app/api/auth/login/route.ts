import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { OAuth2Client } from 'google-auth-library';
import { createSession } from '@/lib/auth-utils';
import { loginSchema } from '@/lib/validations';

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
    const { credential } = parseResult.data;

    // Verify Google token (reuses cached JWKS)
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid Google token or missing email' }, { status: 400 });
    }

    const email = payload.email.toLowerCase();

    // Select only the fields we need — avoids loading the full document
    const user = await User.findOne({ email }, { _id: 1, email: 1, firstName: 1, lastName: 1, name: 1, role: 1, status: 1 }).lean();

    if (!user) {
      return NextResponse.json({ error: 'No account found with this Google account. Please register first.' }, { status: 404 });
    }

    if (user.status === 'pending') {
      return NextResponse.json({ error: 'Your registration is pending approval from your campus leader' }, { status: 403 });
    }

    if (user.status === 'rejected') {
      return NextResponse.json({ error: 'Your registration was not approved. Please contact your campus leader.' }, { status: 403 });
    }

    // Embed role in the session JWT so requireAdmin needs no DB call
    const displayName = (user as any).name || `${(user as any).firstName} ${(user as any).lastName}`;
    await createSession((user as any)._id.toString(), user.email, displayName, user.role);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
