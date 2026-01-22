'use client';

import clsx from 'clsx';
import type { Individual } from '@/lib/gedcom';
import { getDisplayName } from '@/lib/gedcom';
import { useTree } from '@/context/TreeContext';
import styles from './PersonCard.module.css';

interface PersonCardProps {
  person: Individual | null | undefined;
  isRoot?: boolean;
}

export function PersonCard({ person, isRoot = false }: PersonCardProps) {
  const { searchQuery } = useTree();

  if (!person) return null;

  const displayName = getDisplayName(person);

  // Check if this person matches search
  const isMatch =
    searchQuery &&
    displayName.toLowerCase().includes(searchQuery.toLowerCase());

  let dates = '';
  if (person.birth || person.death) {
    dates = `${person.birth || '?'} - ${person.death || ''}`;
  }

  return (
    <div
      className={clsx(styles.person, {
        [styles.male]: person.sex === 'M',
        [styles.female]: person.sex === 'F',
        [styles.root]: isRoot,
        [styles.searchMatch]: isMatch,
        [styles.deceased]: person.isDeceased,
      })}
    >
      <div className={styles.personName}>{displayName}</div>
      {dates && <div className={styles.personDates}>{dates}</div>}
    </div>
  );
}
