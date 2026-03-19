import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock @supabase/supabase-js
const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

function makeRequest(
  path: string,
  cookies: Record<string, string> = {},
) {
  const url = `http://localhost:3000${path}`;
  const request = new NextRequest(url);
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value);
  }
  return request;
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('public paths', () => {
    test.each([
      '/',
      '/auth/login',
      '/auth/signup',
      '/auth/callback',
      '/auth/confirm',
      '/policy',
      '/test',
    ])('allows %s without auth', async (path) => {
      const request = makeRequest(path);
      const response = await middleware(request);

      // NextResponse.next() does not redirect
      expect(response.headers.get('location')).toBeNull();
      expect(response.status).toBe(200);
    });

    test('allows subpaths of public paths (e.g. /auth/login/extra)', async () => {
      const request = makeRequest('/auth/login/extra');
      const response = await middleware(request);

      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('static assets', () => {
    test('allows _next/* paths without auth', async () => {
      const request = makeRequest('/_next/static/chunk.js');
      const response = await middleware(request);

      expect(response.headers.get('location')).toBeNull();
    });

    test('allows paths with file extensions (e.g. /favicon.ico)', async () => {
      const request = makeRequest('/favicon.ico');
      const response = await middleware(request);

      expect(response.headers.get('location')).toBeNull();
    });

    test('allows API routes without auth', async () => {
      const request = makeRequest('/api/auth/sync-user');
      const response = await middleware(request);

      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('protected routes', () => {
    test('redirects to /auth/login when no session cookies exist', async () => {
      const request = makeRequest('/dashboard');
      const response = await middleware(request);

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/auth/login');
      expect(location.searchParams.get('next')).toBe('/dashboard');
    });

    test('redirects to /auth/login with next param preserving the original path', async () => {
      const request = makeRequest('/workspace/123/settings');
      const response = await middleware(request);

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/auth/login');
      expect(location.searchParams.get('next')).toBe('/workspace/123/settings');
    });

    test('passes through when valid session cookies exist and getUser succeeds', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const request = makeRequest('/dashboard', {
        'sb-access-token': 'valid-access-token',
        'sb-refresh-token': 'valid-refresh-token',
      });
      const response = await middleware(request);

      expect(response.headers.get('location')).toBeNull();
      expect(response.status).toBe(200);
    });

    test('redirects to /auth/login when access token is invalid (getUser returns error)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const request = makeRequest('/dashboard', {
        'sb-access-token': 'expired-token',
        'sb-refresh-token': 'some-refresh-token',
      });
      const response = await middleware(request);

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/auth/login');
    });
  });
});
