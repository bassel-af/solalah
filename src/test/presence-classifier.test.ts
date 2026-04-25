/**
 * Phase 2 — Live Presence
 *
 * Unit tests for `classifyRoute(pattern, method)`. The classifier maps a
 * canonical route + HTTP method to one of the v1 activity categories
 * (`viewing` | `editing`). Phase 11 categories (`posting`) are NOT tested
 * yet — they ship with the content features.
 *
 * Rules (v1):
 *   - GET on tree/workspace/profile → viewing
 *   - POST/PATCH/DELETE on tree mutation routes → editing
 *   - Unknown route or unknown method → viewing (safe fallback;
 *     editing is the alarm-state, viewing is the default)
 */

import { describe, test, expect } from 'vitest';
import { classifyRoute } from '@/lib/admin/presence';

describe('classifyRoute — viewing (page routes, all GET)', () => {
  test('/workspaces GET → viewing', () => {
    expect(classifyRoute('/workspaces', 'GET')).toBe('viewing');
  });

  test('/workspaces/[slug] GET → viewing', () => {
    expect(classifyRoute('/workspaces/[slug]', 'GET')).toBe('viewing');
  });

  test('/workspaces/[slug]/tree GET → viewing', () => {
    expect(classifyRoute('/workspaces/[slug]/tree', 'GET')).toBe('viewing');
  });

  test('/workspaces/[slug]/tree/audit GET → viewing', () => {
    expect(classifyRoute('/workspaces/[slug]/tree/audit', 'GET')).toBe(
      'viewing',
    );
  });

  test('/profile GET → viewing', () => {
    expect(classifyRoute('/profile', 'GET')).toBe('viewing');
  });
});

describe('classifyRoute — editing (API mutation routes)', () => {
  test('/api/workspaces/[id]/tree/individuals POST → editing', () => {
    expect(
      classifyRoute('/api/workspaces/[id]/tree/individuals', 'POST'),
    ).toBe('editing');
  });

  test('/api/workspaces/[id]/tree/individuals/[id] PATCH → editing', () => {
    expect(
      classifyRoute('/api/workspaces/[id]/tree/individuals/[id]', 'PATCH'),
    ).toBe('editing');
  });

  test('/api/workspaces/[id]/tree/individuals/[id] DELETE → editing', () => {
    expect(
      classifyRoute('/api/workspaces/[id]/tree/individuals/[id]', 'DELETE'),
    ).toBe('editing');
  });

  test('/api/workspaces/[id]/tree/families POST → editing', () => {
    expect(classifyRoute('/api/workspaces/[id]/tree/families', 'POST')).toBe(
      'editing',
    );
  });

  test('/api/workspaces/[id]/tree/families/[id]/children POST → editing', () => {
    expect(
      classifyRoute(
        '/api/workspaces/[id]/tree/families/[id]/children',
        'POST',
      ),
    ).toBe('editing');
  });

  test('/api/workspaces/[id]/tree/families/[id]/children/[id] DELETE → editing', () => {
    expect(
      classifyRoute(
        '/api/workspaces/[id]/tree/families/[id]/children/[id]',
        'DELETE',
      ),
    ).toBe('editing');
  });

  test('/api/workspaces/[id]/tree/rada-families POST → editing', () => {
    expect(
      classifyRoute('/api/workspaces/[id]/tree/rada-families', 'POST'),
    ).toBe('editing');
  });
});

describe('classifyRoute — viewing (API GET routes)', () => {
  test('/api/workspaces/[id]/tree/individuals GET → viewing', () => {
    // GET on a mutation route is a list / read; not editing.
    expect(
      classifyRoute('/api/workspaces/[id]/tree/individuals', 'GET'),
    ).toBe('viewing');
  });
});

describe('classifyRoute — fallback for unknown shapes', () => {
  test('unknown pattern + GET → viewing', () => {
    expect(classifyRoute('/something/weird', 'GET')).toBe('viewing');
  });

  test('unknown pattern + POST → viewing (safer default)', () => {
    expect(classifyRoute('/something/weird', 'POST')).toBe('viewing');
  });

  test('unknown method on known viewing route → viewing', () => {
    expect(classifyRoute('/workspaces', 'OPTIONS')).toBe('viewing');
  });
});
