import type { GedcomData, Individual } from './types';

export const DEFAULT_NASAB_DEPTH = 2;

export function getDisplayName(person: Individual | null | undefined): string {
  if (!person) return 'Unknown';

  const nameParts = person.name.split(' ').filter((p) => p);
  if (nameParts.length > 1) {
    return person.name;
  }

  if (person.givenName && person.surname) {
    return `${person.givenName} ${person.surname}`;
  }
  if (person.givenName) {
    return person.givenName;
  }
  if (person.name) {
    return person.name;
  }
  if (person.surname) {
    return person.surname;
  }

  return 'Unknown';
}

function getFather(
  data: GedcomData,
  person: Individual
): Individual | null {
  if (!person.familyAsChild) return null;
  const family = data.families[person.familyAsChild];
  if (!family?.husband) return null;
  return data.individuals[family.husband] || null;
}

/**
 * Returns a display name with Arabic nasab (patronymic chain).
 * Uses givenName for each person in the chain, with surname appended once at the end.
 *
 * @param data - The GEDCOM data containing individuals and families
 * @param person - The individual to get the name for
 * @param depth - Number of generations to include:
 *   - 1: name only (no ancestors)
 *   - 2: name + father (default)
 *   - 3: name + father + grandfather
 *   - 0: infinite (full ancestor chain)
 * @returns Formatted name with nasab, e.g., "أحمد بن محمد سعيد"
 */
export function getDisplayNameWithNasab(
  data: GedcomData,
  person: Individual | null | undefined,
  depth: number = DEFAULT_NASAB_DEPTH
): string {
  if (!person) return 'Unknown';

  if (depth === 1) {
    return getDisplayName(person);
  }

  const nameParts: string[] = [];
  const visited = new Set<string>();
  visited.add(person.id);

  // Start with the person's given name (not full name)
  nameParts.push(person.givenName || person.name || 'Unknown');

  let currentPerson: Individual | null = person;
  let lastPersonInChain: Individual = person;
  let generationsAdded = 1;
  const maxGenerations = depth === 0 ? Infinity : depth;

  while (generationsAdded < maxGenerations) {
    const father = getFather(data, currentPerson);

    if (!father) break;
    if (visited.has(father.id)) break;
    visited.add(father.id);

    const connector = currentPerson.sex === 'F' ? 'بنت' : 'بن';

    nameParts.push(connector);
    nameParts.push(father.givenName || father.name || 'Unknown');

    lastPersonInChain = father;
    currentPerson = father;
    generationsAdded++;
  }

  // Append surname once at the end (from the last person in the chain)
  const surname = lastPersonInChain.surname || person.surname;
  if (surname) {
    nameParts.push(surname);
  }

  return nameParts.join(' ');
}
