import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/api/admin-auth';
import { logAdminAccess } from '@/lib/audit/admin-access';
import {
  getPresenceMetrics,
  updatePeakConcurrency,
} from '@/lib/admin/presence';
import { withUserCache } from '@/lib/admin/cache';

// Presence is "right-now" data. The cache TTL is short — long enough that
// rapid refreshes don't hammer the DB, short enough that the 1-minute
// active count stays meaningful. The PRD's "every read is fresh" rule for
// presence is upheld by getPresenceMetrics() itself; this cache only
// exists for the fan-out (active count + breakdown + heatmap + peak).
const CACHE_TTL_MS = 5_000;

/**
 * GET /api/admin/metrics/presence
 *
 * Owner-only. Returns the live-presence payload (active counts,
 * per-workspace breakdown, 7×24 quiet-window heatmap, peak record).
 * Lazily updates `PlatformStat.peak_concurrent_users` on each read —
 * fire-and-forget so the response is not blocked by the peak write.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if (auth instanceof NextResponse) return auth;

  await logAdminAccess({
    userId: auth.user.id,
    action: 'admin_metrics_presence_read',
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  });

  try {
    const payload = await withUserCache(
      auth.user.id,
      'presence',
      () => getPresenceMetrics(),
      CACHE_TTL_MS,
    );

    // Fire-and-forget peak update. Errors and slow responses must NOT
    // block the route response.
    void updatePeakConcurrency(payload.active5m).catch(() => {});

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[admin/metrics/presence] query failed', err);
    const errorType = err instanceof Error ? err.constructor.name : typeof err;
    return NextResponse.json({ error: 'query_failed', errorType });
  }
}
