/**
 * Lightweight server-side in-memory cache with TTL and tag-based invalidation.
 *
 * In a serverless environment (Vercel), each cold-start creates a fresh cache.
 * Within a warm instance, the cache dramatically reduces DB round-trips for
 * frequently-accessed, rarely-changing data (campuses, sermons, settings, etc.).
 *
 * Usage:
 *   const data = serverCache.get('campuses');
 *   if (!data) {
 *     const fresh = await Campus.find({}).lean();
 *     serverCache.set('campuses', fresh, 10 * 60_000); // 10 min
 *   }
 *
 *   // On mutation:
 *   serverCache.invalidate('campuses');
 */

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  tags: string[];
}

class ServerCache {
  private store = new Map<string, CacheEntry>();

  /**
   * Retrieve a cached value. Returns `null` if missing or expired.
   */
  get<T = any>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Store a value with a TTL in milliseconds.
   * Optionally attach tags for group invalidation.
   */
  set<T = any>(key: string, value: T, ttlMs: number, tags: string[] = []): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      tags: [key, ...tags], // always include the key itself as a tag
    });
  }

  /**
   * Remove a specific cache entry by key.
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Remove all cache entries that have a matching tag.
   * Useful for invalidating all media types at once, etc.
   */
  invalidateByTag(tag: string): void {
    for (const [key, entry] of this.store) {
      if (entry.tags.includes(tag)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Remove all entries matching a key prefix.
   * e.g., invalidateByPrefix('media:') clears media:sermons, media:gallery, etc.
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache stats for debugging.
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}

// ── Singleton ──────────────────────────────────────────────────────────
// Attach to globalThis to survive Next.js hot reloads in development.
const globalForCache = globalThis as typeof globalThis & { __serverCache?: ServerCache };

if (!globalForCache.__serverCache) {
  globalForCache.__serverCache = new ServerCache();
}

export const serverCache = globalForCache.__serverCache;

// ── TTL Constants (milliseconds) ───────────────────────────────────────
export const CACHE_TTL = {
  CAMPUSES: 10 * 60_000,       // 10 minutes
  SYSTEM_SETTINGS: 10 * 60_000, // 10 minutes
  DAILY_VERSE: 60 * 60_000,     // 1 hour
  SERMONS: 2 * 60_000,          // 2 minutes
  WORSHIP_VIDEOS: 2 * 60_000,   // 2 minutes
  GALLERY: 2 * 60_000,          // 2 minutes
  SERMON_SERIES: 2 * 60_000,    // 2 minutes
  LIVESTREAMS: 30_000,           // 30 seconds
  ANNOUNCEMENTS: 60_000,        // 1 minute
  EVENTS: 60_000,               // 1 minute
} as const;
