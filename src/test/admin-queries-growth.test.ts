/**
 * Phase 1 — Platform Owner Dashboard / Growth metrics.
 *
 * Unit tests for `getGrowthMetrics()` at `src/lib/admin/queries.ts`.
 * Prisma is mocked; each Prisma method returns a hand-rolled fixture so
 * each metric's arithmetic and filter predicate can be asserted
 * independently.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockWorkspaceCount = vi.fn();
const mockUserCount = vi.fn();
const mockInvitationCount = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    workspace: {
      count: (...args: unknown[]) => mockWorkspaceCount(...args),
    },
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
    },
    workspaceInvitation: {
      count: (...args: unknown[]) => mockInvitationCount(...args),
    },
  },
}));

import { getGrowthMetrics } from '@/lib/admin/queries';

describe('getGrowthMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns totalWorkspaces from workspace.count() with no where clause', async () => {
    mockWorkspaceCount.mockImplementation((args?: { where?: unknown }) => {
      if (!args || args.where === undefined) return Promise.resolve(42);
      // 7d / 30d calls
      return Promise.resolve(0);
    });
    mockUserCount.mockResolvedValue(0);
    mockInvitationCount.mockResolvedValue(0);

    const metrics = await getGrowthMetrics();
    expect(metrics.totalWorkspaces).toBe(42);
  });

  test('workspacesCreatedLast7d uses createdAt gte now-7d', async () => {
    const calls: Array<{ where?: { createdAt?: { gte?: Date } } }> = [];
    mockWorkspaceCount.mockImplementation((args?: { where?: { createdAt?: { gte?: Date } } }) => {
      if (args) calls.push(args);
      if (!args || !args.where) return Promise.resolve(100);
      // Discriminate by the time-window width.
      const gte = args.where.createdAt?.gte;
      if (!gte) return Promise.resolve(0);
      const deltaMs = Date.now() - gte.getTime();
      if (Math.abs(deltaMs - 7 * 86_400_000) < 2_000) return Promise.resolve(3);
      if (Math.abs(deltaMs - 30 * 86_400_000) < 2_000) return Promise.resolve(9);
      return Promise.resolve(0);
    });
    mockUserCount.mockResolvedValue(0);
    mockInvitationCount.mockResolvedValue(0);

    const metrics = await getGrowthMetrics();
    expect(metrics.workspacesCreatedLast7d).toBe(3);
    expect(metrics.workspacesCreatedLast30d).toBe(9);
  });

  test('totalUsers, usersCreatedLast7d, usersCreatedLast30d come from user.count', async () => {
    mockWorkspaceCount.mockResolvedValue(0);
    mockUserCount.mockImplementation((args?: { where?: { createdAt?: { gte?: Date } } }) => {
      if (!args || !args.where) return Promise.resolve(500);
      const gte = args.where.createdAt?.gte;
      if (!gte) return Promise.resolve(0);
      const deltaMs = Date.now() - gte.getTime();
      if (Math.abs(deltaMs - 7 * 86_400_000) < 2_000) return Promise.resolve(15);
      if (Math.abs(deltaMs - 30 * 86_400_000) < 2_000) return Promise.resolve(60);
      return Promise.resolve(0);
    });
    mockInvitationCount.mockResolvedValue(0);

    const metrics = await getGrowthMetrics();
    expect(metrics.totalUsers).toBe(500);
    expect(metrics.usersCreatedLast7d).toBe(15);
    expect(metrics.usersCreatedLast30d).toBe(60);
  });

  test('pendingInvitations counts status=pending AND (expiresAt IS NULL OR expiresAt > now)', async () => {
    let captured: { where?: unknown } | undefined;
    mockWorkspaceCount.mockResolvedValue(0);
    mockUserCount.mockResolvedValue(0);
    mockInvitationCount.mockImplementation(
      (args?: { where?: { status?: string; createdAt?: unknown } }) => {
        // First call = pending invitations (no createdAt window)
        if (args?.where?.status === 'pending' && !args.where.createdAt) {
          captured = args;
          return Promise.resolve(7);
        }
        return Promise.resolve(0);
      },
    );

    const metrics = await getGrowthMetrics();
    expect(metrics.pendingInvitations).toBe(7);

    expect(captured).toBeDefined();
    const where = (captured as { where: Record<string, unknown> }).where;
    expect(where.status).toBe('pending');
    // Must have an OR clause over expiresAt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const or = (where as any).OR;
    expect(Array.isArray(or)).toBe(true);
    expect(or).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ expiresAt: null }),
      ]),
    );
    const hasGtClause = or.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (clause: any) => clause.expiresAt?.gt instanceof Date,
    );
    expect(hasGtClause).toBe(true);
  });

  test('inviteAcceptanceRate30d = accepted / (accepted + revoked + pending-older-than-7d), rounded to 2 decimals', async () => {
    mockWorkspaceCount.mockResolvedValue(0);
    mockUserCount.mockResolvedValue(0);
    // Sequence: 1 pending-window, 2 accepted-30d, 3 revoked-30d, 4 pending-older-than-7d-within-30d
    const invitationCalls = vi
      .fn()
      .mockResolvedValueOnce(0) // pendingInvitations
      .mockResolvedValueOnce(78) // accepted in last 30d
      .mockResolvedValueOnce(10) // revoked in last 30d
      .mockResolvedValueOnce(12); // pending older than 7d but still within 30d
    mockInvitationCount.mockImplementation((...args) => invitationCalls(...args));

    const metrics = await getGrowthMetrics();
    // denom = 78 + 10 + 12 = 100 → rate = 0.78
    expect(metrics.inviteAcceptanceRate30d).toBe(0.78);
  });

  test('inviteAcceptanceRate30d returns null when denominator is 0', async () => {
    mockWorkspaceCount.mockResolvedValue(0);
    mockUserCount.mockResolvedValue(0);
    mockInvitationCount.mockResolvedValue(0);

    const metrics = await getGrowthMetrics();
    expect(metrics.inviteAcceptanceRate30d).toBeNull();
  });

  test('return shape is flat (no nested objects)', async () => {
    mockWorkspaceCount.mockResolvedValue(0);
    mockUserCount.mockResolvedValue(0);
    mockInvitationCount.mockResolvedValue(0);
    const metrics = await getGrowthMetrics();

    const expectedKeys = [
      'totalWorkspaces',
      'workspacesCreatedLast7d',
      'workspacesCreatedLast30d',
      'totalUsers',
      'usersCreatedLast7d',
      'usersCreatedLast30d',
      'pendingInvitations',
      'inviteAcceptanceRate30d',
    ].sort();
    expect(Object.keys(metrics).sort()).toEqual(expectedKeys);
  });
});
