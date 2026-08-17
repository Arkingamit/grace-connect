import { NextResponse } from 'next/server';

export function apiSuccess(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Return a JSON response with Cache-Control headers for CDN-level caching.
 * - `s-maxage`: how long Vercel Edge caches the response (seconds)
 * - `stale-while-revalidate`: serve stale while refreshing in background
 * - Browser cache is `private, no-cache` so users always hit the CDN.
 */
export function cachedApiSuccess(
  data: any,
  cdnMaxAgeSec: number,
  staleWhileRevalidateSec = 60,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': `public, s-maxage=${cdnMaxAgeSec}, stale-while-revalidate=${staleWhileRevalidateSec}`,
    },
  });
}

export function apiError(message: string, status = 400, details?: any) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function withErrorHandler(handler: () => Promise<NextResponse>) {
  try {
    return await handler();
  } catch (error: any) {
    console.error('API Error:', error);
    return apiError(
      error.message || 'Internal server error',
      error.status || 500,
      process.env.NODE_ENV === 'development' ? error.stack : undefined
    );
  }
}
