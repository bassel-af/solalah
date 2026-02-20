import { describe, it, expect } from 'vitest'
import { parseGedcom } from '@/lib/gedcom/parser'
import { getAllAncestors } from '@/lib/gedcom/graph'

describe('getAllAncestors – highlight lineage', () => {
  it('returns all ancestors across multiple generations, excluding the subject', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Grandpa
1 FAMS @F1@
0 @I2@ INDI
1 NAME Grandma
1 FAMS @F1@
0 @I3@ INDI
1 NAME Father
1 FAMC @F1@
1 FAMS @F2@
0 @I4@ INDI
1 NAME Child
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 @F2@ FAM
1 HUSB @I3@
1 CHIL @I4@
`.trim()

    const data = parseGedcom(gedcom)
    const ancestors = getAllAncestors(data, '@I4@')

    expect(ancestors.has('@I3@')).toBe(true)  // father
    expect(ancestors.has('@I1@')).toBe(true)  // grandfather
    expect(ancestors.has('@I2@')).toBe(true)  // grandmother
    expect(ancestors.has('@I4@')).toBe(false) // subject excluded
    expect(ancestors.size).toBe(3)
  })

  it('returns an empty set for a person with no parents', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME RootPerson
1 FAMS @F1@
0 @I2@ INDI
1 NAME Child
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
`.trim()

    const data = parseGedcom(gedcom)
    const ancestors = getAllAncestors(data, '@I1@')

    expect(ancestors.size).toBe(0)
  })

  it('does not include the subject or their spouse/children in the ancestor set', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Grandfather
1 FAMS @F1@
0 @I2@ INDI
1 NAME Ahmad
1 FAMC @F1@
1 FAMS @F2@
0 @I3@ INDI
1 NAME AhmadWife
1 FAMS @F2@
0 @I4@ INDI
1 NAME AhmadsChild
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
0 @F2@ FAM
1 HUSB @I2@
1 WIFE @I3@
1 CHIL @I4@
`.trim()

    const data = parseGedcom(gedcom)
    const ancestors = getAllAncestors(data, '@I2@')

    expect(ancestors.has('@I1@')).toBe(true)   // grandfather is an ancestor
    expect(ancestors.has('@I2@')).toBe(false)  // subject excluded
    expect(ancestors.has('@I3@')).toBe(false)  // spouse is not an ancestor
    expect(ancestors.has('@I4@')).toBe(false)  // child is not an ancestor
  })
})
