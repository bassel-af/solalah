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
  test('produces format SLUG-XXXXXXXX with full slug as prefix', async () => {
    const { generateJoinCode } = await import('@/lib/workspace/join-code');
    const code = generateJoinCode('saeed-family');
    expect(code).toMatch(/^SAEED-FAMILY-[A-Z0-9]{8}$/);
  });

  test('uses only uppercase alphanumeric characters in random part', async () => {
    const { generateJoinCode } = await import('@/lib/workspace/join-code');
    // Generate multiple codes and check the random part — random part is last 8 chars
    for (let i = 0; i < 20; i++) {
      const code = generateJoinCode('test');
      const randomPart = code.split('-').pop()!;
      expect(randomPart).toMatch(/^[A-Z0-9]{8}$/);
    }
  });

  test('random part is exactly 8 characters long', async () => {
    const { generateJoinCode } = await import('@/lib/workspace/join-code');
    for (let i = 0; i < 20; i++) {
      const code = generateJoinCode('my-family');
      // Random part is the last segment after the final dash
      const lastDash = code.lastIndexOf('-');
      const randomPart = code.slice(lastDash + 1);
      expect(randomPart).toHaveLength(8);
    }
  });

  test('prefix is the full slug uppercased', async () => {
    const { generateJoinCode } = await import('@/lib/workspace/join-code');

    const code1 = generateJoinCode('saeed-family');
    expect(code1).toMatch(/^SAEED-FAMILY-/);

    const code2 = generateJoinCode('al-rashid-clan');
    expect(code2).toMatch(/^AL-RASHID-CLAN-/);

    const code3 = generateJoinCode('السعيد');
    expect(code3).toMatch(/^السعيد-/);
  });

  test('generates different codes on successive calls (not deterministic)', async () => {
    const { generateJoinCode } = await import('@/lib/workspace/join-code');
    const codes = new Set<string>();
    for (let i = 0; i < 10; i++) {
      codes.add(generateJoinCode('test'));
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
