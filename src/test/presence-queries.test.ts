/**
 * Phase 2 — Live Presence
 *
 * Unit tests for `src/lib/admin/presence.ts` query helpers:
 *   - getActiveUserCount(windowSeconds)
 *   - getActiveWorkspaceBreakdown(windowSeconds)
 *   - getQuietWindowHeatmap()
 *   - updatePeakConcurrency(currentCount)
 *   - getPresenceMetrics()  (composes the above into the response shape)
 *
 * All Prisma reads are mocked. The fixtures are crafted so the k-anonymity
 * rule (workspace membership ≥ 5) and the owner-exclusion rule are
 * explicitly exercised.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockUserCount = vi.fn();
const mockUserGroupBy = vi.fn();
const mockUserFindMany = vi.fn();
const mockMembershipGroupBy = vi.fn();
const mockWorkspaceFindMany = vi.fn();
const mockExecuteRaw = vi.fn();
const mockPlatformStatFindUnique = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
      groupBy: (...args: unknown[]) => mockUserGroupBy(...args),
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
    workspaceMembership: {
      groupBy: (...args: unknown[]) => mockMembershipGroupBy(...args),
    },
    workspace: {
      findMany: (...args: unknown[]) => mockWorkspaceFindMany(...args),
    },
    platformStat: {
      findUnique: (...args: unknown[]) => mockPlatformStatFindUnique(...args),
    },
    $executeRaw: (...args: unknown[]) => mockExecuteRaw(...args),
  },
}));

import {
  getActiveUserCount,
  getActiveWorkspaceBreakdown,
  getQuietWindowHeatmap,
  updatePeakConcurrency,
  getPresenceMetrics,
} from '@/lib/admin/presence';

describe('getActiveUserCount — owner exclusion (#6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCount.mockResolvedValue(0);
  });

  test('passes isPlatformOwner: false to the count query', async () => {
    mockUserCount.mockResolvedValue(7);
    const result = await getActiveUserCount(60);
    expect(result).toBe(7);

    expect(mockUserCount).toHaveBeenCalledTimes(1);
    const args = mockUserCount.mock.calls[0][0];
    expect(args.where.isPlatformOwner).toBe(false);
  });

  test('passes the correct lastActiveAt window', async () => {
    await getActiveUserCount(300);
    const args = mockUserCount.mock.calls[0][0];
    const gte: Date = args.where.lastActiveAt.gte;
    const deltaMs = Date.now() - gte.getTime();
    expect(Math.abs(deltaMs - 300_000)).toBeLessThan(2_000);
  });
});

describe('getActiveWorkspaceBreakdown — k-anonymity rollup (#7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserGroupBy.mockResolvedValue([]);
    mockMembershipGroupBy.mockResolvedValue([]);
    mockWorkspaceFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([]);
  });

  test('workspace with < 5 members rolls up to smallWorkspacesRollup, not perWorkspace', async () => {
    // Active users grouped by workspace — pretend ws-tiny has 3 active users.
    mockUserGroupBy.mockResolvedValue([
      { lastActiveWorkspaceId: 'ws-tiny', _count: { _all: 3 } },
    ]);
    // ws-tiny only has 4 members total → below k-anonymity floor.
    mockMembershipGroupBy.mockResolvedValue([
      { workspaceId: 'ws-tiny', _count: { userId: 4 } },
    ]);
    mockWorkspaceFindMany.mockResolvedValue([
      { id: 'ws-tiny', nameAr: 'صغيرة' },
    ]);
    // Per-user route info (not used for tiny — they get rolled up).
    mockUserFindMany.mockResolvedValue([]);

    const result = await getActiveWorkspaceBreakdown(300);
    expect(result.perWorkspace).toEqual([]);
    expect(result.smallWorkspacesRollup).toEqual({
      workspaceCount: 1,
      activeCount: 3,
    });
  });

  test('workspace with exactly 5 members appears in perWorkspace', async () => {
    mockUserGroupBy.mockResolvedValue([
      { lastActiveWorkspaceId: 'ws-five', _count: { _all: 2 } },
    ]);
    mockMembershipGroupBy.mockResolvedValue([
      { workspaceId: 'ws-five', _count: { userId: 5 } },
    ]);
    mockWorkspaceFindMany.mockResolvedValue([
      { id: 'ws-five', nameAr: 'خمسة' },
    ]);
    // Active users: 2 viewers, 0 editors → dominantCategory: 'viewing'.
    mockUserFindMany.mockResolvedValue([
      { lastActiveWorkspaceId: 'ws-five', lastActiveRoute: '/workspaces/[slug]/tree' },
      { lastActiveWorkspaceId: 'ws-five', lastActiveRoute: '/workspaces/[slug]' },
    ]);

    const result = await getActiveWorkspaceBreakdown(300);
    expect(result.perWorkspace).toHaveLength(1);
    expect(result.perWorkspace[0]).toMatchObject({
      workspaceId: 'ws-five',
      name: 'خمسة',
      activeCount: 2,
      dominantCategory: 'viewing',
    });
    expect(result.smallWorkspacesRollup).toBeNull();
  });

  test('mix: 1 large workspace appears, 1 small rolls up', async () => {
    mockUserGroupBy.mockResolvedValue([
      { lastActiveWorkspaceId: 'ws-big', _count: { _all: 7 } },
      { lastActiveWorkspaceId: 'ws-small', _count: { _all: 2 } },
    ]);
    mockMembershipGroupBy.mockResolvedValue([
      { workspaceId: 'ws-big', _count: { userId: 100 } },
      { workspaceId: 'ws-small', _count: { userId: 3 } },
    ]);
    mockWorkspaceFindMany.mockResolvedValue([
      { id: 'ws-big', nameAr: 'كبير' },
      { id: 'ws-small', nameAr: 'صغير' },
    ]);
    mockUserFindMany.mockResolvedValue([
      { lastActiveWorkspaceId: 'ws-big', lastActiveRoute: '/workspaces/[slug]/tree' },
    ]);

    const result = await getActiveWorkspaceBreakdown(300);
    expect(result.perWorkspace).toHaveLength(1);
    expect(result.perWorkspace[0].workspaceId).toBe('ws-big');
    expect(result.smallWorkspacesRollup).toEqual({
      workspaceCount: 1,
      activeCount: 2,
    });
  });

  test('owner exclusion is enforced: groupBy filter includes isPlatformOwner: false', async () => {
    await getActiveWorkspaceBreakdown(300);
    const args = mockUserGroupBy.mock.calls[0][0];
    expect(args.where.isPlatformOwner).toBe(false);
  });

  test('null lastActiveWorkspaceId rows (active but not in any workspace) are NOT in perWorkspace', async () => {
    mockUserGroupBy.mockResolvedValue([
      { lastActiveWorkspaceId: null, _count: { _all: 3 } },
      { lastActiveWorkspaceId: 'ws-big', _count: { _all: 5 } },
    ]);
    mockMembershipGroupBy.mockResolvedValue([
      { workspaceId: 'ws-big', _count: { userId: 50 } },
    ]);
    mockWorkspaceFindMany.mockResolvedValue([{ id: 'ws-big', nameAr: 'كبير' }]);
    mockUserFindMany.mockResolvedValue([]);

    const result = await getActiveWorkspaceBreakdown(300);
    // null-workspace users contribute to total activity but never to perWorkspace.
    expect(result.perWorkspace).toHaveLength(1);
    expect(result.perWorkspace[0].workspaceId).toBe('ws-big');
  });
});

describe('getActiveWorkspaceBreakdown — dominant category tie-break (D3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserGroupBy.mockResolvedValue([]);
    mockMembershipGroupBy.mockResolvedValue([]);
    mockWorkspaceFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([]);
  });

  test('2 viewing + 2 editing → dominantCategory is viewing (D3 tie-break)', async () => {
    mockUserGroupBy.mockResolvedValue([
      { lastActiveWorkspaceId: 'ws-tied', _count: { _all: 4 } },
    ]);
    mockMembershipGroupBy.mockResolvedValue([
      { workspaceId: 'ws-tied', _count: { userId: 50 } },
    ]);
    mockWorkspaceFindMany.mockResolvedValue([
      { id: 'ws-tied', nameAr: 'متعادل' },
    ]);
    // 2 editing routes, 2 viewing routes.
    mockUserFindMany.mockResolvedValue([
      {
        lastActiveWorkspaceId: 'ws-tied',
        lastActiveRoute: '/api/workspaces/[id]/tree/individuals',
      },
      {
        lastActiveWorkspaceId: 'ws-tied',
        lastActiveRoute: '/api/workspaces/[id]/tree/families',
      },
      {
        lastActiveWorkspaceId: 'ws-tied',
        lastActiveRoute: '/workspaces/[slug]/tree',
      },
      {
        lastActiveWorkspaceId: 'ws-tied',
        lastActiveRoute: '/workspaces/[slug]',
      },
    ]);

    const result = await getActiveWorkspaceBreakdown(300);
    // Note: classifyRoute treats /api/.../individuals as viewing on GET,
    // editing on POST/PATCH/DELETE. Because lastActiveRoute is just the
    // pattern (no method recorded), we infer category by whether the
    // pattern is in the editing-pattern allow-list. So 2 routes that
    // can be edited + 2 view-only routes → 2 editing, 2 viewing → tied → 'viewing'.
    expect(result.perWorkspace[0].dominantCategory).toBe('viewing');
  });

  test('majority editing → dominantCategory editing', async () => {
    mockUserGroupBy.mockResolvedValue([
      { lastActiveWorkspaceId: 'ws-edit', _count: { _all: 3 } },
    ]);
    mockMembershipGroupBy.mockResolvedValue([
      { workspaceId: 'ws-edit', _count: { userId: 50 } },
    ]);
    mockWorkspaceFindMany.mockResolvedValue([
      { id: 'ws-edit', nameAr: 'يعدل' },
    ]);
    // We need to mark these as editing. Since classifyRoute requires a
    // mutating method to flag editing, the breakdown logic infers from
    // whether the route is *capable* of being mutated. So /api/...individuals
    // counts as editing for the breakdown's purposes. To make this test
    // unambiguous we use a clearly-mutating method-route-like indicator.
    // For now: 3 routes in the editing-pattern allow-list → 3 editors.
    mockUserFindMany.mockResolvedValue([
      {
        lastActiveWorkspaceId: 'ws-edit',
        lastActiveRoute: '/api/workspaces/[id]/tree/individuals',
      },
      {
        lastActiveWorkspaceId: 'ws-edit',
        lastActiveRoute: '/api/workspaces/[id]/tree/families',
      },
      {
        lastActiveWorkspaceId: 'ws-edit',
        lastActiveRoute: '/api/workspaces/[id]/tree/rada-families',
      },
    ]);

    const result = await getActiveWorkspaceBreakdown(300);
    expect(result.perWorkspace[0].dominantCategory).toBe('editing');
  });
});

describe('getQuietWindowHeatmap — bucketing (#8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns a 7×24 grid of zeros when no activity', async () => {
    mockUserFindMany.mockResolvedValue([]);
    const grid = await getQuietWindowHeatmap();
    expect(grid).toHaveLength(7);
    expect(grid[0]).toHaveLength(24);
    expect(grid.flat().every((v) => v === 0)).toBe(true);
  });

  test('a single active user at 2026-04-25T03:30:00Z → bucket [Sat=6][3]', async () => {
    // 2026-04-25 is a Saturday. UTC hour 3. JS getUTCDay(): Sat = 6.
    mockUserFindMany.mockResolvedValue([
      { lastActiveAt: new Date('2026-04-25T03:30:00Z') },
    ]);
    const grid = await getQuietWindowHeatmap();
    expect(grid[6][3]).toBe(1);
    // All other buckets are zero.
    let total = 0;
    for (const row of grid) for (const cell of row) total += cell;
    expect(total).toBe(1);
  });

  test('three users at the same bucket → count is 3', async () => {
    mockUserFindMany.mockResolvedValue([
      { lastActiveAt: new Date('2026-04-25T03:30:00Z') },
      { lastActiveAt: new Date('2026-04-25T03:45:00Z') },
      { lastActiveAt: new Date('2026-04-25T03:00:00Z') },
    ]);
    const grid = await getQuietWindowHeatmap();
    expect(grid[6][3]).toBe(3);
  });

  test('owner exclusion: query filters isPlatformOwner: false', async () => {
    mockUserFindMany.mockResolvedValue([]);
    await getQuietWindowHeatmap();
    const args = mockUserFindMany.mock.calls[0][0];
    expect(args.where.isPlatformOwner).toBe(false);
  });

  test('only considers last 7 days: gte filter is 7 days ago', async () => {
    mockUserFindMany.mockResolvedValue([]);
    await getQuietWindowHeatmap();
    const args = mockUserFindMany.mock.calls[0][0];
    const gte: Date = args.where.lastActiveAt.gte;
    const deltaMs = Date.now() - gte.getTime();
    expect(Math.abs(deltaMs - 7 * 86_400_000)).toBeLessThan(2_000);
  });
});

describe('updatePeakConcurrency — conditional update (#9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteRaw.mockResolvedValue(1);
  });

  test('issues a single UPDATE with WHERE peak < $1 (atomic, no TOCTOU)', async () => {
    await updatePeakConcurrency(42);
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
    // The first arg is a TemplateStringsArray; we look at the raw SQL.
    const callArgs = mockExecuteRaw.mock.calls[0];
    // Either the TaggedTemplate or interpolated form — both contain the SQL.
    const sql = String(
      Array.isArray(callArgs[0])
        ? (callArgs[0] as ReadonlyArray<string>).join(' ')
        : callArgs[0],
    );
    expect(sql.toLowerCase()).toMatch(/update\s+platform_stats/);
    expect(sql.toLowerCase()).toMatch(/where\s+peak_concurrent_users\s*<\s*/);
    expect(sql.toLowerCase()).toMatch(/peak_recorded_at\s*=\s*now\(\)/);
  });

  test('does not throw if the update affects 0 rows (current peak already ≥ count)', async () => {
    mockExecuteRaw.mockResolvedValue(0);
    await expect(updatePeakConcurrency(5)).resolves.toBeUndefined();
  });

  test('errors are swallowed (best-effort, never blocks the dashboard read)', async () => {
    mockExecuteRaw.mockRejectedValueOnce(new Error('DB hiccup'));
    await expect(updatePeakConcurrency(99)).resolves.toBeUndefined();
  });
});

