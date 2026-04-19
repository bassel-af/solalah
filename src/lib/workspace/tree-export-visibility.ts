/**
 * Mapping between the three-segment UI (معطّل / المديرون فقط / جميع الأعضاء)
 * and the two server-side boolean flags on `Workspace`:
 *   - `enableTreeExport` (hard gate)
 *   - `allowMemberExport` (widen to non-admins)
 *
 * The server keeps two independent booleans because route-level authorization
 * reads them separately and enforces a cascade. The UI collapses them into a
 * single three-state selector because the (false, true) combination is
 * impossible post-cascade and dead to the user.
 */

export type ExportVisibilitySegment = 'off' | 'admins-only' | 'all-members';

export interface ExportVisibilityFlags {
  enableTreeExport?: boolean;
  allowMemberExport?: boolean;
}

/**
 * Derive the segment from the two booleans. Undefined values fall back to
 * Prisma schema defaults (`enableTreeExport=true`, `allowMemberExport=false`)
 * so the UI matches what the server would emit for an un-migrated workspace.
 *
 * The impossible (enableTreeExport=false, allowMemberExport=true) pairing is
 * collapsed to `'off'` — the parent gate is the one that matters, and
 * reporting `'all-members'` for a state the server will reject would mislead.
 */
export function segmentFromFlags(flags: ExportVisibilityFlags): ExportVisibilitySegment {
  const parent = flags.enableTreeExport ?? true;
  const child = flags.allowMemberExport ?? false;
  if (!parent) return 'off';
  return child ? 'all-members' : 'admins-only';
}

/** Produce the exact PATCH body for a given segment choice. */
export function flagsFromSegment(
  segment: ExportVisibilitySegment,
): Required<ExportVisibilityFlags> {
  switch (segment) {
    case 'off':
      return { enableTreeExport: false, allowMemberExport: false };
    case 'admins-only':
      return { enableTreeExport: true, allowMemberExport: false };
    case 'all-members':
      return { enableTreeExport: true, allowMemberExport: true };
  }
}
