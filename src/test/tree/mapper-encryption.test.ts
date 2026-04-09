/**
 * Phase 10b: verifies dbTreeToGedcomData decrypts encrypted Individual /
 * Family / RadaFamily fields before returning plaintext GedcomData.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import {
  generateWorkspaceKey,
  encryptFieldNullable,
} from '@/lib/crypto/workspace-encryption';
import { dbTreeToGedcomData, type DbTree } from '@/lib/tree/mapper';

let key: Buffer;

beforeAll(() => {
  key = generateWorkspaceKey();
});

function encIndividual(fields: Record<string, string | null>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = encryptFieldNullable(v, key);
  }
  return out;
}

describe('dbTreeToGedcomData — encrypted rows', () => {
  test('decrypts Individual fields and yields GedcomData with plaintext strings', () => {
    const dbTree = {
      id: 'tree-1',
      workspaceId: 'ws-1',
      individuals: [
        {
          id: 'ind-1',
          treeId: 'tree-1',
          gedcomId: null,
          sex: 'M',
          isDeceased: false,
          isPrivate: false,
          createdById: null,
          updatedAt: new Date(),
          createdAt: new Date(),
          birthPlaceId: null,
          deathPlaceId: null,
          birthPlaceRef: null,
          deathPlaceRef: null,
          ...encIndividual({
            givenName: 'أحمد',
            surname: 'الشربك',
            fullName: null,
            birthDate: '1990-01-01',
            birthHijriDate: null,
            birthPlace: 'دمشق',
            birthDescription: null,
            birthNotes: null,
            deathDate: null,
            deathHijriDate: null,
            deathPlace: null,
            deathDescription: null,
            deathNotes: null,
            kunya: 'أبو محمد',
            notes: 'patriarch',
          }),
        },
      ],
      families: [],
    } as unknown as DbTree;

    const data = dbTreeToGedcomData(dbTree, key);

    const ind = data.individuals['ind-1'];
    expect(ind).toBeDefined();
    expect(ind.givenName).toBe('أحمد');
    expect(ind.surname).toBe('الشربك');
    expect(ind.name).toBe('أحمد الشربك');
    expect(ind.birth).toBe('1990-01-01');
    expect(ind.birthPlace).toBe('دمشق');
    expect(ind.kunya).toBe('أبو محمد');
    expect(ind.notes).toBe('patriarch');
    expect(ind.sex).toBe('M');
    expect(ind.isPrivate).toBe(false);
    expect(ind.death).toBe('');
  });

  test('decrypts Family event fields', () => {
    const dbTree = {
      id: 'tree-1',
      workspaceId: 'ws-1',
      individuals: [
        {
          id: 'h-1',
          treeId: 'tree-1',
          gedcomId: null,
          sex: 'M',
          isDeceased: false,
          isPrivate: false,
          createdById: null,
          updatedAt: new Date(),
          createdAt: new Date(),
          birthPlaceId: null,
          deathPlaceId: null,
          birthPlaceRef: null,
          deathPlaceRef: null,
          ...encIndividual({
            givenName: 'عبد الله',
            surname: null,
            fullName: null,
            birthDate: null,
            birthHijriDate: null,
            birthPlace: null,
            birthDescription: null,
            birthNotes: null,
            deathDate: null,
            deathHijriDate: null,
            deathPlace: null,
            deathDescription: null,
            deathNotes: null,
            kunya: null,
            notes: null,
          }),
        },
      ],
      families: [
        {
          id: 'fam-1',
          treeId: 'tree-1',
          gedcomId: null,
          husbandId: 'h-1',
          wifeId: null,
          children: [],
          marriageContractPlaceId: null,
          marriagePlaceId: null,
          divorcePlaceId: null,
          marriageContractPlaceRef: null,
          marriagePlaceRef: null,
          divorcePlaceRef: null,
          isUmmWalad: false,
          isDivorced: false,
          marriageContractDate: null,
          marriageContractHijriDate: null,
          marriageContractPlace: null,
          marriageContractDescription: null,
          marriageContractNotes: null,
          marriageDate: encryptFieldNullable('1980-06-15', key),
          marriageHijriDate: null,
          marriagePlace: encryptFieldNullable('Aleppo', key),
          marriageDescription: null,
          marriageNotes: encryptFieldNullable('big wedding', key),
          divorceDate: null,
          divorceHijriDate: null,
          divorcePlace: null,
          divorceDescription: null,
          divorceNotes: null,
        },
      ],
    } as unknown as DbTree;

    const data = dbTreeToGedcomData(dbTree, key);
    const fam = data.families['fam-1'];
    expect(fam).toBeDefined();
    expect(fam.husband).toBe('h-1');
    expect(fam.marriage.date).toBe('1980-06-15');
    expect(fam.marriage.place).toBe('Aleppo');
    expect(fam.marriage.notes).toBe('big wedding');
    expect(fam.divorce.date).toBe('');
  });

  test('decrypts RadaFamily notes', () => {
    const dbTree = {
      id: 'tree-1',
      workspaceId: 'ws-1',
      individuals: [],
      families: [],
      radaFamilies: [
        {
          id: 'rada-1',
          treeId: 'tree-1',
          gedcomId: null,
          fosterFatherId: 'f-1',
          fosterMotherId: 'm-1',
          createdAt: new Date(),
          children: [{ radaFamilyId: 'rada-1', individualId: 'c-1' }],
          notes: encryptFieldNullable('milk kinship note', key),
        },
      ],
    } as unknown as DbTree;

    const data = dbTreeToGedcomData(dbTree, key);
    const rada = data.radaFamilies?.['rada-1'];
    expect(rada).toBeDefined();
    expect(rada?.notes).toBe('milk kinship note');
    expect(rada?.fosterFather).toBe('f-1');
  });

  test('wrong key causes mapping to throw (fails closed on tampered data)', () => {
    const wrongKey = generateWorkspaceKey();
    const dbTree = {
      id: 'tree-1',
      workspaceId: 'ws-1',
      individuals: [
        {
          id: 'ind-1',
          treeId: 'tree-1',
          gedcomId: null,
          sex: null,
          isDeceased: false,
          isPrivate: false,
          createdById: null,
          updatedAt: new Date(),
          createdAt: new Date(),
          birthPlaceId: null,
          deathPlaceId: null,
          birthPlaceRef: null,
          deathPlaceRef: null,
          ...encIndividual({
            givenName: 'أحمد',
            surname: null,
            fullName: null,
            birthDate: null,
            birthHijriDate: null,
            birthPlace: null,
            birthDescription: null,
            birthNotes: null,
            deathDate: null,
            deathHijriDate: null,
            deathPlace: null,
            deathDescription: null,
            deathNotes: null,
            kunya: null,
            notes: null,
          }),
        },
      ],
      families: [],
    } as unknown as DbTree;

    expect(() => dbTreeToGedcomData(dbTree, wrongKey)).toThrow();
  });
});
