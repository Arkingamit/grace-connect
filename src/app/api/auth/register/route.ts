import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import AppleAuthSession from '@/models/AppleAuthSession';
import Announcement from '@/models/Announcement';
import Notification from '@/models/Notification';
import { registerSchema } from '@/lib/validations';
import { getOAuthPicture } from '@/lib/oauth-picture';
import { verifyAppleIdToken } from '@/lib/apple-auth';
import { verifyGoogleIdToken } from '@/lib/google-auth';
import { createSession } from '@/lib/auth-utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 });
    }
    const { credential, appleState, provider, firstName, middleName, lastName, gender, birthday, maritalStatus, marriageDate, campusId, phone, whatsapp, familyMemberId } = parseResult.data;

    let email = '';
    let picture: string | undefined;

    if (provider === 'apple' || appleState) {
      let appleToken = credential;
      if (appleState) {
        await connectToDatabase();
        const appleSession = await AppleAuthSession.findOneAndDelete({
          state: appleState,
          intent: 'register',
          status: 'verified',
        });
        if (!appleSession?.identityToken || appleSession.expiresAt.getTime() < Date.now()) {
          return NextResponse.json({ error: 'Apple sign-in expired. Please try again.' }, { status: 400 });
        }
        appleToken = appleSession.identityToken;
      }
      if (!appleToken) {
        return NextResponse.json({ error: 'Apple authentication failed. No ID token received.' }, { status: 400 });
      }
      const payload = await verifyAppleIdToken(appleToken);
      if (!payload || !payload.email || typeof payload.email !== 'string') {
        return NextResponse.json({ error: 'Invalid Apple token or missing email' }, { status: 400 });
      }
      email = payload.email.toLowerCase();
      picture = getOAuthPicture(payload);
    } else {
      if (!credential) {
        return NextResponse.json({ error: 'Google authentication failed. No ID token received.' }, { status: 400 });
      }
      // Verify Google token (accepts web + iOS audiences)
      const payload = await verifyGoogleIdToken(credential);
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
      return NextResponse.json({ error: 'This account is already registered. Please log in.' }, { status: 400 });
    }

    // Query existing announcements and notifications to initialize dismissedNotificationIds
    // so new registered users will not see any notifications/announcements created prior to registration
    const [existingAnnouncements, existingNotifications] = await Promise.all([
      Announcement.find({}, { _id: 1 }).lean(),
      Notification.find({}, { _id: 1, sourceId: 1 }).lean(),
    ]);

    const initialDismissedIds = Array.from(new Set([
      ...existingAnnouncements.map((a: any) => `ann-${a._id.toString()}`),
      ...existingNotifications.flatMap((n: any) => [
        n._id.toString(),
        n.sourceId ? `ann-${n.sourceId}` : null,
        n.sourceId ? `worship-${n.sourceId}` : null,
        n.sourceId ? `prayer-${n.sourceId}` : null,
      ]).filter(Boolean) as string[],
    ]));

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
      dismissedNotificationIds: initialDismissedIds,
    });

    await createSession(
      String(newUser._id),
      email,
      `${firstName} ${lastName}`,
      'member',
      [],
      'pending',
    );

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
