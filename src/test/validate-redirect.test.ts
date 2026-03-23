import { describe, test, expect } from 'vitest';
import { validateRedirectPath } from '@/lib/auth/validate-redirect';

describe('validateRedirectPath', () => {
  test('allows /dashboard through', () => {
    expect(validateRedirectPath('/dashboard')).toBe('/dashboard');
  });

  test('allows /workspaces/some-slug through', () => {
    expect(validateRedirectPath('/workspaces/some-slug')).toBe('/workspaces/some-slug');
  });

  test('allows /invite/123 through', () => {
    expect(validateRedirectPath('/invite/123')).toBe('/invite/123');
  });

  test('allows path with query string through', () => {
    expect(validateRedirectPath('/dashboard?tab=settings')).toBe('/dashboard?tab=settings');
  });

  test('rejects absolute URL https://evil.com', () => {
    expect(validateRedirectPath('https://evil.com')).toBe('/dashboard');
  });

  test('rejects absolute URL http://evil.com', () => {
    expect(validateRedirectPath('http://evil.com')).toBe('/dashboard');
  });

  test('rejects protocol-relative URL //evil.com', () => {
    expect(validateRedirectPath('//evil.com')).toBe('/dashboard');
  });

  test('rejects javascript: URL', () => {
    expect(validateRedirectPath('javascript:alert(1)')).toBe('/dashboard');
  });

  test('rejects data: URL', () => {
    expect(validateRedirectPath('data:text/html,<script>alert(1)</script>')).toBe('/dashboard');
  });

  test('returns fallback for empty string', () => {
    expect(validateRedirectPath('')).toBe('/dashboard');
  });

  test('returns fallback for null', () => {
    expect(validateRedirectPath(null as unknown as string)).toBe('/dashboard');
  });

  test('returns fallback for undefined', () => {
    expect(validateRedirectPath(undefined as unknown as string)).toBe('/dashboard');
  });

  test('rejects path with backslash (\\\\evil.com)', () => {
    expect(validateRedirectPath('\\evil.com')).toBe('/dashboard');
  });

  test('rejects javascript: with mixed case', () => {
    expect(validateRedirectPath('JavaScript:alert(1)')).toBe('/dashboard');
  });

  test('rejects javascript: with leading whitespace', () => {
    expect(validateRedirectPath('  javascript:alert(1)')).toBe('/dashboard');
  });
});
