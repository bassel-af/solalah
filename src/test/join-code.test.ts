import { describe, test, expect, vi } from 'vitest';
import { randomBytes as realRandomBytes } from 'node:crypto';

// Track calls to randomBytes to verify crypto is used
let randomBytesCalls = 0;

vi.mock('crypto', () => {
  const wrappedRandomBytes = (...args: Parameters<typeof realRandomBytes>) => {
    randomBytesCalls++;
    return realRandomBytes(...args);
  };
  return {
    default: { randomBytes: wrappedRandomBytes },
    randomBytes: wrappedRandomBytes,
  };
});

// Test the extracted generateJoinCode function directly
// It should use crypto, produce 8 random chars, and only use A-Z0-9
describe('generateJoinCode', () => {
  test('produces format PREFIX-XXXXXXXX with 8 random chars', async () => {
    const { generateJoinCode } = await import('@/lib/workspace/join-code');
    const code = generateJoinCode('saeed-family');
    expect(code).toMatch(/^SAEED-[A-Z0-9]{8}$/);
  });

  test('uses only uppercase alphanumeric characters in random part', async () => {
    const { generateJoinCode } = await import('@/lib/workspace/join-code');
    // Generate multiple codes and check the random part
    for (let i = 0; i < 20; i++) {
      const code = generateJoinCode('test-workspace');
      const randomPart = code.split('-').slice(1).join('-'); // everything after the first dash
      expect(randomPart).toMatch(/^[A-Z0-9]+$/);
    }
  });

  test('random part is exactly 8 characters long', async () => {
    const { generateJoinCode } = await import('@/lib/workspace/join-code');
    for (let i = 0; i < 20; i++) {
      const code = generateJoinCode('my-family');
      const parts = code.split('-');
      // prefix is parts[0], random is parts[1]
      expect(parts[1]).toHaveLength(8);
    }
  });

  test('prefix is derived from slug (first word, uppercased, max 8 chars)', async () => {
    const { generateJoinCode } = await import('@/lib/workspace/join-code');

    const code1 = generateJoinCode('saeed-family');
    expect(code1).toMatch(/^SAEED-/);

    const code2 = generateJoinCode('al-rashid-clan');
    expect(code2).toMatch(/^AL-/);

    const code3 = generateJoinCode('verylongprefix-family');
    expect(code3).toMatch(/^VERYLONG-/); // truncated to 8 chars
  });

  test('generates different codes on successive calls (not deterministic)', async () => {
    const { generateJoinCode } = await import('@/lib/workspace/join-code');
    const codes = new Set<string>();
    for (let i = 0; i < 10; i++) {
      codes.add(generateJoinCode('test-family'));
    }
    // With 36^8 possibilities, 10 codes should all be unique
    expect(codes.size).toBe(10);
  });

  test('uses crypto.randomBytes for randomness (not Math.random)', async () => {
    const { generateJoinCode } = await import('@/lib/workspace/join-code');
    const before = randomBytesCalls;
    generateJoinCode('test-family');
    expect(randomBytesCalls).toBeGreaterThan(before);
  });
});
