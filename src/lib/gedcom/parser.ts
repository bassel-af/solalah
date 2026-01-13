import type { Individual, Family, GedcomData } from './types';

export function parseGedcom(text: string): GedcomData {
  const lines = text.split(/\r\n|\r|\n/);
  const individuals: Record<string, Individual> = {};
  const families: Record<string, Family> = {};
  let currentRecord: Individual | Family | null = null;
  let currentSubRecord: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s+/);
    const level = parseInt(parts[0]);

    if (isNaN(level)) continue;

    let id: string | null = null;
    let tag: string | null = null;
    let value: string | null = null;

    if (parts[1] && parts[1].startsWith('@') && parts[1].endsWith('@')) {
      id = parts[1];
      tag = parts[2];
      value = parts.slice(3).join(' ');
    } else {
      tag = parts[1];
      value = parts.slice(2).join(' ');
    }

    if (level === 0) {
      currentSubRecord = null;
      if (tag === 'INDI' && id) {
        currentRecord = {
          id,
          type: 'INDI',
          name: '',
          givenName: '',
          surname: '',
          sex: null,
          birth: '',
          death: '',
          familiesAsSpouse: [],
          familyAsChild: null,
        };
        individuals[id] = currentRecord;
      } else if (tag === 'FAM' && id) {
        currentRecord = {
          id,
          type: 'FAM',
          husband: null,
          wife: null,
          children: [],
        };
        families[id] = currentRecord;
      } else {
        currentRecord = null;
      }
    } else if (currentRecord) {
      if (level === 1) {
        currentSubRecord = tag;
        if (currentRecord.type === 'INDI') {
          const indi = currentRecord as Individual;
          if (tag === 'NAME') {
            indi.name = (value || '').replace(/\//g, '').trim();
          } else if (tag === 'SEX') {
            indi.sex = value === 'M' ? 'M' : value === 'F' ? 'F' : null;
          } else if (tag === 'FAMS' && value) {
            indi.familiesAsSpouse.push(value);
          } else if (tag === 'FAMC' && value) {
            indi.familyAsChild = value;
          }
        } else if (currentRecord.type === 'FAM') {
          const fam = currentRecord as Family;
          if (tag === 'HUSB') {
            fam.husband = value || null;
          } else if (tag === 'WIFE') {
            fam.wife = value || null;
          } else if (tag === 'CHIL' && value) {
            fam.children.push(value);
          }
        }
      } else if (level === 2) {
        if (currentRecord.type === 'INDI') {
          const indi = currentRecord as Individual;
          if (currentSubRecord === 'NAME') {
            if (tag === 'GIVN') {
              indi.givenName = value || '';
            } else if (tag === 'SURN') {
              indi.surname = value || '';
            }
          } else if (tag === 'DATE') {
            if (currentSubRecord === 'BIRT') {
              indi.birth = value || '';
            } else if (currentSubRecord === 'DEAT') {
              indi.death = value || '';
            }
          }
        }
      }
    }
  }

  return { individuals, families };
}

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

export function findRootAncestors(data: GedcomData): Individual[] {
  const { individuals } = data;
  const roots: Individual[] = [];

  for (const id in individuals) {
    const person = individuals[id];
    if (!person.familyAsChild) {
      if (person.familiesAsSpouse.length > 0) {
        roots.push(person);
      }
    }
  }

  roots.sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
  return roots;
}