describe('getPresenceMetrics — composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCount.mockResolvedValue(0);
    mockUserGroupBy.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([]);
    mockMembershipGroupBy.mockResolvedValue([]);
    mockWorkspaceFindMany.mockResolvedValue([]);
    mockPlatformStatFindUnique.mockResolvedValue({
      peakConcurrentUsers: 12,
      peakRecordedAt: new Date('2026-04-20T12:00:00Z'),
    });
  });

  test('returns the response shape from the spec', async () => {
    mockUserCount.mockImplementation((args: { where: { lastActiveAt: { gte: Date } } }) => {
      const seconds = Math.round((Date.now() - args.where.lastActiveAt.gte.getTime()) / 1000);
      if (seconds === 60) return Promise.resolve(3);
      if (seconds === 300) return Promise.resolve(7);
      return Promise.resolve(0);
    });

    const out = await getPresenceMetrics();
    expect(out).toMatchObject({
      active1m: 3,
      active5m: 7,
      activeWorkspaces: 0,
      perWorkspace: [],
      smallWorkspacesRollup: null,
      heatmap: expect.any(Array),
      peak: {
        count: 12,
        recordedAt: '2026-04-20T12:00:00.000Z',
      },
    });
    expect(out.heatmap).toHaveLength(7);
    expect(out.heatmap[0]).toHaveLength(24);
  });

  test('peak.recordedAt is null when never recorded', async () => {
    mockPlatformStatFindUnique.mockResolvedValue({
      peakConcurrentUsers: 0,
      peakRecordedAt: null,
    });
    const out = await getPresenceMetrics();
    expect(out.peak.recordedAt).toBeNull();
  });
});
