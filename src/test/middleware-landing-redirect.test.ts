import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

/**
 * Phase 0 SEO — landing page split.
 *
 * Previously `/` was a pure public path that fell through without auth logic.
 * Now the middleware owns the authenticated-user redirect so that:
 *   - Crawlers (anonymous) still see the server-rendered hero at `/`.
 *   - Logged-in humans get bounced straight to `/workspaces` before the
 *     client-side hydration runs.
 *
 * We mock `@/lib/supabase/middleware.updateSession` directly — it's the
 * seam the middleware uses, and hoisting lets vitest apply the mock before
 * the middleware module imports it.
 */

const { mockUpdateSession } = vi.hoisted(() => ({
  mockUpdateSession: vi.fn(),
}));

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: mockUpdateSession,
}));

// Prisma is transitively imported by the middleware for the admin gate.
// Stub it so the middleware module loads cleanly under vitest.
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

function makeRequest(path: string) {
  return new NextRequest(`http://localhost:4000${path}`);
}

describe('middleware — landing page redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('GET / with authenticated user redirects to /workspaces', async () => {
    mockUpdateSession.mockResolvedValue({
      user: { id: 'u1' },
      supabaseResponse: NextResponse.next(),
    });

    const request = makeRequest('/');
    const response = await middleware(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/workspaces');
  });

  test('GET / anonymous falls through (no redirect)', async () => {
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: NextResponse.next(),
    });

    const request = makeRequest('/');
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  test('GET /islamic-gedcom still falls through (different public path, no new redirect)', async () => {
    // updateSession must NOT be called for non-/ public paths — the existing
    // public-path early-return still owns those.
    mockUpdateSession.mockResolvedValue({
      user: { id: 'u1' },
      supabaseResponse: NextResponse.next(),
    });

    const request = makeRequest('/islamic-gedcom');
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(mockUpdateSession).not.toHaveBeenCalled();
  });
});
