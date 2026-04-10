/**
 * Phase 10b — task #1 (tdd-red)
 *
 * Failing tests for `logAdminAccess()` helper at `src/lib/audit/admin-access.ts`
 * and the `prisma.adminAccessLog` model. Neither exists yet — these tests
 * should fail with module-not-found / undefined-property errors. tdd-green
 * will then implement the model + helper to make them pass.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the Prisma client BEFORE the helper module is imported. The helper
// is expected to do `import { prisma } from '@/lib/db'` and call
// `prisma.adminAccessLog.create({ data: ... })`.
// ---------------------------------------------------------------------------

const mockAdminAccessLogCreate = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    adminAccessLog: {
      create: (...args: unknown[]) => mockAdminAccessLogCreate(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Lazy import of the helper so the mock above is in place first. The
// dynamic import will THROW (or return undefined) until tdd-green creates
// the file at `src/lib/audit/admin-access.ts`.
// ---------------------------------------------------------------------------

async function loadHelper() {
  // The path below MUST exist after tdd-green's implementation.
  const mod = await import('@/lib/audit/admin-access');
  return mod;
}

beforeEach(() => {
  mockAdminAccessLogCreate.mockReset();
});

describe('logAdminAccess — happy path with all fields', () => {
  test('writes a row to prisma.adminAccessLog with the full payload', async () => {
    const { logAdminAccess } = await loadHelper();

    mockAdminAccessLogCreate.mockResolvedValueOnce({ id: 'log-1' });

    await logAdminAccess({
      userId: 'user-uuid-1',
      action: 'workspace_data_read',
      workspaceId: 'ws-uuid-1',
      entityType: 'individual',
      entityId: 'ind-uuid-1',
      reason: 'admin reviewing reported content',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(mockAdminAccessLogCreate).toHaveBeenCalledTimes(1);
    const callArg = mockAdminAccessLogCreate.mock.calls[0][0];
    expect(callArg).toBeDefined();
    expect(callArg.data).toMatchObject({
      userId: 'user-uuid-1',
      action: 'workspace_data_read',
      workspaceId: 'ws-uuid-1',
      entityType: 'individual',
      entityId: 'ind-uuid-1',
      reason: 'admin reviewing reported content',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    });
  });
});

describe('logAdminAccess — minimal payload', () => {
  test('accepts only userId + action and persists null for optional fields', async () => {
    const { logAdminAccess } = await loadHelper();

    mockAdminAccessLogCreate.mockResolvedValueOnce({ id: 'log-2' });

    await logAdminAccess({
      userId: 'user-uuid-2',
      action: 'audit_log_read',
    });

    expect(mockAdminAccessLogCreate).toHaveBeenCalledTimes(1);
    const callArg = mockAdminAccessLogCreate.mock.calls[0][0];
    expect(callArg.data.userId).toBe('user-uuid-2');
    expect(callArg.data.action).toBe('audit_log_read');
    // Optional fields should be persisted as null (not undefined / missing)
    expect(callArg.data.workspaceId ?? null).toBeNull();
    expect(callArg.data.entityType ?? null).toBeNull();
    expect(callArg.data.entityId ?? null).toBeNull();
    expect(callArg.data.reason ?? null).toBeNull();
    expect(callArg.data.ipAddress ?? null).toBeNull();
    expect(callArg.data.userAgent ?? null).toBeNull();
  });
});

describe('logAdminAccess — DB error handling (fail-secure swallow)', () => {
  test('does not throw when prisma.adminAccessLog.create rejects', async () => {
    const { logAdminAccess } = await loadHelper();

    mockAdminAccessLogCreate.mockRejectedValueOnce(new Error('database is down'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      logAdminAccess({
        userId: 'user-uuid-3',
        action: 'cascade_delete_preview',
        workspaceId: 'ws-uuid-3',
        entityId: 'ind-uuid-3',
        reason: 'sensitive secret reason value should not be logged',
        userAgent: 'curl/8.0 secret-token',
      }),
    ).resolves.not.toThrow();

    // Helper should log exactly one generic error message via console.error.
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    // The logged message must NOT echo PII-bearing fields back to stdout.
    const allArgs = consoleSpy.mock.calls.flat().map((a) => {
      if (a instanceof Error) return a.message + ' ' + (a.stack ?? '');
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    });
    const combined = allArgs.join(' ');

    expect(combined).not.toContain('sensitive secret reason value');
    expect(combined).not.toContain('secret-token');
    expect(combined).not.toContain('ind-uuid-3');
    expect(combined).not.toContain('curl/8.0');

    consoleSpy.mockRestore();
  });
});

describe('logAdminAccess — reason length cap', () => {
  test('truncates reason strings longer than 500 characters', async () => {
    const { logAdminAccess } = await loadHelper();

    mockAdminAccessLogCreate.mockResolvedValueOnce({ id: 'log-4' });

    const longReason = 'x'.repeat(2000);

    await logAdminAccess({
      userId: 'user-uuid-4',
      action: 'workspace_data_read',
      reason: longReason,
    });

    expect(mockAdminAccessLogCreate).toHaveBeenCalledTimes(1);
    const persistedReason: string = mockAdminAccessLogCreate.mock.calls[0][0].data.reason;
    expect(typeof persistedReason).toBe('string');
    expect(persistedReason.length).toBeLessThanOrEqual(500);
    // The truncated value should still start with the original content
    expect(persistedReason.startsWith('xxxxxxxxxx')).toBe(true);
  });
});

describe('logAdminAccess — typed action union', () => {
  test('accepts the canonical action constants without runtime errors', async () => {
    const { logAdminAccess } = await loadHelper();

    mockAdminAccessLogCreate.mockResolvedValue({ id: 'log-5' });

    await logAdminAccess({ userId: 'u', action: 'workspace_data_read' });
    await logAdminAccess({ userId: 'u', action: 'audit_log_read' });
    await logAdminAccess({ userId: 'u', action: 'cascade_delete_preview' });

    expect(mockAdminAccessLogCreate).toHaveBeenCalledTimes(3);
    const actions = mockAdminAccessLogCreate.mock.calls.map((c) => c[0].data.action);
    expect(actions).toEqual([
      'workspace_data_read',
      'audit_log_read',
      'cascade_delete_preview',
    ]);
  });

  test('exports an AdminAccessAction type/union (compile-time guard)', async () => {
    const mod = await loadHelper();
    // The module is expected to export at least the helper. The type itself
    // is erased at runtime, so we only assert that the helper is a function.
    // The TypeScript compiler enforces the action union at the call site
    // above; if tdd-green forgets the union, this file will fail to compile.
    expect(typeof mod.logAdminAccess).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Phase 10b — task #12 (tdd-red, security review follow-up)
//
// Three new behaviors to lock in BEFORE tdd-green implements T13:
//   (a) `ipAddress` longer than 64 chars must be truncated by the helper.
//   (b) `null` ipAddress must round-trip cleanly through the truncate path.
//   (c) The `admin_access_logs.user_id` foreign-key constraint must be
//       DROPPED so audit rows survive user deletion (audit immortality).
//   (d) Schema-level VARCHAR caps must be present on the new migration:
//       reason 500, user_agent 500, ip_address 64, action / entity_type /
//       entity_id 100. Verified by reading the migration SQL on disk.
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('logAdminAccess — ipAddress length cap (security review MEDIUM-2)', () => {
  test('truncates ipAddress strings longer than 64 characters', async () => {
    const { logAdminAccess } = await loadHelper();

    mockAdminAccessLogCreate.mockResolvedValueOnce({ id: 'log-ip-1' });

    // 256-char IP-shaped garbage (X-Forwarded-For flood scenario)
    const flooded = '1.2.3.4,'.repeat(32); // 256 chars

    await logAdminAccess({
      userId: 'user-uuid-ip',
      action: 'workspace_data_read',
      ipAddress: flooded,
    });

    expect(mockAdminAccessLogCreate).toHaveBeenCalledTimes(1);
    const persistedIp: string = mockAdminAccessLogCreate.mock.calls[0][0].data.ipAddress;
    expect(typeof persistedIp).toBe('string');
    expect(persistedIp.length).toBeLessThanOrEqual(64);
    // Truncation must preserve the prefix, not arbitrarily rewrite the value.
    expect(flooded.startsWith(persistedIp)).toBe(true);
  });

  test('passes through ipAddress at exactly 64 characters unchanged', async () => {
    const { logAdminAccess } = await loadHelper();

    mockAdminAccessLogCreate.mockResolvedValueOnce({ id: 'log-ip-2' });

    const exact = 'a'.repeat(64);

    await logAdminAccess({
      userId: 'user-uuid-ip',
      action: 'workspace_data_read',
      ipAddress: exact,
    });

    expect(mockAdminAccessLogCreate.mock.calls[0][0].data.ipAddress).toBe(exact);
  });

  test('persists null ipAddress as null without throwing', async () => {
    const { logAdminAccess } = await loadHelper();

    mockAdminAccessLogCreate.mockResolvedValueOnce({ id: 'log-ip-3' });

    await expect(
      logAdminAccess({
        userId: 'user-uuid-ip',
        action: 'workspace_data_read',
        ipAddress: null,
      }),
    ).resolves.not.toThrow();

    const persistedIp = mockAdminAccessLogCreate.mock.calls[0][0].data.ipAddress;
    expect(persistedIp).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Migration SQL inspection — verifies the on-disk migration that tdd-green
// will create as part of T13. We pick the migration via a glob over the
// `prisma/migrations/` directory, looking for any folder whose name ends in
// `_admin_access_log_security_caps`. The directory and file do not exist
// yet, so this suite is RED until tdd-green ships the migration.
// ---------------------------------------------------------------------------

const MIGRATIONS_DIR = join(process.cwd(), 'prisma', 'migrations');

function findSecurityCapsMigration(): string | null {
  if (!existsSync(MIGRATIONS_DIR)) return null;
  const dirs = readdirSync(MIGRATIONS_DIR).filter((d) =>
    d.endsWith('_admin_access_log_security_caps'),
  );
  if (dirs.length === 0) return null;
  // Use the most recent (lexicographically last) match — migration prefixes
  // are timestamps, so lexicographic == chronological.
  dirs.sort();
  const latest = dirs[dirs.length - 1];
  const sqlPath = join(MIGRATIONS_DIR, latest, 'migration.sql');
  return existsSync(sqlPath) ? sqlPath : null;
}

describe('AdminAccessLog migration — security caps + drop user FK (T13 contract)', () => {
  test('a *_admin_access_log_security_caps migration exists on disk', () => {
    const sqlPath = findSecurityCapsMigration();
    expect(sqlPath, 'expected a migration directory ending in _admin_access_log_security_caps under prisma/migrations/').not.toBeNull();
  });

  test('migration drops the admin_access_logs_user_id_fkey foreign key', () => {
    const sqlPath = findSecurityCapsMigration();
    if (!sqlPath) throw new Error('migration file missing — see prior test');

    const sql = readFileSync(sqlPath, 'utf8');
    // The drop can be written as either DROP CONSTRAINT or ALTER TABLE ... DROP CONSTRAINT.
    expect(sql).toMatch(/DROP\s+CONSTRAINT[^\n]*admin_access_logs_user_id_fkey/i);
  });

  test('migration applies VARCHAR(64) cap to ip_address', () => {
    const sqlPath = findSecurityCapsMigration();
    if (!sqlPath) throw new Error('migration file missing — see prior test');
    const sql = readFileSync(sqlPath, 'utf8');
    expect(sql).toMatch(/"ip_address"\s+(?:SET\s+DATA\s+TYPE\s+|TYPE\s+)?VARCHAR\(64\)/i);
  });

  test('migration applies VARCHAR(100) cap to action', () => {
    const sqlPath = findSecurityCapsMigration();
    if (!sqlPath) throw new Error('migration file missing — see prior test');
    const sql = readFileSync(sqlPath, 'utf8');
    expect(sql).toMatch(/"action"\s+(?:SET\s+DATA\s+TYPE\s+|TYPE\s+)?VARCHAR\(100\)/i);
  });

  test('migration applies VARCHAR(100) cap to entity_type', () => {
    const sqlPath = findSecurityCapsMigration();
    if (!sqlPath) throw new Error('migration file missing — see prior test');
    const sql = readFileSync(sqlPath, 'utf8');
    expect(sql).toMatch(/"entity_type"\s+(?:SET\s+DATA\s+TYPE\s+|TYPE\s+)?VARCHAR\(100\)/i);
  });

  test('migration applies VARCHAR(100) cap to entity_id', () => {
    const sqlPath = findSecurityCapsMigration();
    if (!sqlPath) throw new Error('migration file missing — see prior test');
    const sql = readFileSync(sqlPath, 'utf8');
    expect(sql).toMatch(/"entity_id"\s+(?:SET\s+DATA\s+TYPE\s+|TYPE\s+)?VARCHAR\(100\)/i);
  });
});

// ---------------------------------------------------------------------------
// Schema-source guard: read `prisma/schema.prisma` from disk and assert
// the AdminAccessLog model body does NOT contain a `user User @relation(...)`
// line. This is a runtime check (not a TypeScript type assertion that gets
// erased), and it catches the foreign-key removal directly at the source
// of truth. Tdd-green will also need to re-run `prisma generate` and create
// a migration to drop the FK from the database — those are covered by the
// migration-SQL tests above.
// ---------------------------------------------------------------------------

function readAdminAccessLogModelBody(): string {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  const schema = readFileSync(schemaPath, 'utf8');
  // Extract the body between `model AdminAccessLog {` and the matching `}`.
  const match = schema.match(/model\s+AdminAccessLog\s*\{([\s\S]*?)\n\}/);
  if (!match) throw new Error('AdminAccessLog model not found in prisma/schema.prisma');
  return match[1];
}

describe('AdminAccessLog Prisma model — no user relation (audit immortality)', () => {
  test('schema does NOT declare a `user User @relation(...)` field on AdminAccessLog', () => {
    const body = readAdminAccessLogModelBody();
    // Reject any line that introduces a relation back to User on this model.
    // The scalar `userId` is fine; the relation field `user` (which carries
    // the FK constraint) is what we want gone.
    expect(body).not.toMatch(/\buser\s+User\b/);
    // Belt-and-braces: also reject `onDelete: Cascade` on this model — even
    // a future "soft" relation must not cascade-delete audit rows.
    expect(body).not.toMatch(/onDelete\s*:\s*Cascade/);
  });

  test('schema STILL declares the scalar userId column on AdminAccessLog', () => {
    const body = readAdminAccessLogModelBody();
    // Scalar UUID column must remain — we just lose the relation/constraint.
    expect(body).toMatch(/userId\s+String\s+@map\("user_id"\)\s+@db\.Uuid/);
  });

  test('User model does NOT back-reference AdminAccessLog (no `adminAccessLogs` relation)', () => {
    const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
    const schema = readFileSync(schemaPath, 'utf8');
    const userMatch = schema.match(/model\s+User\s*\{([\s\S]*?)\n\}/);
    expect(userMatch).not.toBeNull();
    const userBody = userMatch![1];
    // If the relation is dropped on AdminAccessLog, Prisma will refuse to
    // generate unless the back-reference on User is removed too.
    expect(userBody).not.toMatch(/adminAccessLogs\s+AdminAccessLog\[\]/);
  });
});
