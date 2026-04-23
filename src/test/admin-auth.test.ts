import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * T2 — requirePlatformOwner helper.
 *
 * Cases:
 *  (a) no auth                                  → returns NextResponse 401
 *  (b) authenticated but isPlatformOwner=false  → returns NextResponse 403
 *  (c) authenticated and isPlatformOwner=true   → returns { user }
 *
 * Mirrors the shape of `requireWorkspaceAdmin` in
 * `src/lib/api/workspace-auth.ts`: success returns `{ user, ... }`, failure
 * returns a `NextResponse` (caller checks via `instanceof NextResponse`).
 */

const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
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

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/api/admin-auth';

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/admin/test', {
    method: 'GET',
    headers,
  });
}

describe('requirePlatformOwner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('(a) returns 401 NextResponse when no Authorization header', async () => {
    const result = await requirePlatformOwner(makeRequest());

    expect(result).toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) {
      expect(result.status).toBe(401);
      const body = await result.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('(a) returns 401 NextResponse when token is invalid', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid JWT' },
    });

    const result = await requirePlatformOwner(
      makeRequest({ authorization: 'Bearer bad-token' }),
    );

    expect(result).toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) {
      expect(result.status).toBe(401);
    }
  });

  test('(b) returns 403 NextResponse when authed but isPlatformOwner=false', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'normal@example.com' } },
      error: null,
    });
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      isPlatformOwner: false,
    });

    const result = await requirePlatformOwner(
      makeRequest({ authorization: 'Bearer good-token' }),
    );

    expect(result).toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) {
      expect(result.status).toBe(403);
      const body = await result.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('(b) returns 403 when DB row is missing (treat as not-owner)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-orphan' } },
      error: null,
    });
    mockFindUnique.mockResolvedValue(null);

    const result = await requirePlatformOwner(
      makeRequest({ authorization: 'Bearer good-token' }),
    );

    expect(result).toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) {
      expect(result.status).toBe(403);
    }
  });

  test('(c) returns { user } when authed and isPlatformOwner=true', async () => {
    const fakeUser = { id: 'owner-1', email: 'owner@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockFindUnique.mockResolvedValue({
      id: 'owner-1',
      isPlatformOwner: true,
    });

    const result = await requirePlatformOwner(
      makeRequest({ authorization: 'Bearer owner-token' }),
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    if (!(result instanceof NextResponse)) {
      expect(result.user).toEqual(fakeUser);
    }
  });
});
