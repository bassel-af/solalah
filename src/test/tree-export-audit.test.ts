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
const mockWorkspaceFindUnique = vi.fn();
const mockWorkspaceUpdate = vi.fn();
const mockAdminAccessLogCreate = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    workspaceMembership: {
      findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args),
    },
    workspace: {
      findUnique: (...args: unknown[]) => mockWorkspaceFindUnique(...args),
      update: (...args: unknown[]) => mockWorkspaceUpdate(...args),
    },
    adminAccessLog: {
      create: (...args: unknown[]) => mockAdminAccessLogCreate(...args),
    },
  },
}));

import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------

const wsId = 'ws-audit-1';
const routeParams = { params: Promise.resolve({ id: wsId }) };

const fakeAdmin = {
  id: 'user-admin-audit',
  email: 'admin@example.com',
  user_metadata: { display_name: 'Admin' },
};

function makeRequest(body: unknown) {
  return new NextRequest(`http://localhost:4000/api/workspaces/${wsId}`, {
    method: 'PATCH',
    headers: {
      authorization: 'Bearer valid-token',
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 test',
      'x-forwarded-for': '10.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

function mockAuthAdmin() {
  mockGetUser.mockResolvedValue({ data: { user: fakeAdmin }, error: null });
  mockMembershipFindUnique.mockResolvedValue({
    userId: fakeAdmin.id,
    workspaceId: wsId,
    role: 'workspace_admin',
    permissions: [],
  });
}

describe('PATCH /api/workspaces/[id] — audit log on tree export toggle flips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAdmin();
  });

  test('writes admin access log entry when enableTreeExport flips', async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      id: wsId,
      enableTreeExport: true,
      allowMemberExport: false,
    });
    mockWorkspaceUpdate.mockResolvedValue({
      id: wsId,
      enableTreeExport: false,
      allowMemberExport: false,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const res = await PATCH(makeRequest({ enableTreeExport: false }), routeParams);
    expect(res.status).toBe(200);

    expect(mockAdminAccessLogCreate).toHaveBeenCalled();
    const calls = mockAdminAccessLogCreate.mock.calls.map((c) => c[0].data);
    const entry = calls.find((d) => d.action === 'workspace_setting_change');
    expect(entry).toBeDefined();
    expect(entry.userId).toBe(fakeAdmin.id);
    expect(entry.workspaceId).toBe(wsId);
    expect(entry.entityType).toBe('workspace');
    expect(entry.reason).toContain('enableTreeExport');
    expect(entry.reason).toContain('false');
  });

  test('writes admin access log entry when allowMemberExport flips', async () => {
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
    const res = await PATCH(makeRequest({ allowMemberExport: true }), routeParams);
    expect(res.status).toBe(200);

    const calls = mockAdminAccessLogCreate.mock.calls.map((c) => c[0].data);
    const entry = calls.find(
      (d) => d.action === 'workspace_setting_change' && d.reason.includes('allowMemberExport'),
    );
    expect(entry).toBeDefined();
    expect(entry.reason).toContain('true');
  });

  test('does NOT write audit entry when the export toggle value is unchanged', async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      id: wsId,
      enableTreeExport: true,
      allowMemberExport: true,
    });
    mockWorkspaceUpdate.mockResolvedValue({
      id: wsId,
      enableTreeExport: true,
      allowMemberExport: true,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const res = await PATCH(makeRequest({ enableTreeExport: true }), routeParams);
    expect(res.status).toBe(200);
    const calls = mockAdminAccessLogCreate.mock.calls.map((c) => c[0].data);
    const entry = calls.find(
      (d) => d.action === 'workspace_setting_change' && d.reason.includes('enableTreeExport'),
    );
    expect(entry).toBeUndefined();
  });

  test('writes two entries when disabling parent also cascades child off', async () => {
    mockWorkspaceFindUnique.mockResolvedValue({
      id: wsId,
      enableTreeExport: true,
      allowMemberExport: true,
    });
    mockWorkspaceUpdate.mockResolvedValue({
      id: wsId,
      enableTreeExport: false,
      allowMemberExport: false,
    });
    const { PATCH } = await import('@/app/api/workspaces/[id]/route');
    const res = await PATCH(makeRequest({ enableTreeExport: false }), routeParams);
    expect(res.status).toBe(200);
    const calls = mockAdminAccessLogCreate.mock.calls.map((c) => c[0].data);
    const parentEntry = calls.find((d) => d.reason.includes('enableTreeExport'));
    const childEntry = calls.find((d) => d.reason.includes('allowMemberExport'));
    expect(parentEntry).toBeDefined();
    expect(childEntry).toBeDefined();
  });
});
