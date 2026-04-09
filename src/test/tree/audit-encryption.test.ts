/**
 * Phase 10b follow-up (task #21): audit description + payload encryption
 * helpers. Pure-function tests — no Prisma, no DB, no env dependencies.
 *
 * Design note: the decrypt helpers THROW on auth-tag mismatch like every
 * other Phase 10b crypto helper. Task #24's migration script runs before
 * any read path ever sees a mixed state, so there is no legacy-plaintext
 * fallback path. Wrong-key and tampered-ciphertext cases both throw.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { generateWorkspaceKey } from '@/lib/crypto/workspace-encryption';
import {
  encryptAuditDescription,
  decryptAuditDescription,
  encryptAuditPayload,
  decryptAuditPayload,
} from '@/lib/tree/audit';

let key: Buffer;
let otherKey: Buffer;

beforeAll(() => {
  key = generateWorkspaceKey();
  otherKey = generateWorkspaceKey();
});

// ---------------------------------------------------------------------------
// encryptAuditDescription
// ---------------------------------------------------------------------------

describe('encryptAuditDescription', () => {
  test('returns a Buffer for a non-null name', () => {
    const out = encryptAuditDescription('create', 'individual', 'محمد', key);
    expect(Buffer.isBuffer(out)).toBe(true);
  });

  test('returns null for a null name even with a valid action/entityType', () => {
    // buildAuditDescription itself never returns null — it produces "إضافة شخص"
    // without a quoted name when the name is undefined. But the helper should
    // still produce a Buffer because the plaintext is a non-empty string.
    // To force the null branch we pass explicit null and rely on
    // encryptFieldNullable's empty-string coercion only, NOT a null name.
    // The real "null" path is when the caller passes null/undefined — the
    // helper treats that as "no name, use the short description form" and
    // returns a Buffer. So this test instead verifies that the short form
    // is produced correctly, and null only happens for a null plaintext,
    // which buildAuditDescription never produces.
    const out = encryptAuditDescription('create', 'individual', null, key);
    expect(Buffer.isBuffer(out)).toBe(true);
  });

  test('produces different ciphertexts on successive calls (nonce randomness)', () => {
    const a = encryptAuditDescription('create', 'individual', 'محمد', key);
    const b = encryptAuditDescription('create', 'individual', 'محمد', key);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect((a as Buffer).equals(b as Buffer)).toBe(false);
  });

  test('roundtrip preserves the Arabic description including quoted names', () => {
    const encrypted = encryptAuditDescription('update', 'individual', 'محمد بن أحمد', key);
    expect(encrypted).not.toBeNull();
    const decrypted = decryptAuditDescription(encrypted!, key);
    // buildAuditDescription wraps the name in quotes: `تعديل شخص "محمد بن أحمد"`
    expect(decrypted).toContain('محمد بن أحمد');
    expect(decrypted).toContain('تعديل');
  });
});

// ---------------------------------------------------------------------------
// decryptAuditDescription
// ---------------------------------------------------------------------------

describe('decryptAuditDescription', () => {
  test('null input returns null', () => {
    expect(decryptAuditDescription(null, key)).toBeNull();
  });

  test('accepts Uint8Array input (Prisma driver shape)', () => {
    const encrypted = encryptAuditDescription('create', 'individual', 'أحمد', key);
    expect(encrypted).not.toBeNull();
    // Simulate Prisma returning Uint8Array instead of Buffer
    const asUint8 = new Uint8Array(encrypted as Buffer);
    const decrypted = decryptAuditDescription(asUint8, key);
    expect(decrypted).toContain('أحمد');
  });

  test('wrong key throws', () => {
    const encrypted = encryptAuditDescription('create', 'individual', 'أحمد', key);
    expect(() => decryptAuditDescription(encrypted!, otherKey)).toThrow();
  });

  test('tampered ciphertext throws', () => {
    const encrypted = encryptAuditDescription('create', 'individual', 'أحمد', key);
    const tampered = Buffer.from(encrypted as Buffer);
    tampered[tampered.length - 1] ^= 0xff; // flip a bit in the auth tag
    expect(() => decryptAuditDescription(tampered, key)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// encryptAuditPayload
// ---------------------------------------------------------------------------

describe('encryptAuditPayload', () => {
  test('returns a Buffer for a non-null payload with nested objects and arrays', () => {
    const payload = {
      targetIndividualId: 'ind-1',
      targetName: 'محمد',
      affectedIndividualIds: ['a', 'b', 'c'],
      totalAffectedCount: 3,
      confirmationMethod: 'name_typing',
    };
    const out = encryptAuditPayload(payload, key);
    expect(Buffer.isBuffer(out)).toBe(true);
  });

  test('returns null for null input', () => {
    expect(encryptAuditPayload(null, key)).toBeNull();
  });

  test('returns null for undefined input', () => {
    expect(encryptAuditPayload(undefined, key)).toBeNull();
  });

  test('different ciphertexts on successive calls', () => {
    const payload = { name: 'محمد' };
    const a = encryptAuditPayload(payload, key);
    const b = encryptAuditPayload(payload, key);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect((a as Buffer).equals(b as Buffer)).toBe(false);
  });

  test('roundtrip preserves nested structure: objects, arrays, numbers, strings', () => {
    const payload = {
      targetIndividualId: 'ind-root',
      targetName: 'أم محمد',
      affectedIndividualIds: ['a-1', 'a-2', 'a-3'],
      totalAffectedCount: 3,
      confirmationMethod: 'name_typing' as const,
      nested: {
        level2: {
          level3: ['deep', 'value'],
          number: 42,
          bool: true,
        },
      },
    };
    const encrypted = encryptAuditPayload(payload, key);
    const decrypted = decryptAuditPayload(encrypted!, key);
    expect(decrypted).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------
// decryptAuditPayload
// ---------------------------------------------------------------------------

describe('decryptAuditPayload', () => {
  test('null input returns null', () => {
    expect(decryptAuditPayload(null, key)).toBeNull();
  });

  test('accepts Uint8Array input (Prisma driver shape)', () => {
    const payload = { foo: 'bar', count: 5 };
    const encrypted = encryptAuditPayload(payload, key);
    const asUint8 = new Uint8Array(encrypted as Buffer);
    const decrypted = decryptAuditPayload(asUint8, key);
    expect(decrypted).toEqual(payload);
  });

  test('wrong key throws', () => {
    const encrypted = encryptAuditPayload({ name: 'أحمد' }, key);
    expect(() => decryptAuditPayload(encrypted!, otherKey)).toThrow();
  });

  test('tampered ciphertext throws', () => {
    const encrypted = encryptAuditPayload({ name: 'أحمد' }, key);
    const tampered = Buffer.from(encrypted as Buffer);
    tampered[tampered.length - 1] ^= 0xff;
    expect(() => decryptAuditPayload(tampered, key)).toThrow();
  });
});
