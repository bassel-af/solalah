/**
 * Phase 10b — task #3 (tdd-red)
 *
 * Failing tests for the new pure helper `isLikelyPlaintextUtf8(buf: Buffer)`
 * that the migration script `scripts/encrypt-existing-data.ts` will use to
 * sanity-check description-column bytes before re-encrypting them as legacy
 * UTF-8 plaintext.
 *
 * The helper module `scripts/lib/utf8-guard.ts` does NOT exist yet — these
 * tests should fail with a "module not found" error. tdd-green will create
 * it and wire it into the migration script.
 *
 * Contract:
 *   - Returns `true` iff `buf` is non-empty AND decodes as valid UTF-8 AND
 *     contains no rejected control bytes (0x00–0x08, 0x0e–0x1f, 0x7f).
 *   - Tab (0x09), LF (0x0a), CR (0x0d) are ALLOWED.
 *   - Empty buffer returns `false` (caller should skip empty separately).
 */

import { describe, test, expect } from 'vitest';

// The helper module doesn't exist yet — this import is expected to fail
// at module-resolution time, marking the suite red for the right reason.
import { isLikelyPlaintextUtf8 } from '../../../scripts/lib/utf8-guard';

describe('isLikelyPlaintextUtf8 — accepts valid plaintext', () => {
  test('returns true for plain ASCII', () => {
    expect(isLikelyPlaintextUtf8(Buffer.from('hello world'))).toBe(true);
  });

  test('returns true for Arabic UTF-8 text', () => {
    expect(isLikelyPlaintextUtf8(Buffer.from('عائلة القاضي', 'utf8'))).toBe(true);
  });

  test('returns true for JSON-shaped text', () => {
    expect(isLikelyPlaintextUtf8(Buffer.from('{"action":"create"}'))).toBe(true);
  });

  test('allows tab, LF, and CR whitespace', () => {
    expect(isLikelyPlaintextUtf8(Buffer.from('line1\nline2\tcol2\r\n'))).toBe(true);
  });
});

describe('isLikelyPlaintextUtf8 — rejects binary / control bytes', () => {
  test('returns false for binary garbage with NUL byte (0x00)', () => {
    expect(isLikelyPlaintextUtf8(Buffer.from([0xff, 0xfe, 0x00, 0x01]))).toBe(false);
  });

  test('returns false for NUL byte in the middle of otherwise-printable bytes', () => {
    expect(isLikelyPlaintextUtf8(Buffer.from([0x68, 0x65, 0x00, 0x6c, 0x6f]))).toBe(false);
  });

  test('returns false for BEL control byte (0x07)', () => {
    expect(isLikelyPlaintextUtf8(Buffer.from([0x68, 0x65, 0x07]))).toBe(false);
  });

  test('returns false for DEL byte (0x7f)', () => {
    expect(isLikelyPlaintextUtf8(Buffer.from([0x68, 0x65, 0x7f]))).toBe(false);
  });

  test('returns false for invalid UTF-8 start byte sequence', () => {
    expect(isLikelyPlaintextUtf8(Buffer.from([0xc3, 0x28]))).toBe(false);
  });
});

describe('isLikelyPlaintextUtf8 — empty input', () => {
  test('returns false for an empty buffer', () => {
    expect(isLikelyPlaintextUtf8(Buffer.from([]))).toBe(false);
  });
});
