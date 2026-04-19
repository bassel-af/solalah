import { describe, test, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that use them
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
const mockWorkspaceFindUnique = vi.fn();
const mockWorkspaceUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    workspaceMembership: {
      findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args),
    },
    workspace: {
      findUnique: (...args: unknown[]) => mockWorkspaceFindUnique(...args),
      update: (...args: unknown[]) => mockWorkspaceUpdate(...args),
    },
  },
}));

import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const wsId = 'ws-tree-export-toggle-1';

const routeParams = { params: Promise.resolve({ id: wsId }) };

const fakeAdminUser = {
  id: 'user-admin-tree-export-1',
  email: 'admin@example.com',
  user_metadata: { display_name: 'Admin' },
};

const fakeMemberUser = {
  id: 'user-member-tree-export-1',
  email: 'member@example.com',
  user_metadata: { display_name: 'Member' },
};

function makeRequest(body: unknown) {
  return new NextRequest(`http://localhost:4000/api/workspaces/${wsId}`, {
    method: 'PATCH',
    headers: {
      authorization: 'Bearer valid-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function mockAuthAdmin() {
  mockGetUser.mockResolvedValue({ data: { user: fakeAdminUser }, error: null });
  mockMembershipFindUnique.mockResolvedValue({
    userId: fakeAdminUser.id,
    workspaceId: wsId,
    role: 'workspace_admin',
    permissions: [],
  });
}

function mockAuthMember() {
  mockGetUser.mockResolvedValue({ data: { user: fakeMemberUser }, error: null });
  mockMembershipFindUnique.mockResolvedValue({
    userId: fakeMemberUser.id,
    workspaceId: wsId,
    role: 'workspace_member',
    permissions: [],
  });
}

// ============================================================================
// PATCH /api/workspaces/[id] — enableTreeExport / allowMemberExport toggles
// ============================================================================

describe('PATCH /api/workspaces/[id] — Tree export toggle dependency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('admin can enable enableTreeExport alone', async () => {
    mockAuthAdmin();
    mockWorkspaceUpdate.mockResolvedValue({
      id: wsId,
      enableTreeExport: true,
      allowMemberExport: false,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const req = makeRequest({ enableTreeExport: true });
    const res = await PATCH(req, routeParams);
    expect(res.status).toBe(200);
  });

  test('admin can set allowMemberExport when enableTreeExport already true', async () => {
    mockAuthAdmin();
    mockWorkspaceFindUnique.mockResolvedValue({
      id: wsId,
      enableTreeExport: true,
      allowMemberExport: false,
    });
    mockWorkspaceUpdate.mockResolvedValue({
      id: wsId,
      enableTreeExport: true,
      allowMemberExport: true,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const req = makeRequest({ allowMemberExport: true });
    const res = await PATCH(req, routeParams);
    expect(res.status).toBe(200);
  });

  test('rejects enabling allowMemberExport when enableTreeExport is false', async () => {
    mockAuthAdmin();
    mockWorkspaceFindUnique.mockResolvedValue({
      id: wsId,
      enableTreeExport: false,
      allowMemberExport: false,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const req = makeRequest({ allowMemberExport: true });
    const res = await PATCH(req, routeParams);
    expect(res.status).toBe(400);
  });

  test('allows enabling both enableTreeExport and allowMemberExport together', async () => {
    mockAuthAdmin();
    mockWorkspaceFindUnique.mockResolvedValue({
      id: wsId,
      enableTreeExport: false,
      allowMemberExport: false,
    });
    mockWorkspaceUpdate.mockResolvedValue({
      id: wsId,
      enableTreeExport: true,
      allowMemberExport: true,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const req = makeRequest({ enableTreeExport: true, allowMemberExport: true });
    const res = await PATCH(req, routeParams);
    expect(res.status).toBe(200);
  });

  test('disabling enableTreeExport auto-disables allowMemberExport', async () => {
    mockAuthAdmin();
    mockWorkspaceUpdate.mockResolvedValue({
      id: wsId,
      enableTreeExport: false,
      allowMemberExport: false,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const req = makeRequest({ enableTreeExport: false });
    const res = await PATCH(req, routeParams);
    expect(res.status).toBe(200);

    expect(mockWorkspaceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enableTreeExport: false,
          allowMemberExport: false,
        }),
      }),
    );
  });

  test('rejects non-admin trying to toggle enableTreeExport (returns 403)', async () => {
    mockAuthMember();
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const req = makeRequest({ enableTreeExport: false });
    const res = await PATCH(req, routeParams);
    expect(res.status).toBe(403);
    expect(mockWorkspaceUpdate).not.toHaveBeenCalled();
  });

  test('rejects non-admin trying to toggle allowMemberExport (returns 403)', async () => {
    mockAuthMember();
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const req = makeRequest({ allowMemberExport: true });
    const res = await PATCH(req, routeParams);
    expect(res.status).toBe(403);
    expect(mockWorkspaceUpdate).not.toHaveBeenCalled();
  });
});
