import { NextResponse } from 'next/server';
import { timingSafeEqual, randomUUID } from 'crypto';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { createSession } from '@/lib/auth-utils';

const DEMO_EMAIL = (process.env.DEMO_LOGIN_EMAIL || 'app-review@grace-demo.local').toLowerCase();
const DEMO_CAMPUS = process.env.DEMO_LOGIN_CAMPUS_ID || 'main';

function isDemoEnabled() {
  return process.env.DEMO_LOGIN_ENABLED === 'true';
}

function secretsMatch(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Store-review bypass: creates/loads a fixed approved member and sets a real session cookie.
 * Gated by DEMO_LOGIN_ENABLED=true and DEMO_LOGIN_SECRET.
 */
export async function POST(req: Request) {
  try {
    if (!isDemoEnabled()) {
      return NextResponse.json({ error: 'Demo login is disabled' }, { status: 404 });
    }

    const expected = process.env.DEMO_LOGIN_SECRET || '';
    if (!expected) {
      return NextResponse.json({ error: 'Demo login is not configured' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!code || !secretsMatch(code, expected)) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 });
    }

    await connectToDatabase();

    let user = await User.findOne({ email: DEMO_EMAIL });
    if (!user) {
      user = await User.create({
        firstName: 'App',
        lastName: 'Reviewer',
        name: 'App Reviewer',
        gender: 'male',
        campusId: DEMO_CAMPUS,
        email: DEMO_EMAIL,
        role: 'member',
        status: 'approved',
        groups: ['all'],
        qrCode: randomUUID(),
        isLinkedProfile: false,
        permissions: [],
      });
    } else {
      // Keep the review account usable even if someone changed status in admin
      if (user.status !== 'approved' || user.role !== 'member') {
        user.status = 'approved';
        user.role = 'member';
        user.permissions = [];
        if (!user.qrCode) user.qrCode = randomUUID();
        await user.save();
      }
    }

    const displayName = user.name || `${user.firstName} ${user.lastName}`;
    await createSession(user._id.toString(), user.email, displayName, 'member', []);

    return NextResponse.json({
      success: true,
      demo: true,
      name: displayName,
    });
  } catch (error) {
    console.error('Demo login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Lets the client know whether the reviewer entry point should be shown. */
export async function GET() {
  return NextResponse.json({
    enabled: isDemoEnabled() && Boolean(process.env.DEMO_LOGIN_SECRET),
  });
}
