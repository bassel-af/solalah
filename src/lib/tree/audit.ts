/**
 * Audit log helpers: snapshot extraction and description building.
 */

// Prisma Json fields require plain objects; these snapshot types use
// an index signature so they're directly assignable to InputJsonValue.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = { [key: string]: any };

/**
 * Prisma's nullable Json fields reject bare `null` at the type level.
 * This cast is safe: the driver adapter handles null correctly at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const JSON_NULL = null as any;

// ---------------------------------------------------------------------------
// Individual snapshot
// ---------------------------------------------------------------------------

export interface IndividualSnapshot extends JsonObject {
  id: string;
  givenName: string | null;
  surname: string | null;
  fullName: string | null;
  sex: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  birthPlaceId: string | null;
  birthDescription: string | null;
  birthNotes: string | null;
  birthHijriDate: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  deathPlaceId: string | null;
  deathDescription: string | null;
  deathNotes: string | null;
  deathHijriDate: string | null;
  kunya: string | null;
  notes: string | null;
  isDeceased: boolean;
  isPrivate: boolean;
}

export function snapshotIndividual(record: {
  id: string;
  givenName?: string | null;
  surname?: string | null;
  fullName?: string | null;
  sex?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  birthPlaceId?: string | null;
  birthDescription?: string | null;
  birthNotes?: string | null;
  birthHijriDate?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  deathPlaceId?: string | null;
  deathDescription?: string | null;
  deathNotes?: string | null;
  deathHijriDate?: string | null;
  kunya?: string | null;
  notes?: string | null;
  isDeceased?: boolean;
  isPrivate?: boolean;
}): IndividualSnapshot {
  return {
    id: record.id,
    givenName: record.givenName ?? null,
    surname: record.surname ?? null,
    fullName: record.fullName ?? null,
    sex: record.sex ?? null,
    birthDate: record.birthDate ?? null,
    birthPlace: record.birthPlace ?? null,
    birthPlaceId: record.birthPlaceId ?? null,
    birthDescription: record.birthDescription ?? null,
    birthNotes: record.birthNotes ?? null,
    birthHijriDate: record.birthHijriDate ?? null,
    deathDate: record.deathDate ?? null,
    deathPlace: record.deathPlace ?? null,
    deathPlaceId: record.deathPlaceId ?? null,
    deathDescription: record.deathDescription ?? null,
    deathNotes: record.deathNotes ?? null,
    deathHijriDate: record.deathHijriDate ?? null,
    kunya: record.kunya ?? null,
    notes: record.notes ?? null,
    isDeceased: record.isDeceased ?? false,
    isPrivate: record.isPrivate ?? false,
  };
}

// ---------------------------------------------------------------------------
// Family snapshot
// ---------------------------------------------------------------------------

export interface FamilySnapshot extends JsonObject {
  id: string;
  husbandId: string | null;
  wifeId: string | null;
  childrenIds: string[];
  marriageContractDate: string | null;
  marriageContractHijriDate: string | null;
  marriageContractPlace: string | null;
  marriageContractPlaceId: string | null;
  marriageContractDescription: string | null;
  marriageContractNotes: string | null;
  marriageDate: string | null;
  marriageHijriDate: string | null;
  marriagePlace: string | null;
  marriagePlaceId: string | null;
  marriageDescription: string | null;
  marriageNotes: string | null;
  isUmmWalad: boolean;
  isDivorced: boolean;
  divorceDate: string | null;
  divorceHijriDate: string | null;
  divorcePlace: string | null;
  divorcePlaceId: string | null;
  divorceDescription: string | null;
  divorceNotes: string | null;
}

export function snapshotFamily(record: {
  id: string;
  husbandId?: string | null;
  wifeId?: string | null;
  children?: { individualId: string }[];
  marriageContractDate?: string | null;
  marriageContractHijriDate?: string | null;
  marriageContractPlace?: string | null;
  marriageContractPlaceId?: string | null;
  marriageContractDescription?: string | null;
  marriageContractNotes?: string | null;
  marriageDate?: string | null;
  marriageHijriDate?: string | null;
  marriagePlace?: string | null;
  marriagePlaceId?: string | null;
  marriageDescription?: string | null;
  marriageNotes?: string | null;
  isUmmWalad?: boolean;
  isDivorced?: boolean;
  divorceDate?: string | null;
  divorceHijriDate?: string | null;
  divorcePlace?: string | null;
  divorcePlaceId?: string | null;
  divorceDescription?: string | null;
  divorceNotes?: string | null;
}): FamilySnapshot {
  return {
    id: record.id,
    husbandId: record.husbandId ?? null,
    wifeId: record.wifeId ?? null,
    childrenIds: record.children?.map(c => c.individualId) ?? [],
    marriageContractDate: record.marriageContractDate ?? null,
    marriageContractHijriDate: record.marriageContractHijriDate ?? null,
    marriageContractPlace: record.marriageContractPlace ?? null,
    marriageContractPlaceId: record.marriageContractPlaceId ?? null,
    marriageContractDescription: record.marriageContractDescription ?? null,
    marriageContractNotes: record.marriageContractNotes ?? null,
    marriageDate: record.marriageDate ?? null,
    marriageHijriDate: record.marriageHijriDate ?? null,
    marriagePlace: record.marriagePlace ?? null,
    marriagePlaceId: record.marriagePlaceId ?? null,
    marriageDescription: record.marriageDescription ?? null,
    marriageNotes: record.marriageNotes ?? null,
    isUmmWalad: record.isUmmWalad ?? false,
    isDivorced: record.isDivorced ?? false,
    divorceDate: record.divorceDate ?? null,
    divorceHijriDate: record.divorceHijriDate ?? null,
    divorcePlace: record.divorcePlace ?? null,
    divorcePlaceId: record.divorcePlaceId ?? null,
    divorceDescription: record.divorceDescription ?? null,
    divorceNotes: record.divorceNotes ?? null,
  };
}

// ---------------------------------------------------------------------------
// RadaFamily snapshot
// ---------------------------------------------------------------------------

export interface RadaFamilySnapshot extends JsonObject {
  id: string;
  fosterFatherId: string | null;
  fosterMotherId: string | null;
  childrenIds: string[];
  notes: string | null;
}

export function snapshotRadaFamily(record: {
  id: string;
  fosterFatherId?: string | null;
  fosterMotherId?: string | null;
  notes?: string | null;
  children?: { individualId: string }[];
}): RadaFamilySnapshot {
  return {
    id: record.id,
    fosterFatherId: record.fosterFatherId ?? null,
    fosterMotherId: record.fosterMotherId ?? null,
    childrenIds: record.children?.map(c => c.individualId) ?? [],
    notes: record.notes ?? null,
  };
}

// ---------------------------------------------------------------------------
// BranchPointer snapshot
// ---------------------------------------------------------------------------

export interface BranchPointerSnapshot extends JsonObject {
  id: string;
  sourceWorkspaceId: string;
  rootIndividualId: string;
  selectedIndividualId: string;
  targetWorkspaceId: string;
  anchorIndividualId: string;
  relationship: string;
  status: string;
  linkChildrenToAnchor: boolean;
  shareTokenId: string | null;
}

export function snapshotBranchPointer(record: {
  id: string;
  sourceWorkspaceId: string;
  rootIndividualId: string;
  selectedIndividualId: string;
  targetWorkspaceId: string;
  anchorIndividualId: string;
  relationship: string;
  status: string;
  linkChildrenToAnchor: boolean;
  shareTokenId?: string | null;
}): BranchPointerSnapshot {
  return {
    id: record.id,
    sourceWorkspaceId: record.sourceWorkspaceId,
    rootIndividualId: record.rootIndividualId,
    selectedIndividualId: record.selectedIndividualId,
    targetWorkspaceId: record.targetWorkspaceId,
    anchorIndividualId: record.anchorIndividualId,
    relationship: record.relationship,
    status: record.status,
    linkChildrenToAnchor: record.linkChildrenToAnchor,
    shareTokenId: record.shareTokenId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Arabic description builder
// ---------------------------------------------------------------------------

type AuditEntityType = 'individual' | 'family' | 'family_child' | 'rada_family' | 'rada_family_child' | 'branch_pointer' | 'share_token' | 'tree';

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  individual: 'شخص',
  family: 'عائلة',
  family_child: 'ابن/ابنة',
  rada_family: 'عائلة رضاعة',
  rada_family_child: 'ابن/ابنة رضاعة',
  branch_pointer: 'ربط فرع',
  share_token: 'رمز مشاركة',
  tree: 'شجرة',
};

export function buildAuditDescription(
  action: string,
  entityType: string,
  entityName?: string,
): string {
  const label = ENTITY_LABELS[entityType as AuditEntityType] ?? entityType;
  const name = entityName ? ` "${entityName}"` : '';

  switch (action) {
    case 'create':
      return `إضافة ${label}${name}`;
    case 'update':
      return `تعديل ${label}${name}`;
    case 'delete':
      return `حذف ${label}${name}`;
    case 'cascade_delete':
      return `حذف متسلسل من ${label}${name}`;
    case 'MOVE_SUBTREE':
      return `نقل فرع${name}`;
    case 'import':
      return `استيراد بيانات GEDCOM`;
    default:
      return `${action} ${label}${name}`;
  }
}
