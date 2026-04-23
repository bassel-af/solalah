import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * T4 — syncUserToDb must NEVER write isPlatformOwner.
 *
 * The flag is set out-of-band (via scripts/promote-owner.ts). If syncUserToDb
 * resets or includes the field on every login, an attacker controlling
 * GoTrue user_metadata could conceivably influence it, and a re-sync after
 * promotion could clobber the flag back to false.
 *
 * This test asserts:
 *  - Neither `update` nor `create` payloads include `isPlatformOwner`.
 *  - When the DB row already has `isPlatformOwner: true`, calling syncUserToDb
 *    again leaves the flag intact (because the upsert.update doesn't touch it).
 *
 * Implementation note: the test simulates the upsert's behaviour — fields not
 * present in the `update` clause are NOT modified by Prisma.
 */

const { mockUpsert } = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { upsert: mockUpsert },
  },
}));

import { syncUserToDb } from '@/lib/auth/sync-user';

describe('syncUserToDb — isPlatformOwner preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('does NOT include isPlatformOwner in the upsert update payload', async () => {
    mockUpsert.mockResolvedValue({ id: 'u1' });

    await syncUserToDb({
      id: 'u1',
      email: 'owner@example.com',
      phone: null,
      user_metadata: { display_name: 'Owner' },
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const args = mockUpsert.mock.calls[0][0];
    expect(args.update).not.toHaveProperty('isPlatformOwner');
    expect(args.create).not.toHaveProperty('isPlatformOwner');
  });

  test('preserves an existing isPlatformOwner=true flag across re-sync', async () => {
    // Simulate Prisma's upsert: existing row has isPlatformOwner=true.
    // Update payload only sets fields explicitly listed; the simulated
    // resolved value reflects what Prisma would return — the original flag
    // unchanged because update does not touch it.
    mockUpsert.mockImplementation(async ({ update }) => ({
      id: 'owner-uuid',
      email: update.email,
      displayName: 'Promoted Owner',
      avatarUrl: null,
      phone: null,
      calendarPreference: 'hijri',
      // Existing flag — not in `update`, so it survives.
      isPlatformOwner: true,
      createdAt: new Date(),
    }));

    const result = await syncUserToDb({
      id: 'owner-uuid',
      email: 'owner@example.com',
      phone: null,
      user_metadata: { display_name: 'Promoted Owner' },
    });

    expect(result.isPlatformOwner).toBe(true);

    // Hard guarantee: update payload still must not mention the field.
    const args = mockUpsert.mock.calls[0][0];
    expect(args.update).not.toHaveProperty('isPlatformOwner');
  });
});
