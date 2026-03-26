import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TreeProvider, useTree } from '@/context/TreeContext';
import type { ReactNode } from 'react';
import type { GedcomData, Individual, Family } from '@/lib/gedcom/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const wrapper = ({ children }: { children: ReactNode }) => (
  <TreeProvider>{children}</TreeProvider>
);

function makeIndividual(overrides: Partial<Individual> & { id: string }): Individual {
  return {
    type: 'INDI',
    name: overrides.id,
    givenName: overrides.id,
    surname: '',
    sex: 'M',
    birth: '',
    birthPlace: '',
    birthDescription: '',
    birthNotes: '',
    birthHijriDate: '',
    death: '',
    deathPlace: '',
    deathDescription: '',
    deathNotes: '',
    deathHijriDate: '',
    notes: '',
    isDeceased: false,
    isPrivate: false,
    familiesAsSpouse: [],
    familyAsChild: null,
    ...overrides,
  };
}

const EMPTY_EVENT = { date: '', hijriDate: '', place: '', description: '', notes: '' };

function makeFamily(overrides: Partial<Family> & { id: string }): Family {
  return {
    type: 'FAM',
    husband: null,
    wife: null,
    children: [],
    marriageContract: EMPTY_EVENT,
    marriage: EMPTY_EVENT,
    divorce: EMPTY_EVENT,
    isDivorced: false,
    ...overrides,
  };
}

function buildSimpleTreeData(): GedcomData {
  return {
    individuals: {
      '@ROOT@': makeIndividual({
        id: '@ROOT@',
        name: 'Root',
        familiesAsSpouse: ['@F1@'],
      }),
      '@CHILD@': makeIndividual({
        id: '@CHILD@',
        name: 'Child',
        familyAsChild: '@F1@',
      }),
    },
    families: {
      '@F1@': makeFamily({
        id: '@F1@',
        husband: '@ROOT@',
        children: ['@CHILD@'],
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests: spouseFamilySidebarPersonId state in TreeContext
// ---------------------------------------------------------------------------

describe('TreeContext - spouseFamilySidebarPersonId', () => {
  it('initializes spouseFamilySidebarPersonId as null', () => {
    const { result } = renderHook(() => useTree(), { wrapper });
    expect(result.current.spouseFamilySidebarPersonId).toBeNull();
  });

  it('setSpouseFamilySidebarPersonId stores the provided ID', () => {
    const { result } = renderHook(() => useTree(), { wrapper });

    act(() => {
      result.current.setSpouseFamilySidebarPersonId('@SPOUSE1@');
    });

    expect(result.current.spouseFamilySidebarPersonId).toBe('@SPOUSE1@');
  });

  it('setSpouseFamilySidebarPersonId(null) clears a previously set ID', () => {
    const { result } = renderHook(() => useTree(), { wrapper });

    act(() => {
      result.current.setSpouseFamilySidebarPersonId('@SPOUSE1@');
    });
    expect(result.current.spouseFamilySidebarPersonId).toBe('@SPOUSE1@');

    act(() => {
      result.current.setSpouseFamilySidebarPersonId(null);
    });
    expect(result.current.spouseFamilySidebarPersonId).toBeNull();
  });

  it('auto-clears spouseFamilySidebarPersonId when selectedRootId changes', () => {
    const { result } = renderHook(() => useTree(), { wrapper });

    // Load data so we have a selectedRootId
    act(() => {
      result.current.setData(buildSimpleTreeData());
    });

    // Open the spouse sidebar with a person that exists in the data
    act(() => {
      result.current.setSpouseFamilySidebarPersonId('@CHILD@');
    });
    expect(result.current.spouseFamilySidebarPersonId).toBe('@CHILD@');

    // Change the root
    act(() => {
      result.current.setSelectedRootId('@CHILD@');
    });

    // The sidebar should auto-clear
    expect(result.current.spouseFamilySidebarPersonId).toBeNull();
  });

  it('does not clear spouseFamilySidebarPersonId when selectedRootId is set to same value', () => {
    const { result } = renderHook(() => useTree(), { wrapper });

    // Load data
    act(() => {
      result.current.setData(buildSimpleTreeData());
    });

    const currentRoot = result.current.selectedRootId;

    // Open sidebar with a person that exists in the data
    act(() => {
      result.current.setSpouseFamilySidebarPersonId('@CHILD@');
    });

    // Set root to the same value
    act(() => {
      result.current.setSelectedRootId(currentRoot);
    });

    // Sidebar should remain open since the root did not actually change
    expect(result.current.spouseFamilySidebarPersonId).toBe('@CHILD@');
  });

  it('setSpouseFamilySidebarPersonId is referentially stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useTree(), { wrapper });
    const firstRef = result.current.setSpouseFamilySidebarPersonId;

    act(() => {
      result.current.setSearchQuery('test');
    });
    rerender();

    expect(result.current.setSpouseFamilySidebarPersonId).toBe(firstRef);
  });

  it('auto-clears when spouseFamilySidebarPersonId points to nonexistent individual', () => {
    const { result } = renderHook(() => useTree(), { wrapper });

    // Load data
    act(() => {
      result.current.setData(buildSimpleTreeData());
    });

    // Set sidebar to a person that does not exist in data
    act(() => {
      result.current.setSpouseFamilySidebarPersonId('@NONEXISTENT@');
    });

    // Should be reset to null as a guard
    expect(result.current.spouseFamilySidebarPersonId).toBeNull();
  });
});
