import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseGedcom } from '@/lib/gedcom/parser'
import { getAllDescendants, getTreeVisibleIndividuals } from '@/lib/gedcom/graph'
import { findDefaultRoot } from '@/lib/gedcom/roots'
import type { GedcomData } from '@/lib/gedcom/types'

describe('getAllDescendants', () => {
  let realData: GedcomData

  beforeAll(() => {
    const gedcomPath = join(__dirname, 'fixtures/saeed-family.ged')
    const gedcomText = readFileSync(gedcomPath, 'utf-8')
    realData = parseGedcom(gedcomText)
  })

  it('real GEDCOM tree shows 177 visible individuals from default root', () => {
    const root = findDefaultRoot(realData)
    const visible = getTreeVisibleIndividuals(realData, root!.id, true)
    expect(visible.size).toBe(177)
  })

  it('finds direct children', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Father
1 FAMS @F1@
0 @I2@ INDI
1 NAME Child1
1 FAMC @F1@
0 @I3@ INDI
1 NAME Child2
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
1 CHIL @I3@
`.trim()

    const data = parseGedcom(gedcom)
    const descendants = getAllDescendants(data, '@I1@')

    expect(descendants.size).toBe(2)
    expect(descendants.has('@I2@')).toBe(true)
    expect(descendants.has('@I3@')).toBe(true)
    expect(descendants.has('@I1@')).toBe(false)
  })

  it('finds grandchildren', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Grandpa
1 FAMS @F1@
0 @I2@ INDI
1 NAME Father
1 FAMC @F1@
1 FAMS @F2@
0 @I3@ INDI
1 NAME Grandchild
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
0 @F2@ FAM
1 HUSB @I2@
1 CHIL @I3@
`.trim()

    const data = parseGedcom(gedcom)
    const descendants = getAllDescendants(data, '@I1@')

    expect(descendants.size).toBe(2)
    expect(descendants.has('@I2@')).toBe(true)
    expect(descendants.has('@I3@')).toBe(true)
  })

  it('finds children from multiple spouses', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Father
1 FAMS @F1@
1 FAMS @F2@
0 @I2@ INDI
1 NAME Wife1
1 FAMS @F1@
0 @I3@ INDI
1 NAME Wife2
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
    const descendants = getAllDescendants(data, '@I1@')

    expect(descendants.size).toBe(2)
    expect(descendants.has('@I4@')).toBe(true)
    expect(descendants.has('@I5@')).toBe(true)
  })

  it('returns empty set for person with no children', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Childless
`.trim()

    const data = parseGedcom(gedcom)
    const descendants = getAllDescendants(data, '@I1@')

    expect(descendants.size).toBe(0)
  })
})
