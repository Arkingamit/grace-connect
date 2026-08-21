import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { OAuth2Client } from 'google-auth-library';
import { registerSchema } from '@/lib/validations';
import { getOAuthPicture } from '@/lib/oauth-picture';
import { verifyAppleIdToken } from '@/lib/apple-auth';

const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
    }
    const { credential, provider, firstName, middleName, lastName, gender, birthday, maritalStatus, marriageDate, campusId, phone, whatsapp, familyMemberId } = parseResult.data;

    let email = '';
    let picture: string | undefined;

    if (provider === 'apple') {
      // Verifies issuer + our allowed client IDs (audience) via shared helper
      const payload = await verifyAppleIdToken(credential);
      if (!payload || !payload.email || typeof payload.email !== 'string') {
        return NextResponse.json({ error: 'Invalid Apple token or missing email' }, { status: 400 });
      }
      email = payload.email.toLowerCase();
      picture = getOAuthPicture(payload);
    } else {
      // Verify Google token
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

    await connectToDatabase();
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'This Google account is already registered' }, { status: 400 });
    }

    const newUser = await User.create({
      firstName,
      middleName,
      lastName,
      name: `${firstName} ${lastName}`,
      gender,
      birthday,
      maritalStatus,
      marriageDate,
      campusId,
      email,
      phone,
      whatsapp,
      familyMemberId,
      avatar: picture || '',
      status: 'pending',
      role: 'member',
      groups: [],
      qrCode: randomUUID(),
    });

    return NextResponse.json({
      success: true,
      userId: String(newUser._id),
      qrCode: newUser.qrCode,
      email,
      message: 'Registration submitted for approval.',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}
