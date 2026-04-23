/**
 * Per-user in-memory cache for admin dashboard metric helpers.
 *
 * Satisfies PRD §11 ("per-user in-memory 60s cache per query; stampede
 * protection not required for a single owner"). SINGLE-PROCESS ONLY — keys
 * live in the Node heap of whichever serverless / Next.js worker serves the
 * request. If we ever scale horizontally, replace with a Redis-backed
 * version (see `src/lib/api/rate-limit.ts` for the analogous note).
 *
 * Errors are NOT cached: if the producer function throws, the next call
 * retries. This avoids pinning a 60s outage on a transient DB blip.
 */

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const globalForAdminCache = globalThis as unknown as {
  __adminCache?: Map<string, CacheEntry>;
};

function getStore(): Map<string, CacheEntry> {
  if (!globalForAdminCache.__adminCache) {
    globalForAdminCache.__adminCache = new Map();
  }
  return globalForAdminCache.__adminCache;
}

/**
 * Memoize `fn()` per `(userId, key)` for `ttlMs` milliseconds. A second
 * call within the TTL returns the exact same value without invoking `fn`
 * again. Different userIds and different keys are isolated.
 */
export async function withUserCache<T>(
  userId: string,
  key: string,
  fn: () => Promise<T>,
  ttlMs: number,
): Promise<T> {
  const store = getStore();
  const compositeKey = `${userId}:${key}`;
  const now = Date.now();
  const entry = store.get(compositeKey);

  if (entry && entry.expiresAt > now) {
    return entry.value as T;
  }

  const value = await fn();
  store.set(compositeKey, { value, expiresAt: now + ttlMs });
  return value;
}

/** Test-only hook — resets the cache between test cases. */
export function __resetAdminCacheForTests(): void {
  globalForAdminCache.__adminCache = new Map();
}
