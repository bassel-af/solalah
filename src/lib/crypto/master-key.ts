/**
 * Master key loader — Phase 10b Layer 2.
 *
 * Loads the `WORKSPACE_MASTER_KEY` from the environment, validates that it
 * decodes to exactly 32 bytes, and memoizes the result for the life of the
 * process. Should be called at app startup (via src/lib/db.ts or equivalent)
 * so that a missing or malformed key fails fast, not on first request.
 *
 * Security notes:
 *   - The env var is a base64-encoded 32-byte AES-256 key.
 *   - Generate with: `openssl rand -base64 32`
 *   - If missing, the app MUST refuse to start — there is no fallback.
 *   - Error messages deliberately do NOT include the raw env var value
 *     (which may contain partial or garbled key material).
 *   - `resetMasterKeyCache()` exists ONLY for tests — do not call from app code.
 */

import { WORKSPACE_KEY_LENGTH } from '@/lib/crypto/workspace-encryption';

const ENV_VAR_NAME = 'WORKSPACE_MASTER_KEY';

let cachedMasterKey: Buffer | null = null;

/**
 * Read, validate, and memoize the master key from `process.env[WORKSPACE_MASTER_KEY]`.
 * The returned Buffer is exactly 32 bytes.
 *
 * @throws "WORKSPACE_MASTER_KEY is not set" if the env var is missing or empty.
 * @throws "WORKSPACE_MASTER_KEY must decode to exactly 32 bytes (got N)" otherwise.
 */
export function getMasterKey(): Buffer {
  if (cachedMasterKey !== null) {
    return cachedMasterKey;
  }

  const raw = process.env[ENV_VAR_NAME];
  if (raw === undefined || raw === '') {
    throw new Error(
      `${ENV_VAR_NAME} is not set. Generate one with: openssl rand -base64 32`,
    );
  }

  let decoded: Buffer;
  try {
    decoded = Buffer.from(raw, 'base64');
  } catch {
    // Buffer.from with 'base64' does not normally throw, but guard defensively.
    // Do NOT include `raw` in the error message — it may leak partial key material.
    throw new Error(
      `${ENV_VAR_NAME} is not valid base64. Generate one with: openssl rand -base64 32`,
    );
  }

  if (decoded.length !== WORKSPACE_KEY_LENGTH) {
    // Deliberately does not include the raw env var value.
    throw new Error(
      `${ENV_VAR_NAME} must decode to exactly ${WORKSPACE_KEY_LENGTH} bytes ` +
        `(got ${decoded.length}). Generate one with: openssl rand -base64 32`,
    );
  }

  cachedMasterKey = decoded;
  return cachedMasterKey;
}

/**
 * Reset the memoized master key. TEST-ONLY — do not call from application code.
 * Used by tests that need to exercise startup validation across multiple env states.
 */
export function resetMasterKeyCache(): void {
  cachedMasterKey = null;
}
