/**
 * Logs an audit-write error that was deliberately swallowed to protect a
 * primary mutation from failing.
 *
 * Used in routes where audit-log writes wrap a destructive primary action
 * (e.g. `src/app/api/workspaces/[id]/share-tokens/[tokenId]/route.ts`) — the
 * audit failure must NOT roll the primary action back, but the gap should
 * still be visible in the application logs.
 *
 * Strict PII contract: we log only
 *   1. a stable PII-free tag (`'[swallowed-audit-error]'`)
 *   2. the caller-supplied `context` label (a short literal, never user input)
 *   3. an object with `errorType` (the error class name) and the entity refs
 *      passed in by the caller (`tokenId`, `pointerId`).
 *
 * We deliberately do NOT log the raw error object or `err.message`, because
 * Prisma errors and others may carry workspace names, slugs, or other PII
 * in the message body.
 *
 * The helper itself never throws — even if `console.error` blows up — so
 * callers can rely on it inside cleanup paths without an outer try/catch.
 */

export function logSwallowedAuditError(
  context: string,
  entityRef: { tokenId?: string; pointerId?: string },
  err: unknown,
): void {
  try {
    const errorType =
      (err as { constructor?: { name?: string } } | null)?.constructor?.name ?? 'Unknown';
    console.error('[swallowed-audit-error]', context, {
      errorType,
      ...entityRef,
    });
  } catch {
    // Logging itself failed — give up silently. Never throw from a logger.
  }
}
