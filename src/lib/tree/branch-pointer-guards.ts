/**
 * Branch pointer mutation guards.
 *
 * These functions are used by tree mutation endpoints to reject
 * edits to pointed (read-only) entities.
 */

/** Check if an individual ID is in the set of pointed IDs */
export function isPointedIndividualId(
  individualId: string,
  pointedIds: Set<string>,
): boolean {
  return pointedIds.has(individualId);
}

/** Check if a family ID is in the set of pointed family IDs */
export function isPointedFamilyId(
  familyId: string,
  pointedFamilyIds: Set<string>,
): boolean {
  return pointedFamilyIds.has(familyId);
}

/**
 * Check if a family ID is a synthetic stitching family created by mergePointedSubtree.
 * Synthetic family IDs follow the pattern: ptr-{pointerId}-fam
 */
export function isSyntheticFamilyId(familyId: string): boolean {
  return /^ptr-.+-fam$/.test(familyId);
}
