import { describe, it, expect } from 'vitest'
import { parseGedcom } from '@/lib/gedcom/parser'
import { getDisplayNameWithNasab, DEFAULT_NASAB_DEPTH } from '@/lib/gedcom/display'
import { findRootAncestors } from '@/lib/gedcom/roots'
import type { GedcomData } from '@/lib/gedcom/types'

describe('getDisplayNameWithNasab', () => {
  it('returns name with father using بن for male person at depth 2', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 SEX M
1 FAMC @F1@
0 @I2@ INDI
1 NAME Mohammad
1 SEX M
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
`.trim()

    const data = parseGedcom(gedcom)
    const result = getDisplayNameWithNasab(data, data.individuals['@I1@'], 2)

    expect(result).toBe('Ahmad بن Mohammad')
  })

  it('returns name with father using بنت for female person', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Fatima
1 SEX F
1 FAMC @F1@
0 @I2@ INDI
1 NAME Ali
1 SEX M
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
`.trim()

    const data = parseGedcom(gedcom)
    const result = getDisplayNameWithNasab(data, data.individuals['@I1@'], 2)

    expect(result).toBe('Fatima بنت Ali')
  })

  it('returns "Unknown" when person is null', () => {
    const data: GedcomData = { individuals: {}, families: {} }

    expect(getDisplayNameWithNasab(data, null, 2)).toBe('Unknown')
  })

  it('returns "Unknown" when person is undefined', () => {
    const data: GedcomData = { individuals: {}, families: {} }

    expect(getDisplayNameWithNasab(data, undefined, 2)).toBe('Unknown')
  })

  it('returns only person name when depth is 1', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 SEX M
1 FAMC @F1@
0 @I2@ INDI
1 NAME Mohammad
1 SEX M
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
`.trim()

    const data = parseGedcom(gedcom)
    const result = getDisplayNameWithNasab(data, data.individuals['@I1@'], 1)

    expect(result).toBe('Ahmad')
  })

  it('returns only person name when no father exists', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 SEX M
`.trim()

    const data = parseGedcom(gedcom)
    const result = getDisplayNameWithNasab(data, data.individuals['@I1@'], 2)

    expect(result).toBe('Ahmad')
  })

  it('stops traversal when circular family reference detected', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 SEX M
1 FAMC @F1@
0 @I2@ INDI
1 NAME Mohammad
1 SEX M
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
0 @F2@ FAM
1 HUSB @I1@
1 CHIL @I2@
`.trim()

    const data = parseGedcom(gedcom)
    const result = getDisplayNameWithNasab(data, data.individuals['@I1@'], 0)

    expect(result).toBe('Ahmad بن Mohammad')
  })

  it('returns multi-generation nasab chain at depth 3', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 SEX M
1 FAMC @F1@
0 @I2@ INDI
1 NAME Mohammad
1 SEX M
1 FAMC @F2@
0 @I3@ INDI
1 NAME Saeed
1 SEX M
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
0 @F2@ FAM
1 HUSB @I3@
1 CHIL @I2@
`.trim()

    const data = parseGedcom(gedcom)
    const result = getDisplayNameWithNasab(data, data.individuals['@I1@'], 3)

    expect(result).toBe('Ahmad بن Mohammad بن Saeed')
  })

  it('uses بن as default connector when sex is unknown', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 FAMC @F1@
0 @I2@ INDI
1 NAME Mohammad
1 SEX M
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
`.trim()

    const data = parseGedcom(gedcom)
    const result = getDisplayNameWithNasab(data, data.individuals['@I1@'], 2)

    expect(result).toBe('Ahmad بن Mohammad')
  })

  it('returns full chain when depth is 0 (infinite)', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 SEX M
1 FAMC @F1@
0 @I2@ INDI
1 NAME Mohammad
1 SEX M
1 FAMC @F2@
0 @I3@ INDI
1 NAME Saeed
1 SEX M
1 FAMC @F3@
0 @I4@ INDI
1 NAME Abdullah
1 SEX M
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
0 @F2@ FAM
1 HUSB @I3@
1 CHIL @I2@
0 @F3@ FAM
1 HUSB @I4@
1 CHIL @I3@
`.trim()

    const data = parseGedcom(gedcom)
    const result = getDisplayNameWithNasab(data, data.individuals['@I1@'], 0)

    expect(result).toBe('Ahmad بن Mohammad بن Saeed بن Abdullah')
  })

  it('uses name field when givenName is empty', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 SEX M
`.trim()

    const data = parseGedcom(gedcom)
    const result = getDisplayNameWithNasab(data, data.individuals['@I1@'], 2)

    expect(result).toBe('Ahmad')
  })

  it('includes surname only once at the end of the chain', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Bassel /Saeed/
2 GIVN Bassel
2 SURN Saeed
1 SEX M
1 FAMC @F1@
0 @I2@ INDI
1 NAME Abdulnasser /Saeed/
2 GIVN Abdulnasser
2 SURN Saeed
1 SEX M
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
`.trim()

    const data = parseGedcom(gedcom)
    const result = getDisplayNameWithNasab(data, data.individuals['@I1@'], 2)

    // Surname should appear only once at the end, not repeated for each person
    expect(result).toBe('Bassel بن Abdulnasser Saeed')
  })
})

describe('rootsList nasab integration', () => {
  it('rootsList text includes nasab chain when root has a known father', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 SEX M
1 FAMC @F1@
1 FAMS @F2@
0 @I2@ INDI
1 NAME Mohammad
1 SEX M
0 @I3@ INDI
1 NAME Child
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
0 @F2@ FAM
1 HUSB @I1@
1 CHIL @I3@
`.trim()
    const data = parseGedcom(gedcom)

    const allRoots = findRootAncestors(data).map((person) => ({
      id: person.id,
      text: getDisplayNameWithNasab(data, person, DEFAULT_NASAB_DEPTH),
    }))

    const entry = allRoots.find((r) => r.id === '@I1@')
    expect(entry?.text).toBe('Ahmad بن Mohammad')
  })

  it('rootsList text contains person name when root has no father', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME Child
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
`.trim()
    const data = parseGedcom(gedcom)

    const allRoots = findRootAncestors(data).map((person) => ({
      id: person.id,
      text: getDisplayNameWithNasab(data, person, DEFAULT_NASAB_DEPTH),
    }))

    const entry = allRoots.find((r) => r.id === '@I1@')
    expect(entry?.text).toBe('Ahmad')
  })

  it('rootsList text appends birth year after nasab name', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 SEX M
1 BIRT
2 DATE 1900
1 FAMC @F1@
1 FAMS @F2@
0 @I2@ INDI
1 NAME Mohammad
1 SEX M
0 @I3@ INDI
1 NAME Child
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
0 @F2@ FAM
1 HUSB @I1@
1 CHIL @I3@
`.trim()
    const data = parseGedcom(gedcom)

    const person = data.individuals['@I1@']
    const text =
      getDisplayNameWithNasab(data, person, DEFAULT_NASAB_DEPTH) +
      (person.birth ? ` (${person.birth})` : '')

    expect(text).toBe('Ahmad بن Mohammad (1900)')
  })
})
