import { describe, test, expect } from 'vitest'
import {
  individualFieldsSchema,
  createIndividualSchema,
  updateIndividualSchema,
  familyEventFieldsSchema,
  createFamilySchema,
  updateFamilySchema,
} from '@/lib/tree/schemas'

// ============================================================================
// individualFieldsSchema — placeId fields
// ============================================================================

describe('individualFieldsSchema — placeId fields', () => {
  test('accepts valid UUID for birthPlaceId', () => {
    const result = individualFieldsSchema.safeParse({
      birthPlaceId: 'a0000000-0000-4000-a000-000000000001',
    })
    expect(result.success).toBe(true)
  })

  test('accepts valid UUID for deathPlaceId', () => {
    const result = individualFieldsSchema.safeParse({
      deathPlaceId: 'a0000000-0000-4000-a000-000000000001',
    })
    expect(result.success).toBe(true)
  })

  test('accepts null for birthPlaceId', () => {
    const result = individualFieldsSchema.safeParse({
      birthPlaceId: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.birthPlaceId).toBeNull()
    }
  })

  test('accepts null for deathPlaceId', () => {
    const result = individualFieldsSchema.safeParse({
      deathPlaceId: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.deathPlaceId).toBeNull()
    }
  })

  test('rejects invalid UUID for birthPlaceId', () => {
    const result = individualFieldsSchema.safeParse({
      birthPlaceId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  test('rejects invalid UUID for deathPlaceId', () => {
    const result = individualFieldsSchema.safeParse({
      deathPlaceId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  test('omitting placeId fields is valid (optional)', () => {
    const result = individualFieldsSchema.safeParse({
      givenName: 'محمد',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.birthPlaceId).toBeUndefined()
      expect(result.data.deathPlaceId).toBeUndefined()
    }
  })
})

// ============================================================================
// createIndividualSchema — placeId flows through
// ============================================================================

describe('createIndividualSchema — placeId fields', () => {
  test('accepts birthPlaceId along with givenName', () => {
    const result = createIndividualSchema.safeParse({
      givenName: 'محمد',
      sex: 'M',
      birthPlaceId: 'a0000000-0000-4000-a000-000000000001',
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// updateIndividualSchema — placeId fields
// ============================================================================

describe('updateIndividualSchema — placeId fields', () => {
  test('accepts birthPlaceId and deathPlaceId', () => {
    const result = updateIndividualSchema.safeParse({
      birthPlaceId: 'a0000000-0000-4000-a000-000000000001',
      deathPlaceId: 'a0000000-0000-4000-a000-000000000002',
    })
    expect(result.success).toBe(true)
  })

  test('accepts null to clear placeId', () => {
    const result = updateIndividualSchema.safeParse({
      birthPlaceId: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.birthPlaceId).toBeNull()
    }
  })
})

// ============================================================================
// familyEventFieldsSchema — placeId fields
// ============================================================================

describe('familyEventFieldsSchema — placeId fields', () => {
  test('accepts valid UUIDs for all three placeId fields', () => {
    const result = familyEventFieldsSchema.safeParse({
      marriageContractPlaceId: 'a0000000-0000-4000-a000-000000000001',
      marriagePlaceId: 'a0000000-0000-4000-a000-000000000002',
      divorcePlaceId: 'a0000000-0000-4000-a000-000000000003',
    })
    expect(result.success).toBe(true)
  })

  test('accepts null for all placeId fields', () => {
    const result = familyEventFieldsSchema.safeParse({
      marriageContractPlaceId: null,
      marriagePlaceId: null,
      divorcePlaceId: null,
    })
    expect(result.success).toBe(true)
  })

  test('rejects invalid UUID for marriagePlaceId', () => {
    const result = familyEventFieldsSchema.safeParse({
      marriagePlaceId: 'bad-uuid',
    })
    expect(result.success).toBe(false)
  })

  test('placeId fields are optional', () => {
    const result = familyEventFieldsSchema.safeParse({
      marriageDate: '2020',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.marriageContractPlaceId).toBeUndefined()
      expect(result.data.marriagePlaceId).toBeUndefined()
      expect(result.data.divorcePlaceId).toBeUndefined()
    }
  })
})

// ============================================================================
// createFamilySchema — placeId fields flow through
// ============================================================================

describe('createFamilySchema — placeId fields', () => {
  test('accepts placeId fields alongside spouse IDs', () => {
    const result = createFamilySchema.safeParse({
      husbandId: 'a0000000-0000-4000-a000-000000000001',
      marriageContractPlaceId: 'a0000000-0000-4000-a000-000000000010',
      marriagePlaceId: 'a0000000-0000-4000-a000-000000000011',
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// updateFamilySchema — placeId fields
// ============================================================================

describe('updateFamilySchema — placeId fields', () => {
  test('accepts placeId fields with null to clear', () => {
    const result = updateFamilySchema.safeParse({
      marriageContractPlaceId: null,
      marriagePlaceId: null,
      divorcePlaceId: null,
    })
    expect(result.success).toBe(true)
  })
})
