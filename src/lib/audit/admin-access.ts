/**
 * Admin Access Log helper — Phase 10b operational safeguard.
 *
 * Records any server-side access to workspace data that happens OUTSIDE the
 * normal authenticated member request path (e.g. an operator running a
 * one-off support script, an admin reviewing reported content, an internal
 * job that needs to read across workspaces).
 *
 * Failure semantics: writes are best-effort. The helper NEVER throws —
 * a failed audit write must not break the operation it was meant to record.
 * On failure we log a generic, PII-free error so the gap is at least visible
 * in the application logs.
 *
 * This module is the scaffold + helper only. Wiring to admin-only routes
 * lives in a future phase when those routes exist.
 */

import { prisma } from '@/lib/db';

/** Maximum length stored for `reason`, `userAgent`, and `ipAddress` columns. */
const MAX_REASON_LENGTH = 500;
const MAX_USER_AGENT_LENGTH = 500;
// T9 MEDIUM-2: cap ipAddress so a caller passing X-Forwarded-For verbatim
// (which can chain dozens of proxies, plus attacker-controlled junk) cannot
// flood the table with megabyte values. The schema also enforces VARCHAR(64).
const MAX_IP_ADDRESS_LENGTH = 64;

// SECURITY NOTE: `reason` and `userAgent` are stored verbatim and may contain
// CR/LF/control bytes. They are NOT logged today. If a future caller renders
// these fields in any UI or log line, sanitize at the render boundary
// (HTML-escape or strip control bytes). See T9 security review LOW-3.

/**
 * Canonical action constants. The `(string & {})` opening keeps the union
 * extensible without forcing every caller through this file when a new
 * action gets introduced — but the literals still autocomplete.
 */
export type AdminAccessAction =
  | 'workspace_data_read'
  | 'audit_log_read'
  | 'cascade_delete_preview'
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  | (string & {});

export interface LogAdminAccessOptions {
  userId: string;
  action: AdminAccessAction;
  workspaceId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function truncate(value: string | null | undefined, max: number): string | null {
  if (value === null || value === undefined) return null;
  if (value.length <= max) return value;
  return value.slice(0, max);
}

/**
 * Persist an admin-access audit row. Best-effort; never throws.
 *
 * Failures are reported via `console.error` with ONLY the error class name
 * and the action — no userId, workspaceId, reason, or userAgent values are
 * echoed back, so the log line is safe to ship to production stdout.
 */
export async function logAdminAccess(opts: LogAdminAccessOptions): Promise<void> {
  try {
    await prisma.adminAccessLog.create({
      data: {
        userId: opts.userId,
        action: opts.action,
        workspaceId: opts.workspaceId ?? null,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
        reason: truncate(opts.reason, MAX_REASON_LENGTH),
        ipAddress: truncate(opts.ipAddress, MAX_IP_ADDRESS_LENGTH),
        userAgent: truncate(opts.userAgent, MAX_USER_AGENT_LENGTH),
      },
    });
  } catch (err) {
    // Deliberately PII-free: only the error class and the action label.
    // Never include opts.userId, opts.workspaceId, opts.reason, opts.userAgent,
    // or any free-form err.message text that could echo PII back.
    console.error('[admin-access-log] failed to write entry', {
      errorType: err instanceof Error ? err.constructor.name : typeof err,
      action: opts.action,
    });
  }
}
