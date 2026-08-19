import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AppleAuthSession from '@/models/AppleAuthSession';
import { createAppleAuthorizeUrl, createAppleFlowSecrets } from '@/lib/apple-auth';

/** Window the member has to finish signing in inside the system browser. */
const FLOW_TTL_MS = 10 * 60 * 1000;

export async function POST() {
  try {
    await connectToDatabase();

    const { state, nonce } = createAppleFlowSecrets();

    await AppleAuthSession.create({
      state,
      nonce,
      status: 'pending',
      expiresAt: new Date(Date.now() + FLOW_TTL_MS),
    });

    return NextResponse.json({
      state,
      url: createAppleAuthorizeUrl(state, nonce),
      expiresIn: Math.floor(FLOW_TTL_MS / 1000),
    });
  } catch (error) {
    console.error('Apple start error:', error);
    return NextResponse.json({ error: 'Could not start Apple sign-in' }, { status: 500 });
  }
}
