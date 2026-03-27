import { prisma } from '@/lib/db';

/**
 * Validates gender consistency for family spouse roles.
 * - husbandId must not be female (F)
 * - wifeId must not be male (M)
 * - If both have known sex, they must differ
 * - Unknown sex (null/'') is allowed — many records are incomplete
 *
 * Call this before any family create/update that sets husband or wife.
 */
export async function validateFamilyGender(
  husbandId: string | null,
  wifeId: string | null,
  treeId: string,
): Promise<{ valid: true } | { valid: false; error: string }> {
  let husbandSex: string | null = null;
  let wifeSex: string | null = null;

  if (husbandId) {
    const husband = await prisma.individual.findFirst({
      where: { id: husbandId, treeId },
      select: { sex: true },
    });
    husbandSex = husband?.sex ?? null;
    if (husbandSex === 'F') {
      return { valid: false, error: 'لا يمكن تعيين أنثى في خانة الزوج' };
    }
  }

  if (wifeId) {
    const wife = await prisma.individual.findFirst({
      where: { id: wifeId, treeId },
      select: { sex: true },
    });
    wifeSex = wife?.sex ?? null;
    if (wifeSex === 'M') {
      return { valid: false, error: 'لا يمكن تعيين ذكر في خانة الزوجة' };
    }
  }

  return { valid: true };
}

/**
 * Validates gender for branch pointer spouse/parent linking.
 * For spouse: anchor and selected must not be the same known sex.
 * For parent: selected person's sex must match the parent role (already handled by Rule 2).
 */
export function validateSpouseGender(
  anchorSex: string | null,
  selectedSex: string | null,
): { valid: true } | { valid: false; error: string } {
  if (
    anchorSex && selectedSex &&
    anchorSex === selectedSex
  ) {
    return {
      valid: false,
      error: 'لا يمكن ربط شخصين من نفس الجنس كزوجين',
    };
  }
  return { valid: true };
}
