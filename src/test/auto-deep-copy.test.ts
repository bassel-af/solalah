import { describe, test, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

const mockMembershipFindUnique = vi.fn();
const mockBranchPointerFindUnique = vi.fn();
const mockBranchPointerUpdate = vi.fn();
const mockNotificationCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    workspaceMembership: {
      findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args),
    },
    branchPointer: {
      findUnique: (...args: unknown[]) => mockBranchPointerFindUnique(...args),
      update: (...args: unknown[]) => mockBranchPointerUpdate(...args),
    },
    notification: {
      create: (...args: unknown[]) => mockNotificationCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// Mock deep copy module
const mockPrepareDeepCopy = vi.fn();
vi.mock('@/lib/tree/branch-pointer-deep-copy', () => ({
  prepareDeepCopy: (...args: unknown[]) => mockPrepareDeepCopy(...args),
}));

// Mock tree queries
const mockGetTreeByWorkspaceId = vi.fn();
vi.mock('@/lib/tree/queries', () => ({
  getTreeByWorkspaceId: (...args: unknown[]) => mockGetTreeByWorkspaceId(...args),
}));

// Mock branch pointer queries
vi.mock('@/lib/tree/branch-pointer-queries', () => ({
  getActivePointersForWorkspace: vi.fn().mockResolvedValue([]),
}));

import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const wsId = 'ws-target-uuid';
const fakeUser = {
  id: 'user-uuid-admin',
  email: 'admin@example.com',
  user_metadata: { display_name: 'Admin' },
};

function makeDeleteRequest(url: string) {
  return new NextRequest(url, {
    method: 'DELETE',
    headers: { authorization: 'Bearer valid-token' },
  });
}

function mockAuth() {
  mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
}

function mockAdmin() {
  mockMembershipFindUnique.mockResolvedValue({
    userId: fakeUser.id,
    workspaceId: wsId,
    role: 'workspace_admin',
    permissions: [],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DELETE /api/workspaces/[id]/branch-pointers/[pointerId] — break pointer', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns 401 for unauthenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid' },
    });

    const { DELETE } = await import(
      '@/app/api/workspaces/[id]/branch-pointers/[pointerId]/route'
    );
    const req = makeDeleteRequest(
      `http://localhost:3000/api/workspaces/${wsId}/branch-pointers/bp-1`,
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: wsId, pointerId: 'bp-1' }),
    });
    expect(res.status).toBe(401);
  });

  test('returns 403 for non-admin member', async () => {
    mockAuth();
    mockMembershipFindUnique.mockResolvedValue({
      userId: fakeUser.id,
      workspaceId: wsId,
      role: 'workspace_member',
      permissions: [],
    });

    const { DELETE } = await import(
      '@/app/api/workspaces/[id]/branch-pointers/[pointerId]/route'
    );
    const req = makeDeleteRequest(
      `http://localhost:3000/api/workspaces/${wsId}/branch-pointers/bp-1`,
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: wsId, pointerId: 'bp-1' }),
    });
    expect(res.status).toBe(403);
  });

  test('returns 404 for nonexistent pointer', async () => {
    mockAuth();
    mockAdmin();
    mockBranchPointerFindUnique.mockResolvedValue(null);

    const { DELETE } = await import(
      '@/app/api/workspaces/[id]/branch-pointers/[pointerId]/route'
    );
    const req = makeDeleteRequest(
      `http://localhost:3000/api/workspaces/${wsId}/branch-pointers/bp-nonexistent`,
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: wsId, pointerId: 'bp-nonexistent' }),
    });
    expect(res.status).toBe(404);
  });

  test('returns 200 and marks pointer as broken on successful break', async () => {
    mockAuth();
    mockAdmin();
    mockBranchPointerFindUnique.mockResolvedValue({
      id: 'bp-1',
      sourceWorkspaceId: 'ws-source-uuid',
      rootIndividualId: 'src-root',
      depthLimit: null,
      includeGrafts: false,
      targetWorkspaceId: wsId,
      anchorIndividualId: 'anchor-id',
      relationship: 'spouse',
      status: 'active',
    });

    // Mock source tree for deep copy
    mockGetTreeByWorkspaceId.mockResolvedValue({
      id: 'tree-source',
      workspaceId: 'ws-source-uuid',
      individuals: [],
      families: [],
    });

    // Mock deep copy result
    mockPrepareDeepCopy.mockReturnValue({
      individuals: {},
      families: {},
      idMap: new Map(),
      stitchFamily: null,
    });

    // Mock transaction — just call the callback
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        individual: { createMany: vi.fn() },
        family: { createMany: vi.fn() },
        branchPointer: {
          update: (...args: unknown[]) => mockBranchPointerUpdate(...args),
        },
        notification: {
          create: (...args: unknown[]) => mockNotificationCreate(...args),
        },
      });
    });

    const { DELETE } = await import(
      '@/app/api/workspaces/[id]/branch-pointers/[pointerId]/route'
    );
    const req = makeDeleteRequest(
      `http://localhost:3000/api/workspaces/${wsId}/branch-pointers/bp-1`,
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: wsId, pointerId: 'bp-1' }),
    });
    expect(res.status).toBe(200);

    // Should have updated the pointer status to 'broken'
    expect(mockBranchPointerUpdate).toHaveBeenCalled();
  });
});
