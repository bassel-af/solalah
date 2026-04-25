/**
 * Phase 2 — Live Presence
 *
 * Tests for the route handler at `/api/admin/metrics/presence`.
 * Behaviors:
 *   - 401 when not authenticated (delegates to requirePlatformOwner)
 *   - 403 when not a platform owner (delegates to requirePlatformOwner)
 *   - 200 + payload when owner
 *   - logAdminAccess called exactly once with the right action label
 *   - Heatmap result is cached via withUserCache (5 min TTL)
 *   - Peak update is fire-and-forget — slow/throwing peak update does NOT
 *     block the response
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockRequireOwner = vi.fn();
const mockLogAdminAccess = vi.fn();
const mockGetPresenceMetrics = vi.fn();
const mockUpdatePeakConcurrency = vi.fn();
const mockWithUserCache = vi.fn();

vi.mock('@/lib/api/admin-auth', () => ({
  requirePlatformOwner: (...args: unknown[]) => mockRequireOwner(...args),
}));

vi.mock('@/lib/audit/admin-access', () => ({
  logAdminAccess: (...args: unknown[]) => mockLogAdminAccess(...args),
}));

vi.mock('@/lib/admin/presence', () => ({
  getPresenceMetrics: (...args: unknown[]) => mockGetPresenceMetrics(...args),
  updatePeakConcurrency: (...args: unknown[]) =>
    mockUpdatePeakConcurrency(...args),
}));

vi.mock('@/lib/admin/cache', () => ({
  withUserCache: (...args: unknown[]) => mockWithUserCache(...args),
}));

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:4000/api/admin/metrics/presence', {
    method: 'GET',
  });
}

const SAMPLE_PAYLOAD = {
  active1m: 3,
  active5m: 7,
  activeWorkspaces: 1,
  perWorkspace: [
    {
      workspaceId: 'ws-1',
      name: 'سعيد',
      activeCount: 5,
      dominantCategory: 'viewing' as const,
    },
  ],
  smallWorkspacesRollup: null,
  heatmap: Array.from({ length: 7 }, () => new Array(24).fill(0)),
  peak: { count: 12, recordedAt: '2026-04-20T12:00:00.000Z' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireOwner.mockResolvedValue({ user: { id: 'owner-1' } });
  mockGetPresenceMetrics.mockResolvedValue(SAMPLE_PAYLOAD);
  mockUpdatePeakConcurrency.mockResolvedValue(undefined);
  mockLogAdminAccess.mockResolvedValue(undefined);
  // Default cache: pass through.
  mockWithUserCache.mockImplementation(
    async (_userId: string, _key: string, fn: () => Promise<unknown>) => fn(),
  );
});

describe('GET /api/admin/metrics/presence — auth', () => {
  test('401 path: requirePlatformOwner returns a 401 response — propagated as-is', async () => {
    mockRequireOwner.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const { GET } = await import('@/app/api/admin/metrics/presence/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  test('403 path: requirePlatformOwner returns a 403 response — propagated', async () => {
    mockRequireOwner.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    );
    const { GET } = await import('@/app/api/admin/metrics/presence/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  test('200 with payload for an owner', async () => {
    const { GET } = await import('@/app/api/admin/metrics/presence/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(SAMPLE_PAYLOAD);
  });
});

describe('GET /api/admin/metrics/presence — audit + caching', () => {
  test('logAdminAccess is called exactly once with the right action label', async () => {
    const { GET } = await import('@/app/api/admin/metrics/presence/route');
    await GET(makeRequest());
    expect(mockLogAdminAccess).toHaveBeenCalledTimes(1);
    const opts = mockLogAdminAccess.mock.calls[0][0];
    expect(opts.userId).toBe('owner-1');
    expect(opts.action).toBe('admin_metrics_presence_read');
  });

  test('payload is fetched through withUserCache keyed by user id', async () => {
    const { GET } = await import('@/app/api/admin/metrics/presence/route');
    await GET(makeRequest());
    expect(mockWithUserCache).toHaveBeenCalled();
    const firstCall = mockWithUserCache.mock.calls[0];
    expect(firstCall[0]).toBe('owner-1'); // userId
    // The cache key MUST be presence-specific (not 'engagement' or 'growth'
    // — colliding cache keys would mix data across owners, which is a bug
    // even though there's only one today).
    expect(firstCall[1]).toContain('presence');
  });
});

describe('GET /api/admin/metrics/presence — peak fire-and-forget (#10 + Gap C)', () => {
  test('updatePeakConcurrency is invoked', async () => {
    const { GET } = await import('@/app/api/admin/metrics/presence/route');
    await GET(makeRequest());
    expect(mockUpdatePeakConcurrency).toHaveBeenCalledTimes(1);
    // Argument: the active5m count (the peak metric).
    expect(mockUpdatePeakConcurrency).toHaveBeenCalledWith(SAMPLE_PAYLOAD.active5m);
  });

  test('a hanging updatePeakConcurrency does NOT block the response', async () => {
    // Simulate a peak update that never resolves.
    mockUpdatePeakConcurrency.mockImplementation(
      () => new Promise<void>(() => {}),
    );

    const { GET } = await import('@/app/api/admin/metrics/presence/route');
    const start = Date.now();
    const res = await Promise.race([
      GET(makeRequest()),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 1_000)),
    ]);
    expect(res).not.toBe('timeout');
    expect((res as Response).status).toBe(200);
    expect(Date.now() - start).toBeLessThan(1_000);
  });

  test('a throwing updatePeakConcurrency does NOT throw out of the route', async () => {
    mockUpdatePeakConcurrency.mockRejectedValue(new Error('peak DB hiccup'));
    const { GET } = await import('@/app/api/admin/metrics/presence/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });
});

describe('GET /api/admin/metrics/presence — error handling', () => {
  test('if getPresenceMetrics throws, route returns 200 with query_failed envelope (PRD §11)', async () => {
    mockGetPresenceMetrics.mockRejectedValueOnce(new TypeError('boom'));
    const { GET } = await import('@/app/api/admin/metrics/presence/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      error: 'query_failed',
      errorType: 'TypeError',
    });
  });
});
