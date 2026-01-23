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
          isDeceased: false,
          isPrivate: false,
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
            const rawName = value || '';
            const parsedName = rawName.replace(/\//g, '').trim();
            indi.name = parsedName;
            // Extract givenName and surname from NAME line format: "GivenName /Surname/"
            const surnameMatch = rawName.match(/\/([^/]*)\//)
            if (surnameMatch) {
              indi.surname = surnameMatch[1].trim();
              indi.givenName = rawName.substring(0, rawName.indexOf('/')).trim();
            }
            // Check if name indicates a private individual
            if (parsedName.toUpperCase() === 'PRIVATE' || parsedName.toLowerCase() === 'private') {
              indi.isPrivate = true;
            }
          } else if (tag === 'SEX') {
            indi.sex = value === 'M' ? 'M' : value === 'F' ? 'F' : null;
          } else if (tag === 'DEAT') {
            indi.isDeceased = true;
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
