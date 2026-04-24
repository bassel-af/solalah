import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

/**
 * Phase 0 SEO — landing page split.
 *
 * `<LandingRedirector />` is the tiny client island that replaces the old
 * `'use client'` page.tsx. Its only job: forward Supabase auth fragments
 * (hash or PKCE code) to `/auth/confirm` on mount. The middleware now owns
 * the session-based redirect, so this component must NOT call Supabase.
 *
 * The component captures `window.location.hash` and `.search` at MODULE
 * LOAD (before Supabase's browser client can consume the hash). We exercise
 * that behavior by mutating `window.location` before each dynamic import
 * and resetting the module registry with `vi.resetModules()`.
 */

describe('<LandingRedirector />', () => {
  let hrefAssignments: string[];
  const originalLocation = window.location;

  beforeEach(() => {
    hrefAssignments = [];
    vi.resetModules();
  });

  afterEach(() => {
    // Restore the real window.location so later tests aren't polluted.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  function stubLocation({ hash = '', search = '' }: { hash?: string; search?: string }) {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hash,
        search,
        set href(value: string) {
          hrefAssignments.push(value);
        },
        get href() {
          return 'http://localhost:4000/' + search + hash;
        },
      },
    });
  }

  test('forwards hash fragment with access_token to /auth/confirm', async () => {
    stubLocation({ hash: '#access_token=abc' });
    const { default: LandingRedirector } = await import('@/app/LandingRedirector');

    render(<LandingRedirector />);

    expect(hrefAssignments).toEqual(['/auth/confirm#access_token=abc']);
  });

  test('forwards PKCE code search param to /auth/confirm', async () => {
    stubLocation({ search: '?code=xyz' });
    const { default: LandingRedirector } = await import('@/app/LandingRedirector');

    render(<LandingRedirector />);

    expect(hrefAssignments).toEqual(['/auth/confirm?code=xyz']);
  });

  test('does nothing when hash and search are empty', async () => {
    stubLocation({ hash: '', search: '' });
    const { default: LandingRedirector } = await import('@/app/LandingRedirector');

    render(<LandingRedirector />);

    expect(hrefAssignments).toEqual([]);
  });

  test('forwards hash fragment with error to /auth/confirm', async () => {
    stubLocation({ hash: '#error=invalid_grant' });
    const { default: LandingRedirector } = await import('@/app/LandingRedirector');

    render(<LandingRedirector />);

    expect(hrefAssignments).toEqual(['/auth/confirm#error=invalid_grant']);
  });
});
