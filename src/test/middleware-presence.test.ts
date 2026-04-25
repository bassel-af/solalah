/**
 * Phase 2 — Live Presence
 *
 * Middleware integration: trackPresence is invoked exactly when:
 *   - the user is authenticated, AND
 *   - the path is a tracked page route (not /admin/*).
 *
 * Tests use vi.mock on the tracker module so we can assert call args
 * without spinning up the LRU.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

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

const { mockTrackPresence } = vi.hoisted(() => ({
  mockTrackPresence: vi.fn(),
}));

vi.mock('@/lib/admin/presence-tracker', () => ({
  trackPresence: (...args: unknown[]) => mockTrackPresence(...args),
}));

import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

function makeRequest(path: string) {
  return new NextRequest(`http://localhost:4000${path}`);
}

describe('middleware — presence tracking integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrackPresence.mockResolvedValue(undefined);
  });

  test('authed user on a regular page route → trackPresence called', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    await middleware(makeRequest('/workspaces/foo/tree'));

    expect(mockTrackPresence).toHaveBeenCalledTimes(1);
    const args = mockTrackPresence.mock.calls[0][0];
    expect(args).toMatchObject({
      userId: 'user-1',
      pathname: '/workspaces/foo/tree',
    });
    expect(args.method).toBe('GET');
  });

  test('authed user on /admin → trackPresence is NOT called', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-owner' } },
      error: null,
    });
    mockFindUnique.mockResolvedValue({
      id: 'user-owner',
      isPlatformOwner: true,
    });

    await middleware(makeRequest('/admin'));

    expect(mockTrackPresence).not.toHaveBeenCalled();
  });

  test('authed user on /admin/access-log → trackPresence is NOT called', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-owner' } },
      error: null,
    });
    mockFindUnique.mockResolvedValue({
      id: 'user-owner',
      isPlatformOwner: true,
    });

    await middleware(makeRequest('/admin/access-log'));

    expect(mockTrackPresence).not.toHaveBeenCalled();
  });

  test('unauthenticated user → trackPresence is NOT called', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'no session' },
    });
    await middleware(makeRequest('/workspaces/foo/tree'));
    expect(mockTrackPresence).not.toHaveBeenCalled();
  });

  test('a hanging trackPresence does NOT block the response', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockTrackPresence.mockImplementation(() => new Promise<void>(() => {}));

    const start = Date.now();
    const responseOrTimeout = await Promise.race([
      middleware(makeRequest('/workspaces/foo/tree')),
      new Promise<'timeout'>((resolve) =>
        setTimeout(() => resolve('timeout'), 500),
      ),
    ]);
    expect(responseOrTimeout).not.toBe('timeout');
    expect(Date.now() - start).toBeLessThan(500);
  });

  test('a throwing trackPresence does NOT propagate', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockTrackPresence.mockImplementation(() => {
      throw new Error('tracker exploded');
    });

    await expect(
      middleware(makeRequest('/workspaces/foo/tree')),
    ).resolves.toBeDefined();
  });

  test('static assets bypass middleware → no tracking', async () => {
    await middleware(makeRequest('/_next/static/chunk.js'));
    expect(mockTrackPresence).not.toHaveBeenCalled();
  });

  test('public path /policy → no tracking', async () => {
    await middleware(makeRequest('/policy'));
    expect(mockTrackPresence).not.toHaveBeenCalled();
  });
});
