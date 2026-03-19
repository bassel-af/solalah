import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { FamilyConfig } from '@/config/families';

const { mockWorkspaceUpsert, mockMembershipUpsert } = vi.hoisted(() => ({
  mockWorkspaceUpsert: vi.fn(),
  mockMembershipUpsert: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    workspace: { upsert: mockWorkspaceUpsert },
    workspaceMembership: { upsert: mockMembershipUpsert },
  },
}));

import { seedWorkspacesFromFamilies } from '@/lib/seed/seed-workspaces';

describe('seedWorkspacesFromFamilies', () => {
  const adminUserId = 'admin-uuid-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('creates a workspace for each family config', async () => {
    const families: Record<string, FamilyConfig> = {
      saeed: {
        slug: 'saeed',
        rootId: '@123@',
        displayName: 'آل سعيّد',
        gedcomFile: '/saeed.ged',
      },
      'al-dabbagh': {
        slug: 'al-dabbagh',
        rootId: '@456@',
        displayName: 'آل الدباغ',
        gedcomFile: '/saeed.ged',
      },
    };

    mockWorkspaceUpsert.mockResolvedValue({ id: 'ws-uuid-1', slug: 'saeed' });
    mockMembershipUpsert.mockResolvedValue({});

    await seedWorkspacesFromFamilies(families, adminUserId);

    expect(mockWorkspaceUpsert).toHaveBeenCalledTimes(2);
    expect(mockWorkspaceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'saeed' },
        update: { nameAr: 'آل سعيّد' },
        create: expect.objectContaining({
          slug: 'saeed',
          nameAr: 'آل سعيّد',
          createdById: adminUserId,
        }),
      }),
    );
  });

  test('creates workspace_admin membership for the admin user', async () => {
    const families: Record<string, FamilyConfig> = {
      saeed: {
        slug: 'saeed',
        rootId: '@123@',
        displayName: 'آل سعيّد',
        gedcomFile: '/saeed.ged',
      },
    };

    const workspaceResult = { id: 'ws-uuid-1', slug: 'saeed' };
    mockWorkspaceUpsert.mockResolvedValue(workspaceResult);
    mockMembershipUpsert.mockResolvedValue({});

    await seedWorkspacesFromFamilies(families, adminUserId);

    expect(mockMembershipUpsert).toHaveBeenCalledTimes(1);
    expect(mockMembershipUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_workspaceId: {
            userId: adminUserId,
            workspaceId: 'ws-uuid-1',
          },
        },
        update: {},
        create: expect.objectContaining({
          userId: adminUserId,
          workspaceId: 'ws-uuid-1',
          role: 'workspace_admin',
        }),
      }),
    );
  });

  test('excludes the test family config', async () => {
    const families: Record<string, FamilyConfig> = {
      test: {
        slug: 'test',
        rootId: '@I1@',
        displayName: 'عائلة اختبار',
        gedcomFile: '/test-family.ged',
      },
      saeed: {
        slug: 'saeed',
        rootId: '@123@',
        displayName: 'آل سعيّد',
        gedcomFile: '/saeed.ged',
      },
    };

    mockWorkspaceUpsert.mockResolvedValue({ id: 'ws-uuid-1', slug: 'saeed' });
    mockMembershipUpsert.mockResolvedValue({});

    await seedWorkspacesFromFamilies(families, adminUserId);

    expect(mockWorkspaceUpsert).toHaveBeenCalledTimes(1);
    expect(mockWorkspaceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'saeed' },
      }),
    );
  });

  test('throws if adminUserId is not provided', async () => {
    const families: Record<string, FamilyConfig> = {};

    await expect(seedWorkspacesFromFamilies(families, '')).rejects.toThrow(
      'Admin user ID is required',
    );
  });
});
