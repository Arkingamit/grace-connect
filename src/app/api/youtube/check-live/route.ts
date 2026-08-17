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
    let url = '';
    
    // Clean up the input in case the user pasted a full URL
    let cleanId = channelId.trim();
    
    // If it's a full URL, try to extract the important part
    if (cleanId.includes('youtube.com/')) {
      try {
        const urlObj = new URL(cleanId);
        // Extracts /@Handle, /channel/UC123, /c/CustomName
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        if (pathParts[0] === 'channel' && pathParts[1]) {
          cleanId = pathParts[1];
        } else if (pathParts[0] === 'c' && pathParts[1]) {
          cleanId = pathParts[1]; // Will be used as /c/name/live
          url = `https://www.youtube.com/c/${cleanId}/live`;
        } else if (pathParts[0]?.startsWith('@')) {
          cleanId = pathParts[0];
        } else {
          // Fallback if we can't parse it well
          cleanId = pathParts[0];
        }
      } catch (e) {
        // Ignore URL parse errors and continue with string manipulation
      }
    }
    
    // If url is not already constructed
    if (!url) {
      if (cleanId.startsWith('@')) {
        url = `https://www.youtube.com/${cleanId}/live`;
      } else if (cleanId.startsWith('UC') && cleanId.length > 15) {
        url = `https://www.youtube.com/channel/${cleanId}/live`;
      } else {
        // Fallback: assume it's a handle but they forgot the @
        url = `https://www.youtube.com/@${cleanId}/live`;
      }
    }

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
