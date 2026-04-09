/**
 * Phase 10b — startup validation integration test.
 *
 * Asserts that importing `@/lib/db` at module load triggers `getMasterKey()`
 * and that a missing or invalid `WORKSPACE_MASTER_KEY` causes the import to
 * throw — i.e. the entire app refuses to boot, the way the PRD specifies.
 *
 * We exercise the throw path by:
 *   1. Resetting the memoized master key
 *   2. Stubbing `process.env.WORKSPACE_MASTER_KEY` to bad values
 *   3. Calling `vi.resetModules()` so the next dynamic `import('@/lib/db')`
 *      re-executes the top-level `getMasterKey()` call
 *   4. Asserting the import rejects
 *
 * The happy path (valid env -> import succeeds) is implicit: every other test
 * in the suite imports modules that transitively pull in `@/lib/db`, so if
 * startup validation broke them they would all fail.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMasterKeyCache } from '@/lib/crypto/master-key';

describe('Phase 10b startup validation in src/lib/db.ts', () => {
  const originalKey = process.env.WORKSPACE_MASTER_KEY;

  beforeEach(() => {
    resetMasterKeyCache();
    vi.resetModules();
  });

  afterEach(() => {
    // Restore the env var so other tests that import db.ts in the same vitest
    // worker keep working. Memoized cache is reset at the top of each test.
    process.env.WORKSPACE_MASTER_KEY = originalKey;
    resetMasterKeyCache();
    vi.resetModules();
  });

  it('throws on import when WORKSPACE_MASTER_KEY is missing', async () => {
    delete process.env.WORKSPACE_MASTER_KEY;
    await expect(import('@/lib/db')).rejects.toThrow(/WORKSPACE_MASTER_KEY/);
  });

  it('throws on import when WORKSPACE_MASTER_KEY is empty', async () => {
    process.env.WORKSPACE_MASTER_KEY = '';
    await expect(import('@/lib/db')).rejects.toThrow(/WORKSPACE_MASTER_KEY/);
  });

  it('throws on import when WORKSPACE_MASTER_KEY decodes to the wrong length', async () => {
    // 16 bytes base64 -> only 16 bytes plaintext, not 32
    process.env.WORKSPACE_MASTER_KEY = Buffer.alloc(16, 1).toString('base64');
    await expect(import('@/lib/db')).rejects.toThrow(
      /must decode to exactly 32 bytes/,
    );
  });

  it('imports cleanly when WORKSPACE_MASTER_KEY is valid', async () => {
    process.env.WORKSPACE_MASTER_KEY = Buffer.alloc(32, 7).toString('base64');
    const mod = await import('@/lib/db');
    expect(mod.prisma).toBeDefined();
  });
});
