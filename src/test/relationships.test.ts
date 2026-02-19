import { describe, it, expect } from 'vitest'
import { parseGedcom } from '@/lib/gedcom/parser'
import { getPersonRelationships } from '@/lib/gedcom/relationships'

describe('getPersonRelationships', () => {
  it('returns all four relationship categories for a complete family', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Father
1 SEX M
1 FAMS @F1@
1 FAMC @F0@
0 @I2@ INDI
1 NAME Mother
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME Child1
1 SEX M
1 FAMC @F1@
0 @I4@ INDI
1 NAME Child2
1 SEX F
1 FAMC @F1@
0 @I5@ INDI
1 NAME Grandfather
1 SEX M
1 FAMS @F0@
0 @I6@ INDI
1 NAME Grandmother
1 SEX F
1 FAMS @F0@
0 @I7@ INDI
1 NAME Uncle
1 SEX M
1 FAMC @F0@
0 @F0@ FAM
1 HUSB @I5@
1 WIFE @I6@
1 CHIL @I1@
1 CHIL @I7@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 CHIL @I4@
`.trim()

    const data = parseGedcom(gedcom)
    const rel = getPersonRelationships(data, '@I1@')

    // Parents: Grandfather and Grandmother
    expect(rel.parents.map((p) => p.id)).toEqual(['@I5@', '@I6@'])

    // Siblings: Uncle
    expect(rel.siblings.map((p) => p.id)).toEqual(['@I7@'])

    // Spouses: Mother
    expect(rel.spouses.map((p) => p.id)).toEqual(['@I2@'])

    // Children: Child1 and Child2
    expect(rel.children.map((p) => p.id)).toEqual(['@I3@', '@I4@'])
  })

  it('excludes subject from their own sibling list', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Sibling1
1 FAMC @F1@
0 @I2@ INDI
1 NAME Sibling2
1 FAMC @F1@
0 @I3@ INDI
1 NAME Sibling3
1 FAMC @F1@
0 @F1@ FAM
1 CHIL @I1@
1 CHIL @I2@
1 CHIL @I3@
`.trim()

    const data = parseGedcom(gedcom)
    const rel = getPersonRelationships(data, '@I2@')

    expect(rel.siblings.map((p) => p.id)).toEqual(['@I1@', '@I3@'])
    expect(rel.siblings.some((p) => p.id === '@I2@')).toBe(false)
  })

  it('collects children from multiple spouses without duplicates', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Father
1 SEX M
1 FAMS @F1@
1 FAMS @F2@
0 @I2@ INDI
1 NAME Wife1
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME Wife2
1 SEX F
1 FAMS @F2@
0 @I4@ INDI
1 NAME ChildFromWife1
1 FAMC @F1@
0 @I5@ INDI
1 NAME ChildFromWife2
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I4@
0 @F2@ FAM
1 HUSB @I1@
1 WIFE @I3@
1 CHIL @I5@
`.trim()

    const data = parseGedcom(gedcom)
    const rel = getPersonRelationships(data, '@I1@')

    expect(rel.spouses).toHaveLength(2)
    expect(rel.spouses.map((p) => p.id)).toEqual(['@I2@', '@I3@'])

    expect(rel.children).toHaveLength(2)
    expect(rel.children.map((p) => p.id)).toEqual(['@I4@', '@I5@'])
  })

  it('returns empty arrays for a person with no relationships', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Loner
`.trim()

    const data = parseGedcom(gedcom)
    const rel = getPersonRelationships(data, '@I1@')

    expect(rel.parents).toEqual([])
    expect(rel.siblings).toEqual([])
    expect(rel.spouses).toEqual([])
    expect(rel.children).toEqual([])
  })
})
