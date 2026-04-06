import type { Individual, Family, GedcomData } from '@/lib/gedcom/types';
import { getDisplayName } from '@/lib/gedcom';
import { getAllDescendants } from '@/lib/gedcom/graph';

/** Format date with place for display */
export function formatDateWithPlace(date: string, place: string): string {
  if (date && place) return `${date} — ${place}`;
  if (date) return date;
  if (place) return place;
  return '';
}

/** Get deceased label based on sex, only when isDeceased is true but no death date */
export function getDeceasedLabel(person: Individual): string | null {
  if (!person.isDeceased) return null;
  if (person.death) return null;
  return person.sex === 'F' ? 'متوفية' : 'متوفى';
}

/** Determine if family picker is needed for add-child action */
export function needsFamilyPickerForAddChild(person: Individual): boolean {
  return person.familiesAsSpouse.length > 1;
}

/** Add-parent validation result */
export type AddParentResult =
  | { allowed: true; lockedSex?: 'M' | 'F' }
  | { allowed: false; error: string };

/** Validate whether a parent can be added and determine locked sex */
export function validateAddParent(person: Individual, data: GedcomData): AddParentResult {
  if (!person.familyAsChild) {
    return { allowed: true };
  }
  const family = data.families[person.familyAsChild];
  if (!family) {
    return { allowed: true };
  }
  if (family.husband && family.wife) {
    return { allowed: false, error: 'هذا الشخص لديه والدان بالفعل' };
  }
  if (family.husband && !family.wife) {
    return { allowed: true, lockedSex: 'F' };
  }
  if (!family.husband && family.wife) {
    return { allowed: true, lockedSex: 'M' };
  }
  return { allowed: true };
}

/** Add-sibling validation result */
export type AddSiblingResult =
  | { allowed: true; targetFamilyId: string }
  | { allowed: false };

/** Validate whether a sibling can be added to the same parent family */
export function validateAddSibling(person: Individual, data: GedcomData): AddSiblingResult {
  if (!person.familyAsChild) {
    return { allowed: false };
  }
  const family = data.families[person.familyAsChild];
  if (!family) {
    return { allowed: false };
  }
  return { allowed: true, targetFamilyId: person.familyAsChild };
}

/** Check if person can be moved as a subtree (has a familyAsChild) */
export function canMoveSubtree(person: Individual): boolean {
  return person.familyAsChild !== null;
}

/**
 * Get all possible target families for move-subtree.
 * Caller must pre-compute subtreeIds (person + all descendants) and pass it in
 * to avoid recomputing on every call.
 */
export function getTargetFamiliesForMove(
  person: Individual,
  data: GedcomData,
  subtreeIds: Set<string>,
): Array<{ familyId: string; parentNames: string }> {
  if (!person.familyAsChild) return [];

  const results: Array<{ familyId: string; parentNames: string }> = [];
  const currentFamilyId = person.familyAsChild;

  for (const [famId, family] of Object.entries(data.families)) {
    if (famId === currentFamilyId) continue;
    // Skip pointed families — can't move into external data
    if (family._pointed) continue;
    // Exclude families where either parent is inside the subtree (cycle prevention)
    if (family.husband && subtreeIds.has(family.husband)) continue;
    if (family.wife && subtreeIds.has(family.wife)) continue;
    // Exclude families where the person is already a child
    if (family.children.includes(person.id)) continue;

    const names: string[] = [];
    if (family.husband) {
      const h = data.individuals[family.husband];
      if (h) names.push(getDisplayName(h));
    }
    if (family.wife) {
      const w = data.individuals[family.wife];
      if (w) names.push(getDisplayName(w));
    }
    results.push({
      familyId: famId,
      parentNames: names.length > 0 ? names.join(' + ') : 'عائلة بدون والدين',
    });
  }
  return results;
}

/** Compute subtree IDs (person + all descendants) for move-subtree operations */
export function computeSubtreeIds(data: GedcomData, personId: string): Set<string> {
  const descendants = getAllDescendants(data, personId);
  descendants.add(personId);
  return descendants;
}

/** Build initial data for edit form including new Phase 3 fields */
export function buildEditInitialData(person: Individual): Record<string, unknown> {
  const result: Record<string, unknown> = {
    givenName: person.givenName,
    surname: person.surname,
    sex: person.sex ?? '',
    birthDate: person.birth,
    birthPlace: person.birthPlace,
    birthDescription: person.birthDescription,
    birthNotes: person.birthNotes,
    birthHijriDate: person.birthHijriDate,
    deathDate: person.death,
    deathPlace: person.deathPlace,
    deathDescription: person.deathDescription,
    deathNotes: person.deathNotes,
    deathHijriDate: person.deathHijriDate,
    kunya: person.kunya ?? '',
    isDeceased: person.isDeceased,
    isPrivate: person.isPrivate,
    notes: person.notes,
  };
  if (person.birthPlaceId !== undefined) result.birthPlaceId = person.birthPlaceId;
  if (person.deathPlaceId !== undefined) result.deathPlaceId = person.deathPlaceId;
  return result;
}

