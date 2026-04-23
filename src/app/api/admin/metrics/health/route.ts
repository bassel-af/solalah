import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/api/admin-auth';
import { logAdminAccess } from '@/lib/audit/admin-access';
import { getHealthMetrics } from '@/lib/admin/queries';
import { withUserCache } from '@/lib/admin/cache';

const CACHE_TTL_MS = 60_000;

/**
 * GET /api/admin/metrics/health
 *
 * Returns the platform health snapshot: DB / GoTrue / mail probe results,
 * master-key-loaded boolean, storage sum, and 24h admin read count.
 * Per-probe failures surface inline (`{ ok: false, error: 'ClassName' }`);
 * this handler itself never throws.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if (auth instanceof NextResponse) return auth;

  await logAdminAccess({
    userId: auth.user.id,
    action: 'admin_metrics_health_read',
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  });

  try {
    const payload = await withUserCache(
      auth.user.id,
      'health',
      () => getHealthMetrics(),
      CACHE_TTL_MS,
    );
    return NextResponse.json(payload);
  } catch (err) {
    // getHealthMetrics() is designed not to throw, but if the cache layer
    // itself fails (OOM, etc.), we still honor the "never 500 a dashboard
    // read" rule from PRD §11.
    const errorType =
      err instanceof Error ? err.constructor.name : typeof err;
    return NextResponse.json({ error: 'query_failed', errorType });
  }
}
