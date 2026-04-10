import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { shouldHideBirthDate } from '@/lib/tree/birth-date-privacy';
import { useOptionalWorkspaceTree } from '@/context/WorkspaceTreeContext';
import type { Individual } from '@/lib/gedcom/types';

function makeIndividual(overrides: Partial<Individual> = {}): Individual {
  return {
    id: 'ind-1',
    type: 'INDI',
    name: 'Test Person',
    givenName: 'Test',
    surname: 'Person',
    sex: null,
    birth: '1990',
    birthPlace: 'Damascus',
    birthDescription: '',
    birthNotes: '',
    birthHijriDate: '1410',
    death: '',
    deathPlace: '',
    deathDescription: '',
    deathNotes: '',
    deathHijriDate: '',
    kunya: '',
    notes: '',
    isDeceased: false,
    isPrivate: false,
    familiesAsSpouse: [],
    familyAsChild: null,
    ...overrides,
  };
}

describe('shouldHideBirthDate', () => {
  test('returns true for female when hideBirthDateForFemale is true', () => {
    const person = makeIndividual({ sex: 'F' });
    expect(shouldHideBirthDate(person, { hideBirthDateForFemale: true })).toBe(true);
  });

  test('returns false for female when hideBirthDateForFemale is false', () => {
    const person = makeIndividual({ sex: 'F' });
    expect(shouldHideBirthDate(person, { hideBirthDateForFemale: false })).toBe(false);
  });

  test('returns true for male when hideBirthDateForMale is true', () => {
    const person = makeIndividual({ sex: 'M' });
    expect(shouldHideBirthDate(person, { hideBirthDateForMale: true })).toBe(true);
  });

  test('returns false for male when hideBirthDateForMale is false', () => {
    const person = makeIndividual({ sex: 'M' });
    expect(shouldHideBirthDate(person, { hideBirthDateForMale: false })).toBe(false);
  });

  test('returns false for female when only hideBirthDateForMale is true', () => {
    const person = makeIndividual({ sex: 'F' });
    expect(shouldHideBirthDate(person, { hideBirthDateForMale: true })).toBe(false);
  });

  test('returns false for male when only hideBirthDateForFemale is true', () => {
    const person = makeIndividual({ sex: 'M' });
    expect(shouldHideBirthDate(person, { hideBirthDateForFemale: true })).toBe(false);
  });

  test('returns false for null sex regardless of settings', () => {
    const person = makeIndividual({ sex: null });
    expect(shouldHideBirthDate(person, { hideBirthDateForFemale: true, hideBirthDateForMale: true })).toBe(false);
  });

  test('returns false when both settings are undefined', () => {
    const person = makeIndividual({ sex: 'F' });
    expect(shouldHideBirthDate(person, {})).toBe(false);
  });

  test('returns true for both sexes when both settings are true', () => {
    const male = makeIndividual({ sex: 'M' });
    const female = makeIndividual({ sex: 'F' });
    const settings = { hideBirthDateForFemale: true, hideBirthDateForMale: true };
    expect(shouldHideBirthDate(male, settings)).toBe(true);
    expect(shouldHideBirthDate(female, settings)).toBe(true);
  });
});

describe('useOptionalWorkspaceTree', () => {
  test('returns null when used outside WorkspaceTreeProvider', () => {
    const { result } = renderHook(() => useOptionalWorkspaceTree());
    expect(result.current).toBeNull();
  });
});
