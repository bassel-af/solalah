import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/api/admin-auth';
import { logAdminAccess } from '@/lib/audit/admin-access';
import { getEngagementMetrics } from '@/lib/admin/queries';
import { withUserCache } from '@/lib/admin/cache';

const CACHE_TTL_MS = 60_000;

/**
 * GET /api/admin/metrics/engagement
 *
 * Returns flat engagement metrics: weekly active workspaces, edit counts,
 * top-N active workspaces (k-anonymity ≥ 5 members), and branch pointer
 * usage. Owner-only; every call is audited.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if (auth instanceof NextResponse) return auth;

  await logAdminAccess({
    userId: auth.user.id,
    action: 'admin_metrics_engagement_read',
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  });

  try {
    const payload = await withUserCache(
      auth.user.id,
      'engagement',
      () => getEngagementMetrics(),
      CACHE_TTL_MS,
    );
    return NextResponse.json(payload);
  } catch (err) {
    const errorType =
      err instanceof Error ? err.constructor.name : typeof err;
    return NextResponse.json({ error: 'query_failed', errorType });
  }
}
