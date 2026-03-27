import { describe, test, expect } from 'vitest';
import {
  createShareTokenSchema,
  redeemTokenSchema,
  branchSharingPolicySchema,
} from '@/lib/tree/branch-pointer-schemas';

// ---------------------------------------------------------------------------
// createShareTokenSchema
// ---------------------------------------------------------------------------

describe('createShareTokenSchema', () => {
  test('accepts valid input with all fields', () => {
    const result = createShareTokenSchema.safeParse({
      rootIndividualId: '123e4567-e89b-12d3-a456-426614174000',
      depthLimit: 3,
      includeGrafts: true,
      targetWorkspaceSlug: 'al-sharbek',
      isPublic: false,
    });

    expect(result.success).toBe(true);
  });

  test('accepts input with minimal fields (no depth limit, no target)', () => {
    const result = createShareTokenSchema.safeParse({
      rootIndividualId: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.depthLimit).toBeUndefined();
      expect(result.data.includeGrafts).toBe(false);
      expect(result.data.isPublic).toBe(false);
    }
  });

  test('rejects non-UUID rootIndividualId', () => {
    const result = createShareTokenSchema.safeParse({
      rootIndividualId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });

  test('rejects missing rootIndividualId', () => {
    const result = createShareTokenSchema.safeParse({
      depthLimit: 3,
    });

    expect(result.success).toBe(false);
  });

  test('rejects negative depthLimit', () => {
    const result = createShareTokenSchema.safeParse({
      rootIndividualId: '123e4567-e89b-12d3-a456-426614174000',
      depthLimit: -1,
    });

    expect(result.success).toBe(false);
  });

  test('rejects depthLimit over 50', () => {
    const result = createShareTokenSchema.safeParse({
      rootIndividualId: '123e4567-e89b-12d3-a456-426614174000',
      depthLimit: 51,
    });

    expect(result.success).toBe(false);
  });

  test('accepts depthLimit of 0 (root only)', () => {
    const result = createShareTokenSchema.safeParse({
      rootIndividualId: '123e4567-e89b-12d3-a456-426614174000',
      depthLimit: 0,
    });

    expect(result.success).toBe(true);
  });

  test('rejects targetWorkspaceSlug longer than 100 characters', () => {
    const result = createShareTokenSchema.safeParse({
      rootIndividualId: '123e4567-e89b-12d3-a456-426614174000',
      targetWorkspaceSlug: 'a'.repeat(101),
    });

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// redeemTokenSchema
// ---------------------------------------------------------------------------

describe('redeemTokenSchema', () => {
  test('accepts valid token string', () => {
    const result = redeemTokenSchema.safeParse({
      token: 'brsh_abc123def456',
      anchorIndividualId: '123e4567-e89b-12d3-a456-426614174000',
      selectedPersonId: 'src-root-uuid',
      relationship: 'child',
    });

    expect(result.success).toBe(true);
  });

  test('rejects empty token', () => {
    const result = redeemTokenSchema.safeParse({
      token: '',
      anchorIndividualId: '123e4567-e89b-12d3-a456-426614174000',
      selectedPersonId: 'src-root-uuid',
      relationship: 'child',
    });

    expect(result.success).toBe(false);
  });

  test('rejects token longer than 200 characters', () => {
    const result = redeemTokenSchema.safeParse({
      token: 'brsh_' + 'a'.repeat(200),
      anchorIndividualId: '123e4567-e89b-12d3-a456-426614174000',
      selectedPersonId: 'src-root-uuid',
      relationship: 'child',
    });

    expect(result.success).toBe(false);
  });

  test('rejects non-UUID anchorIndividualId', () => {
    const result = redeemTokenSchema.safeParse({
      token: 'brsh_abc123',
      anchorIndividualId: 'not-a-uuid',
      selectedPersonId: 'src-root-uuid',
      relationship: 'child',
    });

    expect(result.success).toBe(false);
  });

  test('rejects invalid relationship type', () => {
    const result = redeemTokenSchema.safeParse({
      token: 'brsh_abc123',
      anchorIndividualId: '123e4567-e89b-12d3-a456-426614174000',
      selectedPersonId: 'src-root-uuid',
      relationship: 'cousin',
    });

    expect(result.success).toBe(false);
  });

  test('accepts all valid relationship types', () => {
    for (const rel of ['child', 'sibling', 'spouse', 'parent']) {
      const result = redeemTokenSchema.safeParse({
        token: 'brsh_abc123',
        anchorIndividualId: '123e4567-e89b-12d3-a456-426614174000',
        selectedPersonId: 'src-root-uuid',
        relationship: rel,
      });

      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// branchSharingPolicySchema
// ---------------------------------------------------------------------------

describe('branchSharingPolicySchema', () => {
  test('accepts valid policy values', () => {
    for (const policy of ['shareable', 'copyable_only', 'none']) {
      const result = branchSharingPolicySchema.safeParse({ policy });
      expect(result.success).toBe(true);
    }
  });

  test('rejects invalid policy value', () => {
    const result = branchSharingPolicySchema.safeParse({ policy: 'open' });
    expect(result.success).toBe(false);
  });
});
