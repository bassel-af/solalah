/**
 * Live Presence — write tracker.
 *
 * Wraps a `Map`-backed LRU cache so we hit the DB at most once per minute
 * per user (or sooner on workspace / category transitions). Single-process
 * only; multi-instance deployment will need a shared cache (see
 * `src/lib/api/rate-limit.ts` for the analogous note).
 *
 * Privacy contract (the load-bearing reason this code exists):
 *   - The DB write payload contains ONLY `lastActiveAt`, `lastActiveRoute`,
 *     `lastActiveWorkspaceId`. Never email, displayName, or any other
 *     User column. A test pins this in `presence-tracker.test.ts` Pt 1.
 *   - Unknown / adversarial pathnames are rejected by `normalizeRoutePattern`
 *     before we ever reach the DB.
 */

import { prisma } from '@/lib/db';
import {
  classifyRoute,
  normalizeRoutePattern,
  type ActivityCategory,
} from '@/lib/admin/presence';

export const PRESENCE_THROTTLE_MS = 60_000;
export const PRESENCE_LRU_CAP = 50_000;
export const PRESENCE_TTL_MS = 5 * 60 * 1000;
const SLUG_CACHE_TTL_MS = 5 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60_000;

export interface TrackPresenceArgs {
  userId: string;
  pathname: string;
  method: string;
}

interface PresenceEntry {
  lastWriteAt: number;
  lastRoute: string;
  lastCategory: ActivityCategory;
  lastWorkspaceId: string | null;
}

interface SlugEntry {
  workspaceId: string | null;
  resolvedAt: number;
}

let lruCap = PRESENCE_LRU_CAP;
// Map iteration order is insertion order, so re-inserting a key after a
// delete bumps it to MRU. That's exactly the LRU behavior we want.
let presenceCache: Map<string, PresenceEntry> = new Map();
let slugCache: Map<string, SlugEntry> = new Map();
let sweepTimer: ReturnType<typeof setInterval> | null = null;

function startSweepTimer(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const cutoff = Date.now() - PRESENCE_TTL_MS;
    for (const [key, entry] of presenceCache) {
      if (entry.lastWriteAt < cutoff) presenceCache.delete(key);
    }
    const slugCutoff = Date.now() - SLUG_CACHE_TTL_MS;
    for (const [key, entry] of slugCache) {
      if (entry.resolvedAt < slugCutoff) slugCache.delete(key);
    }
  }, SWEEP_INTERVAL_MS);
  if (sweepTimer.unref) sweepTimer.unref();
}

function bumpToMru(key: string, entry: PresenceEntry): void {
  presenceCache.delete(key);
  presenceCache.set(key, entry);
}

function evictIfOverCap(): void {
  while (presenceCache.size > lruCap) {
    const oldest = presenceCache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    presenceCache.delete(oldest);
  }
}

function extractSlugFromPath(pathname: string): string | null {
  // Match /workspaces/<slug>/... — slug is the second path segment.
  // We assume normalizeRoutePattern already approved the path; this is
  // for the page-route case only.
  const m = pathname.match(/^\/workspaces\/([^/]+)(?:\/|$)/);
  if (!m) return null;
  return m[1];
}

function extractWorkspaceIdFromApi(pathname: string): string | null {
  // Match /api/workspaces/<uuid>/...
  const m = pathname.match(/^\/api\/workspaces\/([^/]+)(?:\/|$)/);
  if (!m) return null;
  return m[1];
}

async function resolveWorkspaceFromPath(pathname: string): Promise<string | null> {
  // API paths already carry the workspace UUID — no DB lookup needed.
  const apiId = extractWorkspaceIdFromApi(pathname);
  if (apiId !== null) return apiId;

  const slug = extractSlugFromPath(pathname);
  if (!slug) return null;

  const cached = slugCache.get(slug);
  const now = Date.now();
  if (cached && cached.resolvedAt + SLUG_CACHE_TTL_MS > now) {
    return cached.workspaceId;
  }
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true },
  });
  const workspaceId = workspace?.id ?? null;
  slugCache.set(slug, { workspaceId, resolvedAt: now });
  return workspaceId;
}

/**
 * Best-effort. Never throws. Caller treats this as fire-and-forget.
 */
export async function trackPresence(args: TrackPresenceArgs): Promise<void> {
  try {
    startSweepTimer();

    const pattern = normalizeRoutePattern(args.pathname);
    if (!pattern) return;

    const category = classifyRoute(pattern, args.method);
    const workspaceId = await resolveWorkspaceFromPath(args.pathname);

    const now = Date.now();
    const existing = presenceCache.get(args.userId);

    const shouldWrite =
      !existing ||
      now - existing.lastWriteAt >= PRESENCE_THROTTLE_MS ||
      existing.lastWorkspaceId !== workspaceId ||
      existing.lastCategory !== category;

    if (!shouldWrite) {
      // Still touch the LRU position so a steady-state user doesn't fall
      // off the cap.
      bumpToMru(args.userId, existing!);
      return;
    }

    const newEntry: PresenceEntry = {
      lastWriteAt: now,
      lastRoute: pattern,
      lastCategory: category,
      lastWorkspaceId: workspaceId,
    };
    bumpToMru(args.userId, newEntry);
    evictIfOverCap();

    // Privacy contract — narrow data shape, no other User columns.
    await prisma.user.updateMany({
      where: { id: args.userId },
      data: {
        lastActiveAt: new Date(now),
        lastActiveRoute: pattern,
        lastActiveWorkspaceId: workspaceId,
      },
    });
  } catch {
    // Swallow — tracking errors must never propagate into request handling.
  }
}

export function __resetPresenceTrackerForTests(): void {
  presenceCache = new Map();
  slugCache = new Map();
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

export function __setLruCapForTests(cap: number): void {
  lruCap = cap;
}
