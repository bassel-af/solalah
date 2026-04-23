import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/api/admin-auth';

/**
 * GET /api/admin/healthcheck
 *
 * Canary route used to:
 *   - prove the requirePlatformOwner guard composes with the middleware
 *     defense-in-depth gate end-to-end (returns 200 only for owners),
 *   - satisfy the positive case in src/test/admin-auth-coverage.test.ts
 *     so that test isn't trivially passing on an empty glob.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({ ok: true });
}
