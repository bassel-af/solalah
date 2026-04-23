import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * T5 — Middleware admin gating.
 *
 * Defense-in-depth fallback for forgotten guards:
 *   (a) anon → /admin            → redirect to /auth/login
 *   (b) authed non-owner → /admin → redirect to /workspaces
 *   (c) authed non-owner → /api/admin/foo → 403 JSON
 *   (d) anon → /api/admin/foo    → 401 JSON
 *   (e) owner → /admin and /api/admin/foo → pass through
 *
 * The /api/admin branch must be checked BEFORE the generic /api/* skip in
 * src/middleware.ts (otherwise the gate is bypassed entirely).
 */

const mockGetUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

const { mockFindUnique } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockFindUnique },
  },
}));

import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

function makeRequest(
  path: string,
  cookies: Record<string, string> = {},
) {
  const url = `http://localhost:3000${path}`;
  const request = new NextRequest(url);
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value);
  }
  return request;
}

const SESSION_COOKIES = {
  'sb-access-token': 'valid-access-token',
  'sb-refresh-token': 'valid-refresh-token',
};

describe('middleware — /admin and /api/admin gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: unauthenticated.
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'No session' },
    });
  });

  describe('/admin page routes', () => {
    test('(a) anon → /admin redirects to /auth/login', async () => {
      const response = await middleware(makeRequest('/admin'));

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/auth/login');
      expect(location.searchParams.get('next')).toBe('/admin');
    });

    test('(b) authed non-owner → /admin redirects to /workspaces', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-non-owner' } },
        error: null,
      });
      mockFindUnique.mockResolvedValue({ id: 'user-non-owner', isPlatformOwner: false });

      const response = await middleware(makeRequest('/admin', SESSION_COOKIES));

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/workspaces');
    });

    test('(b) authed non-owner → /admin/anything also redirects to /workspaces', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-non-owner' } },
        error: null,
      });
      mockFindUnique.mockResolvedValue({ id: 'user-non-owner', isPlatformOwner: false });

      const response = await middleware(makeRequest('/admin/users', SESSION_COOKIES));

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get('location')!).pathname).toBe('/workspaces');
    });

    test('(e) owner → /admin passes through', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'owner-1' } },
        error: null,
      });
      mockFindUnique.mockResolvedValue({ id: 'owner-1', isPlatformOwner: true });

      const response = await middleware(makeRequest('/admin', SESSION_COOKIES));

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('/api/admin route gating', () => {
    test('(d) anon → /api/admin/foo returns 401 JSON (not a redirect)', async () => {
      const response = await middleware(makeRequest('/api/admin/foo'));

      expect(response.status).toBe(401);
      expect(response.headers.get('location')).toBeNull();
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    test('(c) authed non-owner → /api/admin/foo returns 403 JSON', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-non-owner' } },
        error: null,
      });
      mockFindUnique.mockResolvedValue({ id: 'user-non-owner', isPlatformOwner: false });

      const response = await middleware(makeRequest('/api/admin/foo', SESSION_COOKIES));

      expect(response.status).toBe(403);
      expect(response.headers.get('location')).toBeNull();
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    test('(e) owner → /api/admin/foo passes through (200)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'owner-1' } },
        error: null,
      });
      mockFindUnique.mockResolvedValue({ id: 'owner-1', isPlatformOwner: true });

      const response = await middleware(makeRequest('/api/admin/foo', SESSION_COOKIES));

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

    test('non-admin /api routes still skip session refresh (no regression)', async () => {
      // The existing fast-path for /api/* must remain intact for non-admin routes.
      const response = await middleware(makeRequest('/api/workspaces'));

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
      // Critically: getUser should NOT have been called for non-admin /api routes.
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });
});
