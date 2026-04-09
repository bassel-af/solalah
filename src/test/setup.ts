import '@testing-library/jest-dom'
import { randomBytes } from 'node:crypto'

// Phase 10b: ensure tests that import code paths which call getMasterKey()
// have a deterministic fake key available. vitest does not load .env.local.
// Tests that exercise the "missing key" branch should use vi.stubEnv + the
// exported resetMasterKeyCache() helper to override this.
if (!process.env.WORKSPACE_MASTER_KEY) {
  process.env.WORKSPACE_MASTER_KEY = randomBytes(32).toString('base64')
}
