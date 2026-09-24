type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
const MAX_KEYS = 4000;

function pruneExpired(now: number) {
  if (store.size < MAX_KEYS) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
  if (store.size >= MAX_KEYS) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
}

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
};

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, limit, remaining: limit - 1, retryAfterSec: Math.ceil(windowMs / 1000) };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      limit,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return {
    ok: true,
    limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return headers.get('x-real-ip')?.trim() || headers.get('cf-connecting-ip')?.trim() || 'unknown';
}

export function rateLimitPolicy(pathname: string): { limit: number; windowMs: number; bucket: string } {
  if (
    pathname.startsWith('/api/auth/login')
    || pathname.startsWith('/api/auth/register')
    || pathname.startsWith('/api/auth/verify-or-login')
    || pathname.startsWith('/api/auth/demo-login')
    || pathname.startsWith('/api/setup')
  ) {
    return { limit: 8, windowMs: 60_000, bucket: 'auth' };
  }

  if (
    pathname.startsWith('/api/prayers')
    || pathname.includes('/event-registrations')
    || pathname.startsWith('/api/attendance')
    || pathname.startsWith('/api/auth/linked-profiles')
    || pathname.startsWith('/api/auth/account')
  ) {
    return { limit: 12, windowMs: 60_000, bucket: 'member-form' };
  }

  return { limit: 40, windowMs: 60_000, bucket: 'form' };
}

export const RATE_LIMIT_MESSAGE = 'Too many attempts. Please wait a moment and try again.';
