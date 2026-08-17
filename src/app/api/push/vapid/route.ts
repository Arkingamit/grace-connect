import { NextResponse } from 'next/server';

/**
 * GET /api/push/vapid
 * Returns the public VAPID key so the client can subscribe to push.
 */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID key not configured' }, { status: 500 });
  }
  return NextResponse.json({ publicKey });
}
