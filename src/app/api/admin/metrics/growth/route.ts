import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/api/admin-auth';
import { logAdminAccess } from '@/lib/audit/admin-access';
import { getGrowthMetrics } from '@/lib/admin/queries';
import { withUserCache } from '@/lib/admin/cache';

const CACHE_TTL_MS = 60_000;

/**
 * GET /api/admin/metrics/growth
 *
 * Returns flat growth metrics (workspaces, users, invitation acceptance).
 * Owner-only — every call is written to `AdminAccessLog`. The dashboard
 * never 500s on a query failure: we surface a `{ error: 'query_failed' }`
 * envelope inline so the owner sees a red card instead of a blank page.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if (auth instanceof NextResponse) return auth;

  await logAdminAccess({
    userId: auth.user.id,
    action: 'admin_metrics_growth_read',
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  });

  try {
    const payload = await withUserCache(
      auth.user.id,
      'growth',
      () => getGrowthMetrics(),
      CACHE_TTL_MS,
    );
    return NextResponse.json(payload);
  } catch (err) {
    const errorType =
      err instanceof Error ? err.constructor.name : typeof err;
    return NextResponse.json({ error: 'query_failed', errorType });
  }
}
