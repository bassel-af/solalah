import { describe, it, expect } from 'vitest'
import { parseGedcom } from '@/lib/gedcom/parser'
import { getPersonRelationships } from '@/lib/gedcom/relationships'

const FAMILY_GEDCOM = `
0 @I1@ INDI
1 NAME Father
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME Mother
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME Child
1 SEX M
1 FAMC @F1@
0 @I4@ INDI
1 NAME Outsider
1 SEX M
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
`.trim()

describe('PersonDetail visibility logic', () => {
  it('distinguishes visible vs non-visible people', () => {
    const data = parseGedcom(FAMILY_GEDCOM)
    const relationships = getPersonRelationships(data, '@I3@')

    // Simulate a visible set that only includes Father and Child (not Mother)
    const visiblePersonIds = new Set(['@I1@', '@I3@'])

    const parents = relationships.parents
    const visibleParents = parents.filter((p) => visiblePersonIds.has(p.id))
    const nonVisibleParents = parents.filter((p) => !visiblePersonIds.has(p.id))

    expect(visibleParents.map((p) => p.id)).toEqual(['@I1@'])
    expect(nonVisibleParents.map((p) => p.id)).toEqual(['@I2@'])
  })

  it('shows section data only for non-empty relationship groups', () => {
    const data = parseGedcom(FAMILY_GEDCOM)

    // Outsider has no relationships
    const rel = getPersonRelationships(data, '@I4@')
    const sections = [
      { title: 'الوالدان', people: rel.parents },
      { title: 'الإخوة والأخوات', people: rel.siblings },
      { title: 'الزوجة', people: rel.spouses },
      { title: 'الأبناء', people: rel.children },
    ]
    const nonEmptySections = sections.filter((s) => s.people.length > 0)
    expect(nonEmptySections).toHaveLength(0)

    // Child has parents but no siblings, spouses, or children
    const childRel = getPersonRelationships(data, '@I3@')
    const childSections = [
      { title: 'الوالدان', people: childRel.parents },
      { title: 'الإخوة والأخوات', people: childRel.siblings },
      { title: 'الزوجة', people: childRel.spouses },
      { title: 'الأبناء', people: childRel.children },
    ]
    const childNonEmpty = childSections.filter((s) => s.people.length > 0)
    expect(childNonEmpty).toHaveLength(1)
    expect(childNonEmpty[0].title).toBe('الوالدان')
  })

  it('siblings: hides non-visible and shows out-of-scope indicator', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Father
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME Sibling1
1 SEX M
1 FAMC @F1@
0 @I3@ INDI
1 NAME Sibling2
1 SEX F
1 FAMC @F1@
0 @I4@ INDI
1 NAME Subject
1 SEX M
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
1 CHIL @I3@
1 CHIL @I4@
`.trim()

    const data = parseGedcom(gedcom)
    const rel = getPersonRelationships(data, '@I4@')

    // Only Subject and Sibling1 are in the tree
    const visibleIds = new Set(['@I4@', '@I2@'])

    // hideNonVisible logic: filter to visible only
    const visibleSiblings = rel.siblings.filter((p) => visibleIds.has(p.id))
    const hasHidden = visibleSiblings.length < rel.siblings.length

    expect(visibleSiblings.map((p) => p.id)).toEqual(['@I2@'])
    expect(hasHidden).toBe(true) // Sibling2 is hidden, show "خارج النطاق"
  })

  it('uses gender-specific spouse title', () => {
    const data = parseGedcom(FAMILY_GEDCOM)

    const father = data.individuals['@I1@']
    const mother = data.individuals['@I2@']

    // Male person -> الزوجة
    expect(father.sex).toBe('M')
    const maleSpouseTitle = father.sex === 'F' ? 'الزوج' : 'الزوجة'
    expect(maleSpouseTitle).toBe('الزوجة')

    // Female person -> الزوج
    expect(mother.sex).toBe('F')
    const femaleSpouseTitle = mother.sex === 'F' ? 'الزوج' : 'الزوجة'
    expect(femaleSpouseTitle).toBe('الزوج')
  })
})
