/**
 * Phase 2 — Live Presence
 *
 * Tests for the trackPresence integration inside `getAuthenticatedUser`.
 * Behaviors:
 *   - Successful auth → trackPresence called once with the right shape.
 *   - No Authorization header → no trackPresence call.
 *   - Token invalid → no trackPresence call.
 *   - Tracker errors do NOT propagate to the caller.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

const { mockTrackPresence } = vi.hoisted(() => ({
  mockTrackPresence: vi.fn(),
}));

vi.mock('@/lib/admin/presence-tracker', () => ({
  trackPresence: (...args: unknown[]) => mockTrackPresence(...args),
}));

import { getAuthenticatedUser } from '@/lib/api/auth';
import { NextRequest } from 'next/server';

function makeRequest(
  headers: Record<string, string> = {},
  pathname: string = '/api/workspaces/3c9d12bc-2a3a-4f8b-87f9-1e7e9a3a3c20/tree/individuals',
  method: string = 'POST',
): NextRequest {
  return new NextRequest(`http://localhost:4000${pathname}`, {
    method,
    headers,
  });
}

describe('getAuthenticatedUser — presence integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrackPresence.mockResolvedValue(undefined);
  });

  test('on successful auth, trackPresence is called once with correct shape', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'a@b.com' } },
      error: null,
    });

    const result = await getAuthenticatedUser(
      makeRequest({ authorization: 'Bearer good-token' }),
    );
    expect(result.user?.id).toBe('user-1');
    expect(mockTrackPresence).toHaveBeenCalledTimes(1);

    const args = mockTrackPresence.mock.calls[0][0];
    expect(args).toMatchObject({
      userId: 'user-1',
      pathname:
        '/api/workspaces/3c9d12bc-2a3a-4f8b-87f9-1e7e9a3a3c20/tree/individuals',
      method: 'POST',
    });
  });

  test('no Authorization header → trackPresence NOT called', async () => {
    await getAuthenticatedUser(makeRequest());
    expect(mockTrackPresence).not.toHaveBeenCalled();
  });

  test('invalid token → trackPresence NOT called', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid JWT' },
    });
    await getAuthenticatedUser(
      makeRequest({ authorization: 'Bearer bad-token' }),
    );
    expect(mockTrackPresence).not.toHaveBeenCalled();
  });

  test('a hanging trackPresence does NOT block the auth result', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockTrackPresence.mockImplementation(() => new Promise<void>(() => {}));

    const start = Date.now();
    const result = await Promise.race([
      getAuthenticatedUser(makeRequest({ authorization: 'Bearer good-token' })),
      new Promise<'timeout'>((resolve) =>
        setTimeout(() => resolve('timeout'), 500),
      ),
    ]);
    expect(result).not.toBe('timeout');
    expect(Date.now() - start).toBeLessThan(500);
  });

  test('a synchronously-throwing trackPresence does NOT propagate', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockTrackPresence.mockImplementation(() => {
      throw new Error('tracker exploded');
    });

    const result = await getAuthenticatedUser(
      makeRequest({ authorization: 'Bearer good-token' }),
    );
    expect(result.user?.id).toBe('user-1');
  });
});
