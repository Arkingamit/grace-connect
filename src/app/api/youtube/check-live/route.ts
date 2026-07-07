import { NextResponse } from 'next/server';

// In-memory TTL cache — shared across requests within the same server instance.
// Prevents hammering YouTube with full HTML page downloads on every poll.
const cache = new Map<string, { result: Record<string, unknown>; ts: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }

  // Serve from cache if still fresh — avoids downloading 400-600 KB HTML page
  const cached = cache.get(channelId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ ...cached.result, cached: true });
  }

  try {
    const isHandle = channelId.startsWith('@');
    const url = isHandle
      ? `https://www.youtube.com/${channelId}/live`
      : `https://www.youtube.com/channel/${channelId}/live`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      // Use next cache revalidation instead of no-store to benefit from CDN
      next: { revalidate: 60 },
    });

    const html = await res.text();

    const canonicalMatch = html.match(/rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)"/);

    const result: Record<string, unknown> = canonicalMatch && canonicalMatch[1]
      ? { isLive: true, videoId: canonicalMatch[1] }
      : { isLive: false };

    // Store in cache
    cache.set(channelId, { result, ts: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching YouTube live status:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
