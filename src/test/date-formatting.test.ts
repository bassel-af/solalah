import { describe, it, expect } from 'vitest'
import { parseGedcom } from '@/lib/gedcom/parser'

describe('formatGedcomDate', () => {
  it('converts full GEDCOM date "1 JAN 1990" to "01/01/1990"', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 BIRT
2 DATE 1 JAN 1990
`.trim()

    const data = parseGedcom(gedcom)
    expect(data.individuals['@I1@'].birth).toBe('01/01/1990')
  })

  it('converts month-year "MAR 1985" to "03/1985" and passes through year-only', () => {
    const gedcom = `
0 @I1@ INDI
1 NAME Ahmad
1 BIRT
2 DATE MAR 1985
0 @I2@ INDI
1 NAME Fatima
1 BIRT
2 DATE 1990
`.trim()

    const data = parseGedcom(gedcom)
    expect(data.individuals['@I1@'].birth).toBe('03/1985')
    expect(data.individuals['@I2@'].birth).toBe('1990')
  })
})
