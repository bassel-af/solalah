import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * T3 — Profile schema strictness + PATCH /api/users/me regression.
 *
 * Two layers:
 *  1. `updateProfileSchema` rejects unknown keys (Zod `.strict()`), so an
 *     attacker can't smuggle `isPlatformOwner` past validation.
 *  2. Even if validation somehow let it through, the PATCH route handler
 *     only writes `displayName` — the spy on `prisma.user.update` confirms
 *     the data argument contains nothing but the whitelisted fields and
 *     never touches `isPlatformOwner`.
 */

// ---- Layer 1: schema-level rejection ----
import { updateProfileSchema } from '@/lib/profile/validation';

describe('updateProfileSchema', () => {
  test('accepts a valid displayName', () => {
    const parsed = updateProfileSchema.parse({ displayName: 'Sara' });
    expect(parsed.displayName).toBe('Sara');
  });

  test('rejects unknown keys including isPlatformOwner', () => {
    const result = updateProfileSchema.safeParse({
      displayName: 'Attacker',
      isPlatformOwner: true,
    });
    expect(result.success).toBe(false);
  });

  test('rejects unknown keys even when displayName is absent', () => {
    const result = updateProfileSchema.safeParse({ isPlatformOwner: true });
    expect(result.success).toBe(false);
  });
});

// ---- Layer 2: PATCH /api/users/me ignores isPlatformOwner in body ----

const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

const { mockUpdate } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { update: mockUpdate },
  },
}));

// rate-limit module — stub to always allow so the test path is deterministic
vi.mock('@/lib/api/rate-limit', () => ({
  profileUpdateLimiter: {
    check: () => ({ allowed: true, retryAfterSeconds: 0 }),
  },
  rateLimitResponse: () => new Response(null, { status: 429 }),
}));

import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/users/me/route';

function makePatchRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/users/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/users/me — isPlatformOwner write-path defense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-non-owner', email: 'normal@example.com' } },
      error: null,
    });
    mockUpdate.mockResolvedValue({
      id: 'user-non-owner',
      email: 'normal@example.com',
      displayName: 'Normal',
      avatarUrl: null,
      calendarPreference: 'hijri',
    });
  });

  test('ignores isPlatformOwner in request body — never passes it to prisma.user.update', async () => {
    const request = makePatchRequest(
      { displayName: 'Normal', isPlatformOwner: true },
      { authorization: 'Bearer good-token' },
    );

    const response = await PATCH(request);

    // With .strict(), the handler should reject the payload outright (4xx).
    // Either way (rejected or partially passed through), update() must NOT
    // see isPlatformOwner in its data argument.
    if (response.status === 200) {
      // Validation accepted — but the data passed to update() must be clean.
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const dataArg = mockUpdate.mock.calls[0][0].data;
      expect(dataArg).not.toHaveProperty('isPlatformOwner');
    } else {
      // Validation rejected — update() must NOT have been called at all.
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    }
  });

  test('does not flip the flag for a non-owner user when body contains isPlatformOwner: true', async () => {
    const request = makePatchRequest(
      { displayName: 'Still Normal', isPlatformOwner: true },
      { authorization: 'Bearer good-token' },
    );

    await PATCH(request);

    // If update() was called at all, ensure isPlatformOwner is absent.
    if (mockUpdate.mock.calls.length > 0) {
      const dataArg = mockUpdate.mock.calls[0][0].data;
      expect(dataArg).not.toHaveProperty('isPlatformOwner');
    }
  });
});
