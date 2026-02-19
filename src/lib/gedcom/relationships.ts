import type { Individual, GedcomData } from './types';

export interface PersonRelationships {
  parents: Individual[];
  siblings: Individual[];
  spouses: Individual[];
  children: Individual[];
}

export function getPersonRelationships(
  data: GedcomData,
  personId: string
): PersonRelationships {
  const { individuals, families } = data;
  const person = individuals[personId];

  const parents: Individual[] = [];
  const siblings: Individual[] = [];
  const spouses: Individual[] = [];
  const children: Individual[] = [];

  if (!person) {
    return { parents, siblings, spouses, children };
  }

  // Parents & siblings from familyAsChild
  if (person.familyAsChild) {
    const family = families[person.familyAsChild];
    if (family) {
      if (family.husband && individuals[family.husband]) {
        parents.push(individuals[family.husband]);
      }
      if (family.wife && individuals[family.wife]) {
        parents.push(individuals[family.wife]);
      }
      for (const childId of family.children) {
        if (childId !== personId && individuals[childId]) {
          siblings.push(individuals[childId]);
        }
      }
    }
  }

  // Spouses & children from familiesAsSpouse
  const childIds = new Set<string>();
  for (const familyId of person.familiesAsSpouse) {
    const family = families[familyId];
    if (!family) continue;

    const spouseId = family.husband === personId ? family.wife : family.husband;
    if (spouseId && individuals[spouseId]) {
      // Avoid duplicate spouses
      if (!spouses.some((s) => s.id === spouseId)) {
        spouses.push(individuals[spouseId]);
      }
    }

    for (const childId of family.children) {
      if (!childIds.has(childId) && individuals[childId]) {
        childIds.add(childId);
        children.push(individuals[childId]);
      }
    }
  }

  return { parents, siblings, spouses, children };
}
