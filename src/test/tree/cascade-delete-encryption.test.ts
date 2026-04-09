/**
 * Phase 10b integration test: the cascade delete impact flow reads
 * encrypted Individual rows from the DB, decrypts them via the mapper,
 * then runs `computeDeleteImpact` against the plaintext GedcomData.
 * The returned affectedNames must be plaintext strings.
 *
 * `cascade-delete.ts` itself is a pure function over `GedcomData` — it
 * doesn't touch the crypto layer. This test exists to lock in the
 * invariant: if the upstream mapper decrypts correctly, the cascade flow
 * yields plaintext names end to end.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import {
  generateWorkspaceKey,
  encryptFieldNullable,
} from '@/lib/crypto/workspace-encryption';
import { dbTreeToGedcomData, type DbTree } from '@/lib/tree/mapper';
import { computeDeleteImpact } from '@/lib/tree/cascade-delete';

let key: Buffer;

beforeAll(() => {
  key = generateWorkspaceKey();
});

function enc(value: string | null) {
  return encryptFieldNullable(value, key);
}

/**
 * Build an encrypted DbTree with three generations:
 *   GP (grandparent, I1) — married to GM (I2, married-in)
 *     via F_GP
 *   Son (I3) is their child — married to DIL (I4, daughter-in-law, married-in)
 *     via F_SON
 *   Grandson (I5) is I3 + I4's child
 *
 * Deleting I3 strands DIL (I4) — she has no lineage connection of her own.
 * I1/I2/I5 survive because GP's lineage + the grandson all reach a root.
 */
function buildEncryptedTree(): DbTree {
  const now = new Date();
  const individualBase = {
    treeId: 'tree-1',
    gedcomId: null,
    sex: null,
    isDeceased: false,
    isPrivate: false,
    createdById: null,
    createdAt: now,
    updatedAt: now,
    birthPlaceId: null,
    deathPlaceId: null,
    birthPlaceRef: null,
    deathPlaceRef: null,
    surname: null,
    fullName: null,
    birthDate: null,
    birthPlace: null,
    birthDescription: null,
    birthNotes: null,
    birthHijriDate: null,
    deathDate: null,
    deathPlace: null,
    deathDescription: null,
    deathNotes: null,
    deathHijriDate: null,
    kunya: null,
    notes: null,
  };
  const familyBase = {
    treeId: 'tree-1',
    gedcomId: null,
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
    marriageDate: null,
    marriageHijriDate: null,
    marriagePlace: null,
    marriageDescription: null,
    marriageNotes: null,
    divorceDate: null,
    divorceHijriDate: null,
    divorcePlace: null,
    divorceDescription: null,
    divorceNotes: null,
  };

  return {
    id: 'tree-1',
    workspaceId: 'ws-1',
    individuals: [
      // Grandparents — root of the lineage
      { ...individualBase, id: 'I1', sex: 'M', givenName: enc('الجد') },
      { ...individualBase, id: 'I2', sex: 'F', givenName: enc('الجدة') },
      // Son — has familyAsChild via F_GP
      { ...individualBase, id: 'I3', sex: 'M', givenName: enc('الأب') },
      // Daughter-in-law — married-in, no lineage connection
      { ...individualBase, id: 'I4', sex: 'F', givenName: enc('الزوجة الأجنبية') },
      // Grandson — child of I3 + I4
      { ...individualBase, id: 'I5', sex: 'M', givenName: enc('الحفيد') },
    ],
    families: [
      {
        ...familyBase,
        id: 'F_GP',
        husbandId: 'I1',
        wifeId: 'I2',
        children: [{ familyId: 'F_GP', individualId: 'I3' }],
      },
      {
        ...familyBase,
        id: 'F_SON',
        husbandId: 'I3',
        wifeId: 'I4',
        children: [{ familyId: 'F_SON', individualId: 'I5' }],
      },
    ],
  } as unknown as DbTree;
}

describe('cascade delete — decrypts affected names end to end', () => {
  test('computeDeleteImpact returns plaintext affected names after mapper decryption', () => {
    const dbTree = buildEncryptedTree();
    const gedcomData = dbTreeToGedcomData(dbTree, key);

    // Deleting the mid-tree Father (I3) should strand the daughter-in-law
    // (I4) — she has no lineage connection of her own, she was married in.
    const impact = computeDeleteImpact(gedcomData, 'I3');

    expect(impact.hasImpact).toBe(true);
    expect(impact.affectedIds.has('I4')).toBe(true);

    // The critical Phase 10b assertion: affectedNames is plaintext, not ciphertext
    expect(impact.affectedNames).toContain('الزوجة الأجنبية');
    // Buffer artifacts should never appear
    for (const name of impact.affectedNames) {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });

  test('no impact when the target is a leaf with no dependents', () => {
    const dbTree = buildEncryptedTree();
    const gedcomData = dbTreeToGedcomData(dbTree, key);

    // Deleting the grandson (I5) leaves everyone else connected.
    const impact = computeDeleteImpact(gedcomData, 'I5');

    expect(impact.hasImpact).toBe(false);
    expect(impact.affectedIds.size).toBe(0);
    expect(impact.affectedNames).toEqual([]);
  });

  test('wrong workspace key causes the mapper step to throw, cascade never runs', () => {
    const dbTree = buildEncryptedTree();
    const wrongKey = generateWorkspaceKey();
    expect(() => dbTreeToGedcomData(dbTree, wrongKey)).toThrow();
  });
});
