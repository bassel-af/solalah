import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * T8 — promoteOwnerByEmail (extracted from scripts/promote-owner.ts).
 *
 * The script wraps this function with a TTY confirmation prompt — that
 * part is not unit-tested. The function itself is the actual data mutation
 * and worth testing:
 *   - rejects empty/invalid email,
 *   - returns "not found" when no user matches,
 *   - sets isPlatformOwner=true via prisma.user.update on a found user.
 */

const { mockFindUnique, mockUpdate } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockFindUnique, update: mockUpdate },
  },
}));

import { promoteOwnerByEmail } from '../../scripts/promote-owner-lib';

describe('promoteOwnerByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('throws on empty email', async () => {
    await expect(promoteOwnerByEmail('')).rejects.toThrow();
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('throws on whitespace-only email', async () => {
    await expect(promoteOwnerByEmail('   ')).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('throws when no user matches the email', async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(promoteOwnerByEmail('missing@example.com')).rejects.toThrow(/not found/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('updates the matching user to isPlatformOwner=true and returns the row', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-uuid-1', email: 'owner@example.com' });
    mockUpdate.mockResolvedValue({
      id: 'user-uuid-1',
      email: 'owner@example.com',
      isPlatformOwner: true,
    });

    const result = await promoteOwnerByEmail('owner@example.com');

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: 'owner@example.com' },
      select: { id: true, email: true, isPlatformOwner: true },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-uuid-1' },
      data: { isPlatformOwner: true },
      select: { id: true, email: true, isPlatformOwner: true },
    });
    expect(result.isPlatformOwner).toBe(true);
  });

  test('trims whitespace around the email before lookup', async () => {
    mockFindUnique.mockResolvedValue({ id: 'u', email: 'owner@example.com', isPlatformOwner: false });
    mockUpdate.mockResolvedValue({ id: 'u', email: 'owner@example.com', isPlatformOwner: true });

    await promoteOwnerByEmail('   owner@example.com  ');

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: 'owner@example.com' },
      select: { id: true, email: true, isPlatformOwner: true },
    });
  });
});
