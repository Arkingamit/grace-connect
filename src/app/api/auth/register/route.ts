import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { OAuth2Client } from 'google-auth-library';
import { registerSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
    }
    const { credential, firstName, middleName, lastName, gender, birthday, maritalStatus, marriageDate, campusId, phone, whatsapp, familyMemberId } = parseResult.data;

    // Verify Google token
    const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid Google token or missing email' }, { status: 400 });
    }

    const email = payload.email.toLowerCase();

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
      status: 'pending',
      role: 'member',
      groups: [],
    });

    return NextResponse.json({ success: true, message: 'Registration submitted for approval.' }, { status: 201 });
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}
