import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockUpsert } = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { upsert: mockUpsert },
  },
}));

import { syncUserToDb } from '@/lib/auth/sync-user';

describe('syncUserToDb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('upserts user with full metadata', async () => {
    const gotrueUser = {
      id: 'user-uuid-123',
      email: 'test@example.com',
      phone: '+1234567890',
      user_metadata: {
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    };

    const dbUser = {
      id: gotrueUser.id,
      email: gotrueUser.email,
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      phone: '+1234567890',
    };
    mockUpsert.mockResolvedValue(dbUser);

    const result = await syncUserToDb(gotrueUser);

    expect(result).toEqual(dbUser);
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { id: gotrueUser.id },
      update: {
        email: gotrueUser.email,
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        phone: '+1234567890',
      },
      create: {
        id: gotrueUser.id,
        email: gotrueUser.email,
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        phone: '+1234567890',
      },
    });
  });

  test('falls back to email prefix for displayName when metadata is absent', async () => {
    const gotrueUser = {
      id: 'user-uuid-456',
      email: 'john@example.com',
      phone: null,
      user_metadata: {},
    };

    mockUpsert.mockResolvedValue({ id: gotrueUser.id });

    await syncUserToDb(gotrueUser);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          displayName: 'john',
          avatarUrl: null,
          phone: null,
        }),
      }),
    );
  });

  test('handles undefined user_metadata gracefully', async () => {
    const gotrueUser = {
      id: 'user-uuid-789',
      email: 'sara@example.com',
      phone: null,
      user_metadata: undefined as Record<string, string> | undefined,
    };

    mockUpsert.mockResolvedValue({ id: gotrueUser.id });

    await syncUserToDb(gotrueUser);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          displayName: 'sara',
          avatarUrl: null,
        }),
      }),
    );
  });
});
