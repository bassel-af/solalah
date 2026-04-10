/**
 * UTF-8 sanity guard for the migration script's plaintext-fallback branches.
 *
 * Used by `scripts/encrypt-existing-data.ts` to decide whether a Bytes column
 * holds legacy plaintext that can safely be re-encrypted, or binary garbage
 * (e.g. a partial cross-key ciphertext) that should be skipped.
 *
 * Pure module — no Prisma, no env, no I/O. Importable from both Node scripts
 * and the test suite.
 */

/**
 * Returns true iff the buffer is non-empty AND decodes as valid UTF-8 AND
 * contains no rejected control bytes (0x00–0x08, 0x0e–0x1f, 0x7f).
 *
 * Whitespace control chars (\t = 0x09, \n = 0x0a, \r = 0x0d) are ALLOWED
 * because they appear in legacy descriptions and JSON payloads.
 *
 * Empty buffers return `false` — the caller must handle the empty case
 * separately if it wants distinct semantics.
 */
export function isLikelyPlaintextUtf8(buf: Buffer): boolean {
  if (buf.length === 0) return false;

  for (const byte of buf) {
    if (
      (byte >= 0x00 && byte <= 0x08) ||
      (byte >= 0x0e && byte <= 0x1f) ||
      byte === 0x7f
    ) {
      return false;
    }
  }

  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}
