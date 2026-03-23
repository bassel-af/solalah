import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', async () => {
    const { RateLimiter } = await import('@/lib/api/rate-limit');
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60_000 });

    const result1 = limiter.check('user-1');
    const result2 = limiter.check('user-1');
    const result3 = limiter.check('user-1');

    expect(result1).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(result2).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(result3).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it('blocks requests over the limit', async () => {
    const { RateLimiter } = await import('@/lib/api/rate-limit');
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60_000 });

    limiter.check('user-1');
    limiter.check('user-1');
    const result = limiter.check('user-1');

    expect(result.allowed).toBe(false);
  });

  it('returns correct retryAfterSeconds when over limit', async () => {
    const { RateLimiter } = await import('@/lib/api/rate-limit');
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });

    limiter.check('user-1');

    // Advance 20 seconds into the window
    vi.advanceTimersByTime(20_000);

    const result = limiter.check('user-1');

    expect(result.allowed).toBe(false);
    // 60 seconds window - 20 seconds elapsed = 40 seconds remaining
    expect(result.retryAfterSeconds).toBe(40);
  });

  it('resets the window after expiry', async () => {
    const { RateLimiter } = await import('@/lib/api/rate-limit');
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });

    limiter.check('user-1');
    const blocked = limiter.check('user-1');
    expect(blocked.allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(60_001);

    const afterReset = limiter.check('user-1');
    expect(afterReset.allowed).toBe(true);
  });

  it('tracks different keys independently', async () => {
    const { RateLimiter } = await import('@/lib/api/rate-limit');
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });

    limiter.check('user-1');
    const blockedUser1 = limiter.check('user-1');
    expect(blockedUser1.allowed).toBe(false);

    const user2Result = limiter.check('user-2');
    expect(user2Result.allowed).toBe(true);
  });
});

describe('rateLimitResponse', () => {
  it('returns a 429 response with Retry-After header', async () => {
    const { rateLimitResponse } = await import('@/lib/api/rate-limit');

    const response = rateLimitResponse(45);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('45');

    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });
});
