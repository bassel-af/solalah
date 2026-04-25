/**
 * Phase 2 — Live Presence
 *
 * Unit tests for `normalizeRoutePattern(pathname)`. The normalizer is the
 * gate that keeps user-supplied path components (UUIDs, slugs, control
 * chars, traversal segments) out of the `User.lastActiveRoute` column. It
 * MUST return one of:
 *   - a known canonical pattern (e.g. `/workspaces/[slug]/tree`), OR
 *   - `null` (skip the write).
 *
 * The hard rule: a UUID, control char, traversal sequence, or unknown
 * shape must NEVER survive into the DB. If in doubt, return null.
 */

import { describe, test, expect } from 'vitest';
import { normalizeRoutePattern } from '@/lib/admin/presence';

describe('normalizeRoutePattern — known page routes', () => {
  test('plain /workspaces → /workspaces', () => {
    expect(normalizeRoutePattern('/workspaces')).toBe('/workspaces');
  });

  test('/workspaces/<slug> → /workspaces/[slug]', () => {
    expect(normalizeRoutePattern('/workspaces/saeed')).toBe(
      '/workspaces/[slug]',
    );
  });

  test('/workspaces/<slug>/tree → /workspaces/[slug]/tree', () => {
    expect(normalizeRoutePattern('/workspaces/saeed/tree')).toBe(
      '/workspaces/[slug]/tree',
    );
  });

  test('/workspaces/<slug>/tree/audit → /workspaces/[slug]/tree/audit', () => {
    expect(normalizeRoutePattern('/workspaces/saeed/tree/audit')).toBe(
      '/workspaces/[slug]/tree/audit',
    );
  });

  test('/profile → /profile', () => {
    expect(normalizeRoutePattern('/profile')).toBe('/profile');
  });
});

describe('normalizeRoutePattern — known API routes (editing)', () => {
  test('/api/workspaces/<uuid>/tree/individuals → templated', () => {
    expect(
      normalizeRoutePattern(
        '/api/workspaces/3c9d12bc-2a3a-4f8b-87f9-1e7e9a3a3c20/tree/individuals',
      ),
    ).toBe('/api/workspaces/[id]/tree/individuals');
  });

  test('/api/workspaces/<uuid>/tree/families → templated', () => {
    expect(
      normalizeRoutePattern(
        '/api/workspaces/3c9d12bc-2a3a-4f8b-87f9-1e7e9a3a3c20/tree/families',
      ),
    ).toBe('/api/workspaces/[id]/tree/families');
  });

  test('/api/workspaces/<uuid>/tree/families/<uuid>/children → templated', () => {
    expect(
      normalizeRoutePattern(
        '/api/workspaces/3c9d12bc-2a3a-4f8b-87f9-1e7e9a3a3c20/tree/families/aabbccdd-eeff-4011-9022-031415926535/children',
      ),
    ).toBe('/api/workspaces/[id]/tree/families/[id]/children');
  });

  test('/api/workspaces/<uuid>/tree/rada-families → templated', () => {
    expect(
      normalizeRoutePattern(
        '/api/workspaces/3c9d12bc-2a3a-4f8b-87f9-1e7e9a3a3c20/tree/rada-families',
      ),
    ).toBe('/api/workspaces/[id]/tree/rada-families');
  });

  test('/api/workspaces/<uuid>/tree/individuals/<uuid> → templated', () => {
    expect(
      normalizeRoutePattern(
        '/api/workspaces/3c9d12bc-2a3a-4f8b-87f9-1e7e9a3a3c20/tree/individuals/aabbccdd-eeff-4011-9022-031415926535',
      ),
    ).toBe('/api/workspaces/[id]/tree/individuals/[id]');
  });
});

describe('normalizeRoutePattern — unknown / disallowed paths return null', () => {
  test('bare / → null (landing page is never recorded)', () => {
    expect(normalizeRoutePattern('/')).toBeNull();
  });

  test('/admin → null (admin is never tracked)', () => {
    expect(normalizeRoutePattern('/admin')).toBeNull();
  });

  test('/admin/access-log → null', () => {
    expect(normalizeRoutePattern('/admin/access-log')).toBeNull();
  });

  test('/auth/login → null (pre-auth)', () => {
    expect(normalizeRoutePattern('/auth/login')).toBeNull();
  });

  test('/policy → null (public page, no userId)', () => {
    expect(normalizeRoutePattern('/policy')).toBeNull();
  });

  test('completely unknown shape → null', () => {
    expect(normalizeRoutePattern('/something/i/just/made/up')).toBeNull();
  });

  test('empty string → null', () => {
    expect(normalizeRoutePattern('')).toBeNull();
  });
});

describe('normalizeRoutePattern — adversarial inputs return null', () => {
  test('path traversal /workspaces/../etc/passwd → null', () => {
    expect(normalizeRoutePattern('/workspaces/../etc/passwd')).toBeNull();
  });

  test('encoded path traversal /workspaces/%2e%2e/passwd → null', () => {
    expect(normalizeRoutePattern('/workspaces/%2e%2e/passwd')).toBeNull();
  });

  test('CR control char in slug → null', () => {
    expect(normalizeRoutePattern('/workspaces/foo%0d/tree')).toBeNull();
  });

  test('LF control char in slug → null', () => {
    expect(normalizeRoutePattern('/workspaces/foo%0a/tree')).toBeNull();
  });

  test('null byte in slug → null', () => {
    expect(normalizeRoutePattern('/workspaces/foo%00/tree')).toBeNull();
  });

  test('mixed-case /Workspaces/foo → null (paths are case-sensitive)', () => {
    expect(normalizeRoutePattern('/Workspaces/foo')).toBeNull();
  });

  test('query string after pathname → null (caller must strip first)', () => {
    expect(normalizeRoutePattern('/workspaces/foo?evil=1')).toBeNull();
  });

  test('fragment after pathname → null', () => {
    expect(normalizeRoutePattern('/workspaces/foo#frag')).toBeNull();
  });
});

describe('normalizeRoutePattern — trailing slash handling (D2)', () => {
  test('/workspaces/foo/tree/ → /workspaces/[slug]/tree (trailing slash stripped)', () => {
    expect(normalizeRoutePattern('/workspaces/foo/tree/')).toBe(
      '/workspaces/[slug]/tree',
    );
  });

  test('/workspaces/ → /workspaces', () => {
    expect(normalizeRoutePattern('/workspaces/')).toBe('/workspaces');
  });

  test('bare / does NOT strip to empty (still null)', () => {
    expect(normalizeRoutePattern('/')).toBeNull();
  });
});

describe('normalizeRoutePattern — UUID coverage', () => {
  test('UUID in workspace position is templated, not echoed', () => {
    const out = normalizeRoutePattern(
      '/api/workspaces/3c9d12bc-2a3a-4f8b-87f9-1e7e9a3a3c20/tree/individuals',
    );
    expect(out).not.toContain('3c9d12bc');
    expect(out).toBe('/api/workspaces/[id]/tree/individuals');
  });

  test('uppercase UUID is also templated', () => {
    const out = normalizeRoutePattern(
      '/api/workspaces/3C9D12BC-2A3A-4F8B-87F9-1E7E9A3A3C20/tree/individuals',
    );
    expect(out).toBe('/api/workspaces/[id]/tree/individuals');
  });

  test('non-UUID-shaped id at workspace position → null', () => {
    expect(
      normalizeRoutePattern('/api/workspaces/not-a-uuid/tree/individuals'),
    ).toBeNull();
  });
});
