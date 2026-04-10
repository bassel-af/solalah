import type { Individual } from '@/lib/gedcom/types'

export interface BirthDatePrivacySettings {
  hideBirthDateForFemale?: boolean
  hideBirthDateForMale?: boolean
}

export function shouldHideBirthDate(
  person: Individual,
  settings: BirthDatePrivacySettings,
): boolean {
  if (settings.hideBirthDateForFemale && person.sex === 'F') return true
  if (settings.hideBirthDateForMale && person.sex === 'M') return true
  return false
}
