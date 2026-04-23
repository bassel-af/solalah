/**
 * Phase 1 — Platform Owner Dashboard
 *
 * Unit tests for `withUserCache` — a tiny in-memory per-user cache used by
 * admin metric query helpers to satisfy PRD §11 ("per-user in-memory 60s
 * cache"). Single-process only; a future Redis-backed version lives in the
 * same discussion as `src/lib/api/rate-limit.ts`.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { withUserCache, __resetAdminCacheForTests } from '@/lib/admin/cache';

describe('withUserCache', () => {
  beforeEach(() => {
    __resetAdminCacheForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('cold miss invokes the producer fn and returns its value', async () => {
    const fn = vi.fn().mockResolvedValue({ n: 1 });
    const value = await withUserCache('user-1', 'growth', fn, 60_000);
    expect(value).toEqual({ n: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('warm hit returns cached value without re-invoking the producer', async () => {
    const fn = vi.fn().mockResolvedValue({ n: 1 });
    await withUserCache('user-1', 'growth', fn, 60_000);
    const value2 = await withUserCache('user-1', 'growth', fn, 60_000);
    expect(value2).toEqual({ n: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('TTL expiry causes re-invocation', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ n: 1 })
      .mockResolvedValueOnce({ n: 2 });
    await withUserCache('user-1', 'growth', fn, 60_000);
    // Advance past TTL
    vi.advanceTimersByTime(60_001);
    const value2 = await withUserCache('user-1', 'growth', fn, 60_000);
    expect(value2).toEqual({ n: 2 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('different userId → separate cache entries', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ owner: 'a' })
      .mockResolvedValueOnce({ owner: 'b' });
    const a = await withUserCache('user-a', 'growth', fn, 60_000);
    const b = await withUserCache('user-b', 'growth', fn, 60_000);
    expect(a).toEqual({ owner: 'a' });
    expect(b).toEqual({ owner: 'b' });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('different key → separate cache entries for the same user', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ kind: 'growth' })
      .mockResolvedValueOnce({ kind: 'engagement' });
    const a = await withUserCache('user-1', 'growth', fn, 60_000);
    const b = await withUserCache('user-1', 'engagement', fn, 60_000);
    expect(a).toEqual({ kind: 'growth' });
    expect(b).toEqual({ kind: 'engagement' });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('producer errors are NOT cached — the next call retries', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce({ n: 42 });
    await expect(
      withUserCache('user-1', 'growth', fn, 60_000),
    ).rejects.toThrow('db down');
    const value2 = await withUserCache('user-1', 'growth', fn, 60_000);
    expect(value2).toEqual({ n: 42 });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
