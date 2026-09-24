import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  clientIpFromHeaders,
  consumeRateLimit,
  RATE_LIMIT_MESSAGE,
  rateLimitPolicy,
} from '@/lib/rate-limit';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(req: NextRequest) {
  if (!MUTATING.has(req.method)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/api/')) return NextResponse.next();
  if (pathname.startsWith('/api/cron/')) return NextResponse.next();
  if (pathname.startsWith('/api/auth/apple/callback')) return NextResponse.next();

  const policy = rateLimitPolicy(pathname);
  const ip = clientIpFromHeaders(req.headers);
  const result = consumeRateLimit(`${policy.bucket}:${ip}:${pathname}`, policy.limit, policy.windowMs);

  if (!result.ok) {
    return NextResponse.json(
      { error: RATE_LIMIT_MESSAGE },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfterSec),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  const res = NextResponse.next();
  res.headers.set('X-RateLimit-Limit', String(result.limit));
  res.headers.set('X-RateLimit-Remaining', String(result.remaining));
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
