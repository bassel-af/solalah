/**
 * Platform Owner Dashboard — metric aggregation helpers.
 *
 * Every exported function returns a flat JSON object (plain numbers,
 * strings, arrays — no Prisma types leak out). This is the ONLY place in
 * the codebase that issues unscoped cross-workspace reads, which keeps
 * every privacy-sensitive aggregation grep-auditable from a single file.
 *
 * Principles (see `docs/prd-admin-dashboard.md` §3):
 *   - Metadata only. No encrypted-column reads. No decrypt calls.
 *   - k-anonymity on top-N lists: exclude workspaces with fewer than 5
 *     total members so a tiny family can't be singled out by activity.
 *   - Never return user displayName / email. Workspace `nameAr` is fine
 *     (already semi-public to members).
 *   - Health probes surface inline errors; they never throw the helper
 *     itself (PRD §11: "never throw a 500 for a dashboard read").
 */

import { prisma } from '@/lib/db';
import { verifyMailTransport } from '@/lib/email/transport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GrowthMetrics {
  totalWorkspaces: number;
  workspacesCreatedLast7d: number;
  workspacesCreatedLast30d: number;
  totalUsers: number;
  usersCreatedLast7d: number;
  usersCreatedLast30d: number;
  pendingInvitations: number;
  /** accepted / (accepted + revoked + pending-older-than-7d) within 30d window; null if denominator is 0. */
  inviteAcceptanceRate30d: number | null;
}

export interface EngagementTopWorkspace {
  workspaceId: string;
  name: string;
  editCount: number;
}

export interface EngagementMetrics {
  weeklyActiveWorkspaces: number;
  editsLast7d: number;
  editsLast30d: number;
  avgEditsPerActiveWorkspace: number | null;
  workspacesWithMultipleMembers: number;
  topActiveWorkspaces7d: EngagementTopWorkspace[];
  branchPointers: { active: number; revoked: number; broken: number };
}

