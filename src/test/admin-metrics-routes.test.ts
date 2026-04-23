/**
 * Phase 1 — Platform Owner Dashboard / API routes.
 *
 * Tests for the three `/api/admin/metrics/*` route handlers. Each handler
 * must:
 *   1. Call `requirePlatformOwner(request)` first and honor its response.
 *   2. Await `logAdminAccess(...)` with a route-specific action label.
 *   3. Invoke the matching query helper through `withUserCache` keyed by
 *      the authenticated user id.
 *   4. If the query helper throws, return a 200 with
 *      `{ error: 'query_failed', errorType: '<ErrorClass>' }` — a dashboard
 *      read must never 500 (PRD §11).
 *
 * Note: we DO NOT test the 401/403 branches here — those are exercised in
 * `src/test/admin-auth.test.ts` (the guard is shared). Here we only test
 * that each route wires the guard correctly.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockRequireOwner = vi.fn();
const mockLogAdminAccess = vi.fn();
const mockGetGrowth = vi.fn();
const mockGetEngagement = vi.fn();
const mockGetHealth = vi.fn();
const mockWithUserCache = vi.fn();

vi.mock('@/lib/api/admin-auth', () => ({
  requirePlatformOwner: (...args: unknown[]) => mockRequireOwner(...args),
}));

vi.mock('@/lib/audit/admin-access', () => ({
  logAdminAccess: (...args: unknown[]) => mockLogAdminAccess(...args),
}));

vi.mock('@/lib/admin/queries', () => ({
  getGrowthMetrics: (...args: unknown[]) => mockGetGrowth(...args),
  getEngagementMetrics: (...args: unknown[]) => mockGetEngagement(...args),
  getHealthMetrics: (...args: unknown[]) => mockGetHealth(...args),
}));

vi.mock('@/lib/admin/cache', () => ({
  withUserCache: (...args: unknown[]) => mockWithUserCache(...args),
}));

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:4000/api/admin/metrics/growth', {
    method: 'GET',
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: owner auth succeeds.
  mockRequireOwner.mockResolvedValue({ user: { id: 'owner-1' } });
  // Default: cache passes through to fn().
  mockWithUserCache.mockImplementation(
    async (_userId: string, _key: string, fn: () => Promise<unknown>) => fn(),
  );
  mockLogAdminAccess.mockResolvedValue(undefined);
});

describe('GET /api/admin/metrics/growth', () => {
  test('returns 200 with growth payload for an owner', async () => {
    const fakePayload = {
      totalWorkspaces: 10,
      workspacesCreatedLast7d: 1,
      workspacesCreatedLast30d: 3,
      totalUsers: 20,
      usersCreatedLast7d: 2,
      usersCreatedLast30d: 5,
      pendingInvitations: 4,
      inviteAcceptanceRate30d: 0.75,
    };
    mockGetGrowth.mockResolvedValue(fakePayload);

    const { GET } = await import('@/app/api/admin/metrics/growth/route');
    const res = await GET(
      makeRequest({ 'x-forwarded-for': '1.2.3.4', 'user-agent': 'jest' }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fakePayload);
    expect(mockGetGrowth).toHaveBeenCalledTimes(1);
  });

  test('propagates the guard response when the user is not an owner', async () => {
    const forbidden = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mockRequireOwner.mockResolvedValueOnce(forbidden);

    const { GET } = await import('@/app/api/admin/metrics/growth/route');
    const res = await GET(makeRequest());

    expect(res).toBe(forbidden);
    expect(res.status).toBe(403);
    expect(mockGetGrowth).not.toHaveBeenCalled();
    expect(mockLogAdminAccess).not.toHaveBeenCalled();
  });

  test('calls logAdminAccess with action=admin_metrics_growth_read', async () => {
    mockGetGrowth.mockResolvedValue({});
    const { GET } = await import('@/app/api/admin/metrics/growth/route');
    await GET(makeRequest({ 'x-forwarded-for': '1.2.3.4', 'user-agent': 'ua' }));

    expect(mockLogAdminAccess).toHaveBeenCalledTimes(1);
    const call = mockLogAdminAccess.mock.calls[0][0];
    expect(call.userId).toBe('owner-1');
    expect(call.action).toBe('admin_metrics_growth_read');
    expect(call.ipAddress).toBe('1.2.3.4');
    expect(call.userAgent).toBe('ua');
  });

  test('wraps getGrowthMetrics through withUserCache keyed by userId + "growth"', async () => {
    mockGetGrowth.mockResolvedValue({});
    const { GET } = await import('@/app/api/admin/metrics/growth/route');
    await GET(makeRequest());

    expect(mockWithUserCache).toHaveBeenCalledTimes(1);
    const [userId, key, , ttl] = mockWithUserCache.mock.calls[0];
    expect(userId).toBe('owner-1');
    expect(key).toBe('growth');
    expect(ttl).toBe(60_000);
  });

  test('on query helper throw: returns 200 with query_failed envelope, NOT 500', async () => {
    class DbOutage extends Error {}
    mockGetGrowth.mockRejectedValue(new DbOutage('timeout'));

    const { GET } = await import('@/app/api/admin/metrics/growth/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBe('query_failed');
    expect(body.errorType).toBe('DbOutage');
  });
});

describe('GET /api/admin/metrics/engagement', () => {
  test('returns 200 with engagement payload for an owner', async () => {
    const fakePayload = {
      weeklyActiveWorkspaces: 3,
      editsLast7d: 15,
      editsLast30d: 60,
      avgEditsPerActiveWorkspace: 5,
      workspacesWithMultipleMembers: 2,
      topActiveWorkspaces7d: [],
      branchPointers: { active: 1, revoked: 0, broken: 0 },
    };
    mockGetEngagement.mockResolvedValue(fakePayload);

    const { GET } = await import('@/app/api/admin/metrics/engagement/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fakePayload);
    expect(mockGetEngagement).toHaveBeenCalledTimes(1);
  });

  test('calls logAdminAccess with action=admin_metrics_engagement_read', async () => {
    mockGetEngagement.mockResolvedValue({});
    const { GET } = await import('@/app/api/admin/metrics/engagement/route');
    await GET(makeRequest());
    expect(mockLogAdminAccess.mock.calls[0][0].action).toBe(
      'admin_metrics_engagement_read',
    );
  });

  test('uses cache key "engagement"', async () => {
    mockGetEngagement.mockResolvedValue({});
    const { GET } = await import('@/app/api/admin/metrics/engagement/route');
    await GET(makeRequest());
    expect(mockWithUserCache.mock.calls[0][1]).toBe('engagement');
  });
});

describe('GET /api/admin/metrics/health', () => {
  test('returns 200 with health payload for an owner', async () => {
    const fakePayload = {
      db: { ok: true },
      gotrue: { ok: true, status: 200 },
      mail: { ok: true },
      encryption: { masterKeyLoaded: true },
      storage: { totalMediaBytes: 0 },
      adminReadsLast24h: 0,
    };
    mockGetHealth.mockResolvedValue(fakePayload);

    const { GET } = await import('@/app/api/admin/metrics/health/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fakePayload);
    expect(mockGetHealth).toHaveBeenCalledTimes(1);
  });

  test('calls logAdminAccess with action=admin_metrics_health_read', async () => {
    mockGetHealth.mockResolvedValue({});
    const { GET } = await import('@/app/api/admin/metrics/health/route');
    await GET(makeRequest());
    expect(mockLogAdminAccess.mock.calls[0][0].action).toBe(
      'admin_metrics_health_read',
    );
  });

  test('uses cache key "health"', async () => {
    mockGetHealth.mockResolvedValue({});
    const { GET } = await import('@/app/api/admin/metrics/health/route');
    await GET(makeRequest());
    expect(mockWithUserCache.mock.calls[0][1]).toBe('health');
  });
});
