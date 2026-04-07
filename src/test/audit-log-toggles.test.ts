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

const wsId = 'ws-toggle-test-1';

const routeParams = { params: Promise.resolve({ id: wsId }) };

const fakeAdminUser = {
  id: 'user-admin-toggle-1',
  email: 'admin@example.com',
  user_metadata: { display_name: 'Admin' },
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

function mockAuth() {
  mockGetUser.mockResolvedValue({ data: { user: fakeAdminUser }, error: null });
}

function mockAdmin() {
  mockMembershipFindUnique.mockResolvedValue({
    userId: fakeAdminUser.id,
    workspaceId: wsId,
    role: 'workspace_admin',
    permissions: [],
  });
}

// ============================================================================
// PATCH /api/workspaces/[id] — enableAuditLog / enableVersionControl toggles
// ============================================================================

describe('PATCH /api/workspaces/[id] — Audit log toggle dependency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    mockAdmin();
  });

  test('allows enabling enableAuditLog alone', async () => {
    mockWorkspaceUpdate.mockResolvedValue({
      id: wsId,
      enableAuditLog: true,
      enableVersionControl: false,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const req = makeRequest({ enableAuditLog: true });
    const res = await PATCH(req, routeParams);
    expect(res.status).toBe(200);
  });

  test('rejects enabling enableVersionControl when enableAuditLog is false', async () => {
    // Workspace currently has enableAuditLog: false
    mockWorkspaceFindUnique.mockResolvedValue({
      id: wsId,
      enableAuditLog: false,
      enableVersionControl: false,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const req = makeRequest({ enableVersionControl: true });
    const res = await PATCH(req, routeParams);
    expect(res.status).toBe(400);
  });

  test('allows enabling enableVersionControl when enableAuditLog is already true', async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      id: wsId,
      enableAuditLog: true,
      enableVersionControl: false,
    });
    mockWorkspaceUpdate.mockResolvedValue({
      id: wsId,
      enableAuditLog: true,
      enableVersionControl: true,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const req = makeRequest({ enableVersionControl: true });
    const res = await PATCH(req, routeParams);
    expect(res.status).toBe(200);
  });

  test('allows enabling both enableAuditLog and enableVersionControl together', async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      id: wsId,
      enableAuditLog: false,
      enableVersionControl: false,
    });
    mockWorkspaceUpdate.mockResolvedValue({
      id: wsId,
      enableAuditLog: true,
      enableVersionControl: true,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const req = makeRequest({ enableAuditLog: true, enableVersionControl: true });
    const res = await PATCH(req, routeParams);
    expect(res.status).toBe(200);
  });

  test('disabling enableAuditLog auto-disables enableVersionControl', async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      id: wsId,
      enableAuditLog: true,
      enableVersionControl: true,
    });
    mockWorkspaceUpdate.mockResolvedValue({
      id: wsId,
      enableAuditLog: false,
      enableVersionControl: false,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const req = makeRequest({ enableAuditLog: false });
    const res = await PATCH(req, routeParams);
    expect(res.status).toBe(200);

    // Verify the update call included enableVersionControl: false
    expect(mockWorkspaceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enableAuditLog: false,
          enableVersionControl: false,
        }),
      }),
    );
  });
});
