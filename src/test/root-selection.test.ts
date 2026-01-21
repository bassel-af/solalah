import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseGedcom } from '@/lib/gedcom/parser'
import { findDefaultRoot } from '@/lib/gedcom/roots'
import { getDisplayName } from '@/lib/gedcom/display'
import type { GedcomData } from '@/lib/gedcom/types'

describe('Root Selection', () => {
  let data: GedcomData

  beforeAll(() => {
    const gedcomPath = join(__dirname, 'fixtures/saeed-family.ged')
    const gedcomText = readFileSync(gedcomPath, 'utf-8')
    data = parseGedcom(gedcomText)
  })

  it('selects عمر سعيّد as default root for real GEDCOM', () => {
    const result = findDefaultRoot(data)
    expect(result).not.toBeNull()
    expect(getDisplayName(result!)).toBe('عمر سعيّد')
  })

  it('selects root with most descendants when multiple true roots exist', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME BigFamily
1 FAMS @F1@
0 @I2@ INDI
1 NAME SmallFamily
1 FAMS @F2@
0 @I3@ INDI
1 NAME Child1
1 FAMC @F1@
0 @I4@ INDI
1 NAME Child2
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I3@
1 CHIL @I4@
0 @F2@ FAM
1 HUSB @I2@
`.trim()
    const testData = parseGedcom(gedcom)
    const result = findDefaultRoot(testData)

    expect(result?.id).toBe('@I1@')
  })

  it('returns single true root without calculation', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME OnlyRoot
1 FAMS @F1@
0 @I2@ INDI
1 NAME Child
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
`.trim()
    const testData = parseGedcom(gedcom)
    const result = findDefaultRoot(testData)

    expect(result?.id).toBe('@I1@')
  })

  it('returns null when no individuals exist', () => {
    const emptyData: GedcomData = { individuals: {}, families: {} }
    const result = findDefaultRoot(emptyData)

    expect(result).toBeNull()
  })
})
