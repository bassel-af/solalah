import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseGedcom } from '@/lib/gedcom/parser'
import { getTreeVisibleIndividuals, filterOutPrivate } from '@/lib/gedcom/graph'
import { findRootAncestors, findDefaultRoot } from '@/lib/gedcom/roots'
import type { GedcomData } from '@/lib/gedcom/types'

describe('Private Individual Filtering', () => {
  let data: GedcomData

  beforeAll(() => {
    const gedcomPath = join(__dirname, 'fixtures/saeed-family.ged')
    const gedcomText = readFileSync(gedcomPath, 'utf-8')
    data = parseGedcom(gedcomText)
  })

  it('marks individuals named "PRIVATE" as private', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME PRIVATE
1 SEX M
`.trim()
    const result = parseGedcom(gedcom)
    expect(result.individuals['@I1@'].isPrivate).toBe(true)
  })

  it('does NOT mark regular individuals as private', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME John /Smith/
1 SEX M
`.trim()
    const result = parseGedcom(gedcom)
    expect(result.individuals['@I1@'].isPrivate).toBe(false)
  })

  it('excludes private individuals from root ancestors list', () => {
    const roots = findRootAncestors(data)
    const hasPrivate = roots.some((r) => data.individuals[r.id].isPrivate)
    expect(hasPrivate).toBe(false)
  })

  it('filters private from tree visibility when excludePrivate=true', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME John
1 FAMS @F1@
0 @I2@ INDI
1 NAME PRIVATE
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
`.trim()
    const testData = parseGedcom(gedcom)
    const visible = getTreeVisibleIndividuals(testData, '@I1@', true)

    expect(visible.has('@I1@')).toBe(true)
    expect(visible.has('@I2@')).toBe(false)
  })

  it('filterOutPrivate removes all private individuals', () => {
    const allIds = new Set(Object.keys(data.individuals))
    const filtered = filterOutPrivate(allIds, data.individuals)

    for (const id of filtered) {
      expect(data.individuals[id].isPrivate).toBe(false)
    }
  })

  it('real GEDCOM has no private individuals in display list', () => {
    const roots = findRootAncestors(data)
    expect(roots.length).toBeGreaterThan(0)

    for (const root of roots) {
      expect(root.id).toBeDefined()
      expect(data.individuals[root.id].name.toUpperCase()).not.toBe('PRIVATE')
    }
  })

  it('real GEDCOM tree shows 177 visible individuals from default root', () => {
    const root = findDefaultRoot(data)
    const visible = getTreeVisibleIndividuals(data, root!.id, true)
    expect(visible.size).toBe(177)
  })
})
