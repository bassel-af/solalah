import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { glob } from 'node:fs';
import { promisify } from 'node:util';

const globAsync = promisify(glob);

/**
 * T7 — coverage gate: every /api/admin/** route handler must reference
 * `requirePlatformOwner`. Static text-grep is intentional — it can't tell
 * whether the call is reachable, but it's a load-bearing reminder that
 * stops a developer from merging an admin route that simply forgot the
 * guard. The middleware fallback is defense in depth, not a substitute.
 *
 * The healthcheck route (`src/app/api/admin/healthcheck/route.ts`)
 * exists to (a) prove the positive case works and (b) confirm the
 * middleware + guard compose correctly end-to-end.
 */

const ADMIN_ROUTES_GLOB = path.resolve(__dirname, '../app/api/admin/**/route.ts');
const REPO_ROOT = path.resolve(__dirname, '../..');

describe('admin route handler coverage', () => {
  test('every /api/admin/**/route.ts references requirePlatformOwner', async () => {
    // node:fs glob (Node 22+) — same callable shape as fast-glob's basic API.
    const files = (await globAsync(ADMIN_ROUTES_GLOB)) as string[];

    // The healthcheck must exist as a baseline so this test is meaningful.
    expect(
      files.some((f) => f.endsWith('/admin/healthcheck/route.ts')),
      'expected the canary healthcheck route to be present',
    ).toBe(true);

    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (!text.includes('requirePlatformOwner')) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }

    expect(
      offenders,
      `These admin route handlers do NOT reference requirePlatformOwner:\n  - ${offenders.join('\n  - ')}\n` +
        `Every handler under src/app/api/admin/** must call requirePlatformOwner. ` +
        `The middleware fallback is defense in depth, not a substitute.`,
    ).toEqual([]);
  });
});
