import { describe, test, expect } from 'vitest';
import { isPointedIndividualId, isPointedFamilyId, isSyntheticFamilyId } from '@/lib/tree/branch-pointer-guards';

// ---------------------------------------------------------------------------
// isPointedIndividualId — checks against a set of pointed IDs
// ---------------------------------------------------------------------------

describe('isPointedIndividualId', () => {
  test('returns true for an ID in the pointed set', () => {
    const pointedIds = new Set(['ptr-root', 'ptr-child']);
    expect(isPointedIndividualId('ptr-root', pointedIds)).toBe(true);
  });

  test('returns false for an ID not in the pointed set', () => {
    const pointedIds = new Set(['ptr-root', 'ptr-child']);
    expect(isPointedIndividualId('local-person', pointedIds)).toBe(false);
  });

  test('returns false for empty pointed set', () => {
    const pointedIds = new Set<string>();
    expect(isPointedIndividualId('any-id', pointedIds)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPointedFamilyId — checks against a set of pointed family IDs
// ---------------------------------------------------------------------------

describe('isPointedFamilyId', () => {
  test('returns true for an ID in the pointed set', () => {
    const pointedFamilyIds = new Set(['ptr-fam-1']);
    expect(isPointedFamilyId('ptr-fam-1', pointedFamilyIds)).toBe(true);
  });

  test('returns false for a local family ID', () => {
    const pointedFamilyIds = new Set(['ptr-fam-1']);
    expect(isPointedFamilyId('local-fam', pointedFamilyIds)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isSyntheticFamilyId — checks if an ID matches the ptr-{pointerId}-fam pattern
// ---------------------------------------------------------------------------

describe('isSyntheticFamilyId', () => {
  test('returns true for a synthetic family ID', () => {
    expect(isSyntheticFamilyId('ptr-bp-1-fam')).toBe(true);
  });

  test('returns true for synthetic ID with UUID-style pointer ID', () => {
    expect(isSyntheticFamilyId('ptr-123e4567-e89b-12d3-a456-426614174000-fam')).toBe(true);
  });

  test('returns false for a regular UUID', () => {
    expect(isSyntheticFamilyId('123e4567-e89b-12d3-a456-426614174000')).toBe(false);
  });

  test('returns false for a regular family ID', () => {
    expect(isSyntheticFamilyId('fam-123')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isSyntheticFamilyId('')).toBe(false);
  });
});
