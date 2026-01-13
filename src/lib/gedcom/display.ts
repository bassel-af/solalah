import type { Individual } from './types';

export function getDisplayName(person: Individual | null | undefined): string {
  if (!person) return 'Unknown';

  const nameParts = person.name.split(' ').filter((p) => p);
  if (nameParts.length > 1) {
    return person.name;
  }

  if (person.givenName && person.surname) {
    return `${person.givenName} ${person.surname}`;
  }
  if (person.givenName) {
    return person.givenName;
  }
  if (person.name) {
    return person.name;
  }
  if (person.surname) {
    return person.surname;
  }

  return 'Unknown';
}
