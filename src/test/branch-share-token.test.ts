import { describe, test, expect } from 'vitest';
import {
  generateShareToken,
  hashToken,
  TOKEN_PREFIX,
} from '@/lib/tree/branch-share-token';

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

describe('generateShareToken', () => {
  test('returns a token with the brsh_ prefix', () => {
    const token = generateShareToken();
    expect(token.startsWith(TOKEN_PREFIX)).toBe(true);
  });

  test('generates tokens of sufficient length (at least 44 chars total)', () => {
    const token = generateShareToken();
    // brsh_ (5) + base64url of 32 bytes (43 chars) = 48 chars minimum
    expect(token.length).toBeGreaterThanOrEqual(44);
  });

  test('generates unique tokens on each call', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateShareToken());
    }
    expect(tokens.size).toBe(100);
  });

  test('token body is valid base64url (no +, /, or = characters)', () => {
    const token = generateShareToken();
    const body = token.slice(TOKEN_PREFIX.length);
    expect(body).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

// ---------------------------------------------------------------------------
// Token hashing
// ---------------------------------------------------------------------------

describe('hashToken', () => {
  test('returns a hex string', () => {
    const hash = hashToken('brsh_testtoken123');
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  test('returns a 64-character hex string (SHA-256)', () => {
    const hash = hashToken('brsh_testtoken123');
    expect(hash.length).toBe(64);
  });

  test('same input produces same hash (deterministic)', () => {
    const token = 'brsh_deterministic_test';
    expect(hashToken(token)).toBe(hashToken(token));
  });

  test('different inputs produce different hashes', () => {
    const hash1 = hashToken('brsh_token_a');
    const hash2 = hashToken('brsh_token_b');
    expect(hash1).not.toBe(hash2);
  });

  test('hashing the full token (with prefix) works for redemption', () => {
    const token = generateShareToken();
    const hash = hashToken(token);
    // Simulate DB lookup: hash the token again and compare
    expect(hashToken(token)).toBe(hash);
  });
});
