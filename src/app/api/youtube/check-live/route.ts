import { NextResponse } from 'next/server';
import { checkYouTubeLive } from '@/lib/youtube-live';

const cache = new Map<string, { result: Record<string, unknown>; ts: number }>();
const CACHE_TTL_MS = 15_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }

  const cached = cache.get(channelId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ ...cached.result, cached: true });
  }

  try {
    const result = await checkYouTubeLive(channelId);
    cache.set(channelId, { result, ts: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching YouTube live status:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
