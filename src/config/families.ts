export interface FamilyConfig {
  slug: string;
  rootId: string; // GEDCOM ID like "@I123@"
  displayName: string; // Arabic name for metadata
  gedcomFile: string; // Path to GEDCOM file (e.g., "/saeed-family.ged")
}

export const FAMILIES: Record<string, FamilyConfig> = {
  'saeed': {
    slug: 'saeed',
    rootId: '@4709420@',
    displayName: 'آل سعيّد',
    gedcomFile: '/saeed-family.ged',
  },
  'al-dabbagh': {
    slug: 'al-dabbagh',
    rootId: '@72557920@',
    displayName: 'آل الدباغ',
    gedcomFile: '/saeed-family.ged',
  },
  'al-dalati': {
    slug: 'al-dalati',
    rootId: '@37458008@',
    displayName: 'آل الدالاتي',
    gedcomFile: '/saeed-family.ged',
  },
  'sharbek': {
    slug: 'sharbek',
    rootId: '@29570448@',
    displayName: 'آل شربك',
    gedcomFile: '/saeed-family.ged',
  },
  test: {
    slug: 'test',
    rootId: '@I1@',
    displayName: 'عائلة اختبار',
    gedcomFile: '/test-family.ged',
  },
};

export function getFamilyBySlug(slug: string): FamilyConfig | undefined {
  return FAMILIES[slug.toLowerCase()];
}

export function isValidFamilySlug(slug: string): boolean {
  return slug.toLowerCase() in FAMILIES;
}

export function getAllFamilySlugs(): string[] {
  return Object.keys(FAMILIES);
}
