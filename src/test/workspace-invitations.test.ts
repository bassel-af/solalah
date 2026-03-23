import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

// Mock rate limiter to always allow requests (rate-limit logic tested separately)
vi.mock('@/lib/api/rate-limit', () => ({
  joinCodeLimiter: { check: () => ({ allowed: true, retryAfterSeconds: 0 }) },
  inviteCodeGenLimiter: { check: () => ({ allowed: true, retryAfterSeconds: 0 }) },
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}));

const mockMembershipFindUnique = vi.fn();
const mockMembershipCreate = vi.fn();
const mockInvitationCreate = vi.fn();
const mockInvitationFindFirst = vi.fn();
const mockInvitationUpdate = vi.fn();
const mockWorkspaceFindUnique = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    workspaceMembership: {
      findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args),
      create: (...args: unknown[]) => mockMembershipCreate(...args),
    },
    workspaceInvitation: {
      create: (...args: unknown[]) => mockInvitationCreate(...args),
      findFirst: (...args: unknown[]) => mockInvitationFindFirst(...args),
      update: (...args: unknown[]) => mockInvitationUpdate(...args),
    },
    workspace: {
      findUnique: (...args: unknown[]) => mockWorkspaceFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import { NextRequest } from 'next/server';

const fakeUser = {
  id: 'user-uuid-111',
  email: 'admin@example.com',
  user_metadata: { display_name: 'Admin' },
};

const joiningUser = {
  id: 'user-uuid-222',
  email: 'joiner@example.com',
  user_metadata: { display_name: 'Joiner' },
};

function mockAuth(user = fakeUser) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function mockNoAuth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid' } });
}

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}) {
  const { method = 'POST', body } = options;
  return new NextRequest(url, {
    method,
    headers: {
      authorization: 'Bearer valid-token',
      'content-type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const wsId = 'ws-uuid-123';
const codeParams = { params: Promise.resolve({ id: wsId }) };

// ============================================================================
// POST /api/workspaces/[id]/invitations/code — Generate join code
// ============================================================================
describe('POST /api/workspaces/[id]/invitations/code', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns 401 if not authenticated', async () => {
    mockNoAuth();
    const { POST } = await import('@/app/api/workspaces/[id]/invitations/code/route');
    const req = makeRequest(`http://localhost:3000/api/workspaces/${wsId}/invitations/code`);
    const res = await POST(req, codeParams);
    expect(res.status).toBe(401);
  });

  test('returns 403 if not admin', async () => {
    mockAuth();
    mockMembershipFindUnique.mockResolvedValue({
      userId: fakeUser.id,
      workspaceId: wsId,
      role: 'workspace_member',
    });
    const { POST } = await import('@/app/api/workspaces/[id]/invitations/code/route');
    const req = makeRequest(`http://localhost:3000/api/workspaces/${wsId}/invitations/code`);
    const res = await POST(req, codeParams);
    expect(res.status).toBe(403);
  });

  test('generates a join code with slug prefix and 8 random chars', async () => {
    mockAuth();
    mockMembershipFindUnique.mockResolvedValue({
      userId: fakeUser.id,
      workspaceId: wsId,
      role: 'workspace_admin',
    });
    mockWorkspaceFindUnique.mockResolvedValue({
      id: wsId,
      slug: 'saeed-family',
    });

    let capturedCode: string | undefined;
    mockInvitationCreate.mockImplementation((args: { data: { code: string } }) => {
      capturedCode = args.data.code;
      return {
        id: 'inv-uuid-1',
        workspaceId: wsId,
        type: 'code',
        code: args.data.code,
        invitedById: fakeUser.id,
      };
    });

    const { POST } = await import('@/app/api/workspaces/[id]/invitations/code/route');
    const req = makeRequest(`http://localhost:3000/api/workspaces/${wsId}/invitations/code`);
    const res = await POST(req, codeParams);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.code).toBeDefined();
    // Code format: SLUG_PREFIX-8_RANDOM_CHARS (e.g., SAEED-4X7KA3B2)
    expect(capturedCode).toMatch(/^SAEED-[A-Z0-9]{8}$/);
  });

  test('accepts optional expiresAt and maxUses', async () => {
    mockAuth();
    mockMembershipFindUnique.mockResolvedValue({
      userId: fakeUser.id,
      workspaceId: wsId,
      role: 'workspace_admin',
    });
    mockWorkspaceFindUnique.mockResolvedValue({
      id: wsId,
      slug: 'saeed-family',
    });
    mockInvitationCreate.mockImplementation((args: { data: { code: string; maxUses: number } }) => ({
      id: 'inv-uuid-2',
      workspaceId: wsId,
      type: 'code',
      code: args.data.code,
      maxUses: args.data.maxUses,
      invitedById: fakeUser.id,
    }));

    const { POST } = await import('@/app/api/workspaces/[id]/invitations/code/route');
    const req = makeRequest(`http://localhost:3000/api/workspaces/${wsId}/invitations/code`, {
      body: { maxUses: 10, expiresAt: '2026-12-31T00:00:00Z' },
    });
    const res = await POST(req, codeParams);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.maxUses).toBe(10);
  });
});

