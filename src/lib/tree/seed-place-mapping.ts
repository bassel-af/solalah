import type { GedcomData, Individual, Family, FamilyEvent } from '../gedcom/types'

// ---------------------------------------------------------------------------
// English GEDCOM place string -> Arabic city name mapping
// ---------------------------------------------------------------------------

/**
 * Known English GEDCOM place strings mapped to their Arabic city names.
 * Keys are the full GEDCOM place string (or a recognizable prefix).
 */
const ENGLISH_PLACE_MAP: Record<string, string> = {
  'Mecca,,Makkah,Saudi Arabia': 'مكة المكرمة',
  'Medina,,Al Madīnah,Saudi Arabia': 'المدينة المنورة',
  'Damascus,,,': 'دمشق',
  'Amman,,Amman,Jordan': 'عمّان',
  'Idlib,,Idlib,Syria': 'إدلب',
  'Jazrāyā,,Aleppo,Syria': 'جزرايا',
  "Yanbu' al Baḩr,,Al Madīnah,Saudi Arabia": 'ينبع',
  ',,,,China': 'الصين',
}

/**
 * Arabic GEDCOM place strings that need normalization.
 * Keys are the full GEDCOM place string; values are the normalized Arabic name.
 */
const ARABIC_NORMALIZATION_MAP: Record<string, string> = {
  'اسطنبول,اسطنبول,تركيا': 'إسطنبول',
}

// ---------------------------------------------------------------------------
// mapGedcomPlaceToArabic
// ---------------------------------------------------------------------------

/**
 * Converts a GEDCOM place string to a clean Arabic city name.
 *
 * Strategy:
 * 1. Check the English place map for a direct match.
 * 2. Check the Arabic normalization map for a direct match.
 * 3. For Arabic strings: extract the first non-empty comma-separated part (city name).
 * 4. For country-only entries (all leading parts empty): use the last non-empty part.
 * 5. Returns empty string for empty input.
 */
export function mapGedcomPlaceToArabic(gedcomPlace: string): string {
  if (!gedcomPlace) return ''

  // Strip any Unicode directional marks for matching
  const cleaned = gedcomPlace.replace(/[\u200E\u200F\u200B]/g, '')

  // 1. Direct English match
  if (ENGLISH_PLACE_MAP[cleaned]) {
    return ENGLISH_PLACE_MAP[cleaned]
  }

  // 2. Direct Arabic normalization match
  if (ARABIC_NORMALIZATION_MAP[cleaned]) {
    return ARABIC_NORMALIZATION_MAP[cleaned]
  }

  // 3. Split by comma and find the first non-empty part (city)
  const parts = cleaned.split(',').map((p) => p.trim())
  const firstNonEmpty = parts.find((p) => p.length > 0)

  if (firstNonEmpty) {
    return firstNonEmpty
  }

  return ''
}

// ---------------------------------------------------------------------------
// resolveGedcomPlaces
// ---------------------------------------------------------------------------

/**
 * Processes a GedcomData object, replacing GEDCOM place strings with
 * Arabic city names and resolving placeId from a lookup map.
 *
 * Does NOT mutate the original data — returns a new GedcomData.
 *
 * @param data - The parsed GEDCOM data
 * @param placeNameToId - Map from Arabic city name to Place UUID
 */
export function resolveGedcomPlaces(
  data: GedcomData,
  placeNameToId: Map<string, string>,
): GedcomData {
  const individuals: Record<string, Individual> = {}
  for (const [id, ind] of Object.entries(data.individuals)) {
    individuals[id] = resolveIndividualPlaces(ind, placeNameToId)
  }

  const families: Record<string, Family> = {}
  for (const [id, fam] of Object.entries(data.families)) {
    families[id] = resolveFamilyPlaces(fam, placeNameToId)
  }

  return { individuals, families }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resolveIndividualPlaces(
  ind: Individual,
  placeNameToId: Map<string, string>,
): Individual {
  const result = { ...ind }

  if (ind.birthPlace) {
    const arabicName = mapGedcomPlaceToArabic(ind.birthPlace)
    result.birthPlace = arabicName
    const placeId = placeNameToId.get(arabicName)
    if (placeId) {
      result.birthPlaceId = placeId
    }
  }

  if (ind.deathPlace) {
    const arabicName = mapGedcomPlaceToArabic(ind.deathPlace)
    result.deathPlace = arabicName
    const placeId = placeNameToId.get(arabicName)
    if (placeId) {
      result.deathPlaceId = placeId
    }
  }

  return result
}

function resolveEventPlace(
  event: FamilyEvent,
  placeNameToId: Map<string, string>,
): FamilyEvent {
  if (!event.place) return event

  const arabicName = mapGedcomPlaceToArabic(event.place)
  const result = { ...event, place: arabicName }
  const placeId = placeNameToId.get(arabicName)
  if (placeId) {
    result.placeId = placeId
  }
  return result
}

function resolveFamilyPlaces(
  fam: Family,
  placeNameToId: Map<string, string>,
): Family {
  return {
    ...fam,
    marriageContract: resolveEventPlace(fam.marriageContract, placeNameToId),
    marriage: resolveEventPlace(fam.marriage, placeNameToId),
    divorce: resolveEventPlace(fam.divorce, placeNameToId),
  }
}
