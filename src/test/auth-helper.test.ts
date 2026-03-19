import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

import { getAuthenticatedUser } from '@/lib/api/auth';
import { NextRequest } from 'next/server';

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/test', {
    method: 'GET',
    headers,
  });
}

describe('getAuthenticatedUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns error when no Authorization header is present', async () => {
    const request = makeRequest();
    const result = await getAuthenticatedUser(request);

    expect(result.user).toBeNull();
    expect(result.error).toBe('Missing authorization');
  });

  test('returns error when Authorization header is not Bearer', async () => {
    const request = makeRequest({ authorization: 'Basic abc123' });
    const result = await getAuthenticatedUser(request);

    expect(result.user).toBeNull();
    expect(result.error).toBe('Missing authorization');
  });

  test('returns error when token is invalid', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid JWT' },
    });

    const request = makeRequest({ authorization: 'Bearer bad-token' });
    const result = await getAuthenticatedUser(request);

    expect(result.user).toBeNull();
    expect(result.error).toBe('Invalid JWT');
  });

  test('returns user when token is valid', async () => {
    const fakeUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    mockGetUser.mockResolvedValue({
      data: { user: fakeUser },
      error: null,
    });

    const request = makeRequest({ authorization: 'Bearer valid-token' });
    const result = await getAuthenticatedUser(request);

    expect(result.user).toEqual(fakeUser);
    expect(result.error).toBeNull();
  });

  test('returns error when getUser returns no user and no error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = makeRequest({ authorization: 'Bearer some-token' });
    const result = await getAuthenticatedUser(request);

    expect(result.user).toBeNull();
    expect(result.error).toBe('User not found');
  });
});
