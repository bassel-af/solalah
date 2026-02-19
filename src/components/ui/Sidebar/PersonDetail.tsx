'use client';

import clsx from 'clsx';
import { useMemo } from 'react';
import { useTree } from '@/context/TreeContext';
import { getDisplayName, getPersonRelationships } from '@/lib/gedcom';
import type { Individual } from '@/lib/gedcom';
import styles from './PersonDetail.module.css';

function DateInfo({ person, className }: { person: Individual; className?: string }) {
  if (!person.birth && !person.death) return null;
  return (
    <span className={className}>
      {person.birth && <span>الميلاد: {person.birth}</span>}
      {person.death && <span>الوفاة: {person.death}</span>}
    </span>
  );
}

interface RelationshipSectionProps {
  title: string;
  people: Individual[];
  visiblePersonIds: Set<string>;
  onPersonClick: (id: string) => void;
  /** If true, non-visible people are hidden and replaced with a single "خارج النطاق" label */
  hideNonVisible?: boolean;
}

function RelationshipSection({ title, people, visiblePersonIds, onPersonClick, hideNonVisible }: RelationshipSectionProps) {
  if (people.length === 0) return null;

  const visiblePeople = hideNonVisible
    ? people.filter((p) => visiblePersonIds.has(p.id))
    : people;
  const hasHiddenPeople = hideNonVisible && visiblePeople.length < people.length;

  return (
    <div>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {visiblePeople.map((person) => {
        const isVisible = visiblePersonIds.has(person.id);
        const name = getDisplayName(person);

        if (isVisible) {
          return (
            <button
              key={person.id}
              className={clsx(styles.relPersonClickable, {
                [styles.male]: person.sex === 'M',
                [styles.female]: person.sex === 'F',
              })}
              onClick={() => onPersonClick(person.id)}
            >
              <div className={styles.relPersonInfo}>
                <span className={styles.relPersonName}>{name}</span>
                <DateInfo person={person} className={styles.relPersonDates} />
              </div>
              <svg className={styles.relChevron} width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          );
        }

        return (
          <span
            key={person.id}
            className={clsx(styles.relPersonStatic, {
              [styles.male]: person.sex === 'M',
              [styles.female]: person.sex === 'F',
              [styles.deceased]: person.isDeceased,
            })}
          >
            <div className={styles.relPersonInfo}>
              <span className={styles.relPersonName}>{name}</span>
              <DateInfo person={person} className={styles.relPersonDates} />
            </div>
          </span>
        );
      })}
      {hasHiddenPeople && (
        <div className={styles.outOfScope}>خارج النطاق</div>
      )}
    </div>
  );
}

interface PersonDetailProps {
  personId: string;
}

export function PersonDetail({ personId }: PersonDetailProps) {
  const {
    data,
    visiblePersonIds,
    setSelectedPersonId,
    setFocusPersonId,
  } = useTree();

  const person = data?.individuals[personId];
  const relationships = useMemo(() => {
    if (!data) return null;
    return getPersonRelationships(data, personId);
  }, [data, personId]);

  if (!person || !data || !relationships) return null;

  const name = getDisplayName(person);
  const handleBack = () => {
    setSelectedPersonId(null);
  };

  const handlePersonClick = (id: string) => {
    setSelectedPersonId(id);
    setFocusPersonId(id);
  };

  const handleFocusInTree = () => {
    setFocusPersonId(personId);
    // Close sidebar on mobile
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSelectedPersonId(null);
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={handleBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        العودة للقائمة
      </button>

      <div className={styles.hero}>
        <h2 className={styles.heroName}>{name}</h2>
        <DateInfo person={person} className={styles.heroDates} />
        {person.sex && (
          <span className={clsx(styles.heroSexBadge, {
            [styles.male]: person.sex === 'M',
            [styles.female]: person.sex === 'F',
          })}>
            {person.sex === 'M' ? 'ذكر' : 'أنثى'}
          </span>
        )}
        <button className={styles.focusButton} onClick={handleFocusInTree}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          التركيز في الشجرة
        </button>
      </div>

      <div className={styles.sections}>
        <RelationshipSection
          title="الوالدان"
          people={relationships.parents}
          visiblePersonIds={visiblePersonIds}
          onPersonClick={handlePersonClick}
        />
        <RelationshipSection
          title="الإخوة والأخوات"
          people={relationships.siblings}
          visiblePersonIds={visiblePersonIds}
          onPersonClick={handlePersonClick}
          hideNonVisible
        />
        <RelationshipSection
          title={person.sex === 'F' ? 'الزوج' : 'الزوجة'}
          people={relationships.spouses}
          visiblePersonIds={visiblePersonIds}
          onPersonClick={handlePersonClick}
        />
        <RelationshipSection
          title="الأبناء"
          people={relationships.children}
          visiblePersonIds={visiblePersonIds}
          onPersonClick={handlePersonClick}
        />
      </div>
    </div>
  );
}