export interface HealthMetrics {
  db: { ok: boolean; error?: string };
  gotrue: { ok: boolean; status?: number; error?: string };
  mail: { ok: boolean; error?: string };
  encryption: { masterKeyLoaded: boolean };
  storage: { totalMediaBytes: number | null };
  adminReadsLast24h: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function errorClassName(err: unknown): string {
  if (err instanceof Error) return err.constructor.name;
  return typeof err;
}

// ---------------------------------------------------------------------------
// Growth
// ---------------------------------------------------------------------------

export async function getGrowthMetrics(): Promise<GrowthMetrics> {
  const now = new Date();
  const sevenDaysAgo = daysAgo(7);
  const thirtyDaysAgo = daysAgo(30);

  const [
    totalWorkspaces,
    workspacesCreatedLast7d,
    workspacesCreatedLast30d,
    totalUsers,
    usersCreatedLast7d,
    usersCreatedLast30d,
    pendingInvitations,
    accepted30d,
    revoked30d,
    staleButPending,
  ] = await Promise.all([
    prisma.workspace.count(),
    prisma.workspace.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.workspace.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    // Pending and not yet expired
    prisma.workspaceInvitation.count({
      where: {
        status: 'pending',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    // 30-day acceptance rate denominator components
    prisma.workspaceInvitation.count({
      where: { status: 'accepted', createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.workspaceInvitation.count({
      where: { status: 'revoked', createdAt: { gte: thirtyDaysAgo } },
    }),
    // "pending older than 7d but still within 30d window" — invites that
    // have been sitting unloved long enough to count against the rate.
    prisma.workspaceInvitation.count({
      where: {
        status: 'pending',
        createdAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo },
      },
    }),
  ]);

  const denom = accepted30d + revoked30d + staleButPending;
  const inviteAcceptanceRate30d = denom === 0 ? null : round2(accepted30d / denom);

  return {
    totalWorkspaces,
    workspacesCreatedLast7d,
    workspacesCreatedLast30d,
    totalUsers,
    usersCreatedLast7d,
    usersCreatedLast30d,
    pendingInvitations,
    inviteAcceptanceRate30d,
  };
}

// ---------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------

const TOP_N = 10;
const K_ANONYMITY_MIN_MEMBERS = 5;

export async function getEngagementMetrics(): Promise<EngagementMetrics> {
  const sevenDaysAgo = daysAgo(7);
  const thirtyDaysAgo = daysAgo(30);

  const [
    weeklyActiveWorkspaces,
    editsLast7d,
    editsLast30d,
    membershipGroups,
    editGroups,
    pointerGroups,
  ] = await Promise.all([
    prisma.familyTree.count({ where: { lastModifiedAt: { gte: sevenDaysAgo } } }),
    // NOTE: TreeEditLog's column is `timestamp`, not `createdAt` — the PRD
    // draft called it createdAt but the schema disagrees (see prisma/schema.prisma).
    prisma.treeEditLog.count({ where: { timestamp: { gte: sevenDaysAgo } } }),
    prisma.treeEditLog.count({ where: { timestamp: { gte: thirtyDaysAgo } } }),
    prisma.workspaceMembership.groupBy({
      by: ['workspaceId'],
      _count: { userId: true },
    }),
    prisma.treeEditLog.groupBy({
      by: ['treeId'],
      where: { timestamp: { gte: sevenDaysAgo } },
      _count: { _all: true },
      orderBy: { _count: { treeId: 'desc' } },
      take: 50,
    }),
    prisma.branchPointer.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const workspacesWithMultipleMembers = (membershipGroups as Array<{
    workspaceId: string;
    _count: { userId: number };
  }>).filter((g) => g._count.userId >= 2).length;

  const avgEditsPerActiveWorkspace =
    weeklyActiveWorkspaces === 0
      ? null
      : round2(editsLast7d / weeklyActiveWorkspaces);

  // Resolve treeId → workspace (+ membership count for k-anonymity).
  const editGroupsTyped = editGroups as Array<{
    treeId: string;
    _count: { _all: number };
  }>;
  const treeIds = editGroupsTyped.map((g) => g.treeId);

  // Pull workspaces for every touched tree plus their member counts. We pass
  // `_count: { memberships: true }` because this is an include-based count
  // without a `where` filter — Prisma v7 with the pg driver-adapter supports
  // that shape (the limitation documented in CLAUDE.md is specifically about
  // `_count` with nested `where`).
  const workspaces = treeIds.length
    ? await prisma.workspace.findMany({
        where: { familyTree: { id: { in: treeIds } } },
        select: {
          id: true,
          nameAr: true,
          familyTree: { select: { id: true } },
          _count: { select: { memberships: true } },
        },
      })
    : [];

  const treeToWorkspace = new Map<
    string,
    { id: string; nameAr: string; memberCount: number }
  >();
  for (const w of workspaces as Array<{
    id: string;
    nameAr: string;
    familyTree: { id: string } | null;
    _count: { memberships: number };
  }>) {
    if (w.familyTree) {
      treeToWorkspace.set(w.familyTree.id, {
        id: w.id,
        nameAr: w.nameAr,
        memberCount: w._count.memberships,
      });
    }
  }

  const topActiveWorkspaces7d: EngagementTopWorkspace[] = editGroupsTyped
    .map((g) => {
      const ws = treeToWorkspace.get(g.treeId);
      if (!ws) return null;
      if (ws.memberCount < K_ANONYMITY_MIN_MEMBERS) return null;
      return {
        workspaceId: ws.id,
        name: ws.nameAr,
        editCount: g._count._all,
      };
    })
    .filter((row): row is EngagementTopWorkspace => row !== null)
    .sort((a, b) => b.editCount - a.editCount)
    .slice(0, TOP_N);

  const pointerCounts = { active: 0, revoked: 0, broken: 0 } as {
    active: number;
    revoked: number;
    broken: number;
  };
  for (const g of pointerGroups as Array<{
    status: 'active' | 'revoked' | 'broken';
    _count: { _all: number };
  }>) {
    pointerCounts[g.status] = g._count._all;
  }

  return {
    weeklyActiveWorkspaces,
    editsLast7d,
    editsLast30d,
    avgEditsPerActiveWorkspace,
    workspacesWithMultipleMembers,
    topActiveWorkspaces7d,
    branchPointers: pointerCounts,
  };
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

const GOTRUE_TIMEOUT_MS = 2_000;

async function probeDb(): Promise<HealthMetrics['db']> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorClassName(err) };
  }
}

async function probeGotrue(): Promise<HealthMetrics['gotrue']> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return { ok: false, error: 'ConfigMissing' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOTRUE_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/auth/v1/health`, {
      signal: controller.signal,
    });
    return { ok: res.status === 200, status: res.status };
  } catch (err) {
    return { ok: false, error: errorClassName(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function probeMail(): Promise<HealthMetrics['mail']> {
  try {
    await verifyMailTransport();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorClassName(err) };
  }
}

function probeEncryption(): HealthMetrics['encryption'] {
  const raw = process.env.WORKSPACE_MASTER_KEY;
  if (!raw) return { masterKeyLoaded: false };
  try {
    const buf = Buffer.from(raw, 'base64');
    // Reject strings that decode but aren't actually base64 of 32 bytes.
    // Buffer.from with malformed base64 returns garbage — round-trip check
    // is the cheapest reliable filter.
    if (buf.length !== 32) return { masterKeyLoaded: false };
    if (buf.toString('base64').replace(/=+$/, '') !== raw.replace(/=+$/, '')) {
      return { masterKeyLoaded: false };
    }
    return { masterKeyLoaded: true };
  } catch {
    return { masterKeyLoaded: false };
  }
}

async function probeStorage(): Promise<HealthMetrics['storage']> {
  try {
    const result = await prisma.albumMedia.aggregate({
      _sum: { fileSizeBytes: true },
    });
    const sum = result._sum.fileSizeBytes;
    if (sum === null || sum === undefined) return { totalMediaBytes: 0 };
    return { totalMediaBytes: Number(sum) };
  } catch {
    return { totalMediaBytes: null };
  }
}

async function probeAdminReads(): Promise<number> {
  try {
    return await prisma.adminAccessLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
  } catch {
    return 0;
  }
}

export async function getHealthMetrics(): Promise<HealthMetrics> {
  const [db, gotrue, mail, storage, adminReadsLast24h] = await Promise.all([
    probeDb(),
    probeGotrue(),
    probeMail(),
    probeStorage(),
    probeAdminReads(),
  ]);
  const encryption = probeEncryption();
  return { db, gotrue, mail, encryption, storage, adminReadsLast24h };
}