/** Build initial data for family event form from a Family object */
export function buildFamilyEventInitialData(family: Family) {
  const result: Record<string, unknown> = {
    isUmmWalad: family.isUmmWalad ?? false,
    marriageContractDate: family.marriageContract.date,
    marriageContractHijriDate: family.marriageContract.hijriDate,
    marriageContractPlace: family.marriageContract.place,
    marriageContractDescription: family.marriageContract.description,
    marriageContractNotes: family.marriageContract.notes,
    marriageDate: family.marriage.date,
    marriageHijriDate: family.marriage.hijriDate,
    marriagePlace: family.marriage.place,
    marriageDescription: family.marriage.description,
    marriageNotes: family.marriage.notes,
    isDivorced: family.isDivorced,
    divorceDate: family.divorce.date,
    divorceHijriDate: family.divorce.hijriDate,
    divorcePlace: family.divorce.place,
    divorceDescription: family.divorce.description,
    divorceNotes: family.divorce.notes,
  };
  if (family.marriageContract.placeId !== undefined) result.marriageContractPlaceId = family.marriageContract.placeId;
  if (family.marriage.placeId !== undefined) result.marriagePlaceId = family.marriage.placeId;
  if (family.divorce.placeId !== undefined) result.divorcePlaceId = family.divorce.placeId;
  return result;
}

/** Serialize IndividualFormData to API payload (empty strings → null) */
export function serializeIndividualForm(formData: {
  givenName: string; surname: string; sex: string;
  birthDate: string; birthPlace: string; birthPlaceId?: string | null; birthDescription: string; birthNotes: string; birthHijriDate: string;
  deathDate: string; deathPlace: string; deathPlaceId?: string | null; deathDescription: string; deathNotes: string; deathHijriDate: string;
  kunya?: string;
  isDeceased: boolean; isPrivate: boolean; notes: string;
}): Record<string, unknown> {
  return {
    givenName: formData.givenName || null,
    surname: formData.surname || null,
    sex: formData.sex || null,
    birthDate: formData.birthDate || null,
    birthPlace: formData.birthPlace || null,
    birthPlaceId: formData.birthPlaceId ?? null,
    birthDescription: formData.birthDescription || null,
    birthNotes: formData.birthNotes || null,
    birthHijriDate: formData.birthHijriDate || null,
    deathDate: formData.deathDate || null,
    deathPlace: formData.deathPlace || null,
    deathPlaceId: formData.deathPlaceId ?? null,
    deathDescription: formData.deathDescription || null,
    deathNotes: formData.deathNotes || null,
    deathHijriDate: formData.deathHijriDate || null,
    kunya: formData.kunya || null,
    isDeceased: formData.isDeceased,
    isPrivate: formData.isPrivate,
    notes: formData.notes || null,
  };
}

/** Build exclude set for link-existing-spouse picker: self + existing spouses + pointed */
export function getSpouseExcludeIds(person: Individual, data: GedcomData): Set<string> {
  const excluded = new Set<string>();

  // Self
  excluded.add(person.id);

  // Existing spouses from all families
  for (const famId of person.familiesAsSpouse) {
    const family = data.families[famId];
    if (!family) continue;
    const spouseId = family.husband === person.id ? family.wife : family.husband;
    if (spouseId) excluded.add(spouseId);
  }

  // Pointed individuals (read-only from branch pointers)
  for (const ind of Object.values(data.individuals)) {
    if (ind._pointed) excluded.add(ind.id);
  }

  return excluded;
}

/** Get sex filter for spouse picker: opposite sex, or undefined if unknown */
export function getSexFilterForSpouse(person: Individual): 'M' | 'F' | undefined {
  if (person.sex === 'M') return 'F';
  if (person.sex === 'F') return 'M';
  return undefined;
}

/** Get families for family picker with spouse names */
export function getFamiliesForPicker(
  person: Individual,
  data: GedcomData,
): Array<{ familyId: string; spouseName: string | null }> {
  return person.familiesAsSpouse.map((familyId) => {
    const family = data.families[familyId];
    if (!family) return { familyId, spouseName: null };
    const spouseId = family.husband === person.id ? family.wife : family.husband;
    const spouse = spouseId ? data.individuals[spouseId] : null;
    return {
      familyId,
      spouseName: spouse ? getDisplayName(spouse) : null,
    };
  });
}
