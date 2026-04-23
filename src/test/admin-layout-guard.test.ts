import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * T6 — guard function used by /admin/layout.tsx.
 *
 * The layout itself is a Next server component that calls `redirect()` on
 * failure — awkward to test directly. We extract the decision logic into a
 * pure function `checkPlatformOwnerForLayout(supabase)` and unit-test it.
 *
 * The function returns `{ ok: true, user }` for owners, `{ ok: false,
 * redirectTo: string }` for everyone else. The layout interprets the result.
 */

const { mockFindUnique } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockFindUnique },
  },
}));

import { checkPlatformOwnerForLayout } from '@/lib/api/admin-auth';

function fakeSupabase(user: { id: string } | null) {
  return {
    auth: {
      getUser: async () => ({
        data: { user },
        error: user ? null : { message: 'No session' },
      }),
    },
    // Loose typing — this fake only needs auth.getUser. Cast at the call site.
  } as unknown as Parameters<typeof checkPlatformOwnerForLayout>[0];
}

describe('checkPlatformOwnerForLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns redirect to /auth/login when no user', async () => {
    const result = await checkPlatformOwnerForLayout(fakeSupabase(null));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.redirectTo).toBe('/auth/login');
    }
  });

  test('returns redirect to /workspaces when user is not platform owner', async () => {
    mockFindUnique.mockResolvedValue({ id: 'u1', isPlatformOwner: false });

    const result = await checkPlatformOwnerForLayout(fakeSupabase({ id: 'u1' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.redirectTo).toBe('/workspaces');
    }
  });

  test('returns redirect to /workspaces when user row missing', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await checkPlatformOwnerForLayout(fakeSupabase({ id: 'u-orphan' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.redirectTo).toBe('/workspaces');
    }
  });

  test('returns ok:true with user when isPlatformOwner=true', async () => {
    mockFindUnique.mockResolvedValue({ id: 'owner-1', isPlatformOwner: true });

    const result = await checkPlatformOwnerForLayout(fakeSupabase({ id: 'owner-1' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe('owner-1');
    }
  });
});