// ============================================================================
// POST /api/workspaces/join — Join via code
// ============================================================================
describe('POST /api/workspaces/join', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns 401 if not authenticated', async () => {
    mockNoAuth();
    const { POST } = await import('@/app/api/workspaces/join/route');
    const req = makeRequest('http://localhost:3000/api/workspaces/join', {
      body: { code: 'SAEED-4X7K' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('returns 404 if code does not exist', async () => {
    mockAuth(joiningUser);
    mockInvitationFindFirst.mockResolvedValue(null);

    const { POST } = await import('@/app/api/workspaces/join/route');
    const req = makeRequest('http://localhost:3000/api/workspaces/join', {
      body: { code: 'INVALID-CODE' },
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('invalid');
  });

  test('returns 404 if code is expired', async () => {
    mockAuth(joiningUser);
    mockInvitationFindFirst.mockResolvedValue(null); // query filters out expired

    const { POST } = await import('@/app/api/workspaces/join/route');
    const req = makeRequest('http://localhost:3000/api/workspaces/join', {
      body: { code: 'SAEED-4X7K' },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  test('returns 400 if already a member', async () => {
    mockAuth(joiningUser);
    mockInvitationFindFirst.mockResolvedValue({
      id: 'inv-uuid-1',
      workspaceId: wsId,
      type: 'code',
      code: 'SAEED-4X7K',
      status: 'pending',
      useCount: 0,
      maxUses: null,
      expiresAt: null,
    });
    mockMembershipFindUnique.mockResolvedValue({
      userId: joiningUser.id,
      workspaceId: wsId,
    });

    const { POST } = await import('@/app/api/workspaces/join/route');
    const req = makeRequest('http://localhost:3000/api/workspaces/join', {
      body: { code: 'SAEED-4X7K' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('already');
  });

  test('joins workspace successfully using a transaction', async () => {
    mockAuth(joiningUser);
    mockInvitationFindFirst.mockResolvedValue({
      id: 'inv-uuid-1',
      workspaceId: wsId,
      type: 'code',
      code: 'SAEED-4X7KA3B2',
      status: 'pending',
      useCount: 2,
      maxUses: 10,
      expiresAt: null,
    });
    mockMembershipFindUnique.mockResolvedValue(null); // not a member

    // The transaction callback receives a tx client and should return the membership
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const txClient = {
        workspaceInvitation: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'inv-uuid-1',
            workspaceId: wsId,
            useCount: 2,
            maxUses: 10,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        workspaceMembership: {
          create: vi.fn().mockResolvedValue({
            userId: joiningUser.id,
            workspaceId: wsId,
            role: 'workspace_member',
          }),
        },
      };
      return fn(txClient);
    });

    const { POST } = await import('@/app/api/workspaces/join/route');
    const req = makeRequest('http://localhost:3000/api/workspaces/join', {
      body: { code: 'SAEED-4X7KA3B2' },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.role).toBe('workspace_member');

    // Verify a transaction was used (not separate prisma calls)
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  test('returns 404 if code has reached max uses', async () => {
    mockAuth(joiningUser);
    // findFirst filters out codes where useCount >= maxUses, so returns null
    mockInvitationFindFirst.mockResolvedValue(null);

    const { POST } = await import('@/app/api/workspaces/join/route');
    const req = makeRequest('http://localhost:3000/api/workspaces/join', {
      body: { code: 'SAEED-FULL' },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  test('returns 404 when max uses exceeded inside transaction (race condition)', async () => {
    mockAuth(joiningUser);
    // Initial findFirst outside transaction finds the invitation (not yet at max)
    mockInvitationFindFirst.mockResolvedValue({
      id: 'inv-uuid-1',
      workspaceId: wsId,
      type: 'code',
      code: 'SAEED-RACE1234',
      status: 'pending',
      useCount: 4,
      maxUses: 5,
      expiresAt: null,
    });
    mockMembershipFindUnique.mockResolvedValue(null); // not a member

    // Inside the transaction, re-reading the invitation shows it's now at max
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const txClient = {
        workspaceInvitation: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'inv-uuid-1',
            workspaceId: wsId,
            useCount: 5, // Another request incremented it
            maxUses: 5,
          }),
          update: vi.fn(),
        },
        workspaceMembership: {
          create: vi.fn(),
        },
      };
      return fn(txClient);
    });

    const { POST } = await import('@/app/api/workspaces/join/route');
    const req = makeRequest('http://localhost:3000/api/workspaces/join', {
      body: { code: 'SAEED-RACE1234' },
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('invalid');
  });
});
