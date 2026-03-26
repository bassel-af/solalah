'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import clsx from 'clsx';
import { useTree } from '@/context/TreeContext';
import { getDisplayName, getPersonRelationships, findTopmostAncestor } from '@/lib/gedcom';
import type { Individual } from '@/lib/gedcom';
import { getPreferredDate, getDateSuffix } from '@/lib/calendar-helpers';
import { useCalendarPreference } from '@/hooks/useCalendarPreference';
import styles from './SpouseFamilySidebar.module.css';

// ---------------------------------------------------------------------------
// DateInfoCompact — minimal date display for person rows
// ---------------------------------------------------------------------------

function DateInfoCompact({
  person,
  className,
  calendarPreference,
}: {
  person: Individual;
  className?: string;
  calendarPreference: 'hijri' | 'gregorian';
}) {
  const birthPrimary = getPreferredDate(person.birth, person.birthHijriDate, calendarPreference);
  const birthSuffix = getDateSuffix(person.birth, person.birthHijriDate);
  const deathPrimary = getPreferredDate(person.death, person.deathHijriDate, calendarPreference);
  const deathSuffix = getDateSuffix(person.death, person.deathHijriDate);

  const birthDisplay = birthPrimary ? `${birthPrimary}${birthSuffix ? ` ${birthSuffix}` : ''}` : '';
  const deathDisplay = deathPrimary ? `${deathPrimary}${deathSuffix ? ` ${deathSuffix}` : ''}` : '';

  if (!birthDisplay && !deathDisplay) return null;

  return (
    <span className={className}>
      {birthDisplay && (
        <span className={styles.dateGroup}>
          <span className={styles.datePrimary}>الميلاد: {birthDisplay}</span>
        </span>
      )}
      {deathDisplay && (
        <span className={styles.dateGroup}>
          <span className={styles.datePrimary}>الوفاة: {deathDisplay}</span>
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// PersonRow — a single person entry (clickable or static)
// ---------------------------------------------------------------------------

function PersonRow({
  person,
  isClickable,
  onClick,
  calendarPreference,
}: {
  person: Individual;
  isClickable: boolean;
  onClick?: () => void;
  calendarPreference: 'hijri' | 'gregorian';
}) {
  const name = getDisplayName(person);
  const rowClasses = clsx(
    isClickable ? styles.personRowClickable : styles.personRowStatic,
    {
      [styles.male]: person.sex === 'M',
      [styles.female]: person.sex === 'F',
      [styles.deceased]: person.isDeceased,
    },
  );

  if (isClickable) {
    return (
      <button className={rowClasses} onClick={onClick}>
        <div className={styles.personInfo}>
          <span className={styles.personName}>{name}</span>
          <DateInfoCompact person={person} className={styles.personDates} calendarPreference={calendarPreference} />
        </div>
        <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    );
  }

  return (
    <span className={rowClasses}>
      <div className={styles.personInfo}>
        <span className={styles.personName}>{name}</span>
        <DateInfoCompact person={person} className={styles.personDates} calendarPreference={calendarPreference} />
      </div>
    </span>
  );
}

// ---------------------------------------------------------------------------
// SpouseFamilySidebar
// ---------------------------------------------------------------------------

export function SpouseFamilySidebar() {
  const {
    data,
    spouseFamilySidebarPersonId,
    setSpouseFamilySidebarPersonId,
    visiblePersonIds,
    setSelectedPersonId,
    setFocusPersonId,
    setHighlightedPersonId,
    setSelectedRootId,
    setMobileSidebarOpen,
  } = useTree();

  const { preference: calendarPreference } = useCalendarPreference();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isOpen = spouseFamilySidebarPersonId !== null;

  // Resolve the person from data
  const person = isOpen && data ? data.individuals[spouseFamilySidebarPersonId] : null;

  // Get relationships
  const relationships = useMemo(() => {
    if (!data || !spouseFamilySidebarPersonId) return null;
    return getPersonRelationships(data, spouseFamilySidebarPersonId);
  }, [data, spouseFamilySidebarPersonId]);

  // Get the topmost ancestor for the "view full tree" button
  const topAncestorId = useMemo(() => {
    if (!data || !spouseFamilySidebarPersonId) return null;
    return findTopmostAncestor(data, spouseFamilySidebarPersonId);
  }, [data, spouseFamilySidebarPersonId]);

  // Filter siblings to exclude the person themselves
  const siblings = useMemo(() => {
    if (!relationships) return [];
    return relationships.siblings.filter(s => s.id !== spouseFamilySidebarPersonId);
  }, [relationships, spouseFamilySidebarPersonId]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleClose = useCallback(() => {
    setSpouseFamilySidebarPersonId(null);
  }, [setSpouseFamilySidebarPersonId]);

  const handlePersonClick = useCallback((id: string) => {
    setSelectedPersonId(id);
    setFocusPersonId(id);
    setHighlightedPersonId(id);
  }, [setSelectedPersonId, setFocusPersonId, setHighlightedPersonId]);

  const handleViewFullTree = useCallback(() => {
    if (!topAncestorId) return;
    setSelectedRootId(topAncestorId);
    setSelectedPersonId(null);
    // Close mobile sidebar so the new tree is visible
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setMobileSidebarOpen(false);
    }
    // Sidebar auto-clears via the selectedRootId change effect in TreeContext
  }, [topAncestorId, setSelectedRootId, setSelectedPersonId, setMobileSidebarOpen]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Focus close button when sidebar opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the animation start
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSpouseFamilySidebarPersonId(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setSpouseFamilySidebarPersonId]);

  // Body scroll lock on mobile
  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;
    if (window.innerWidth > 768) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hasParents = relationships && relationships.parents.length > 0;
  const hasSiblings = siblings.length > 0;
  const hasContent = hasParents || hasSiblings;

  const spouseName = person ? getDisplayName(person) : '';
  // Extract first name only for the header
  const firstName = spouseName.split(' ')[0] || spouseName;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={clsx(styles.overlay, { [styles.isVisible]: isOpen })}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        className={clsx(styles.sidebar, { [styles.isOpen]: isOpen })}
        role="complementary"
        aria-label={isOpen ? `عائلة ${firstName}` : undefined}
      >
        {person && (
          <>
            {/* Header */}
            <div className={styles.header}>
              <h2 className={styles.headerTitle}>عائلة {firstName}</h2>
              <button
                ref={closeButtonRef}
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="إغلاق لوحة العائلة"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Identity card */}
            <div className={styles.identityCard}>
              <h3 className={styles.identityName}>{spouseName}</h3>
              <DateInfoCompact
                person={person}
                className={styles.identityDates}
                calendarPreference={calendarPreference}
              />
              {person.sex && (
                <span className={clsx(styles.identitySexBadge, {
                  [styles.male]: person.sex === 'M',
                  [styles.female]: person.sex === 'F',
                })}>
                  {person.sex === 'M' ? 'ذكر' : 'أنثى'}
                </span>
              )}
            </div>

            {/* Scrollable content */}
            <div className={styles.content}>
              {hasContent ? (
                <>
                  {/* Parents section */}
                  {hasParents && (
                    <div>
                      <h3 className={styles.sectionTitle}>الوالدان</h3>
                      {relationships!.parents.map((parent) => (
                        <PersonRow
                          key={parent.id}
                          person={parent}
                          isClickable={visiblePersonIds.has(parent.id)}
                          onClick={() => handlePersonClick(parent.id)}
                          calendarPreference={calendarPreference}
                        />
                      ))}
                    </div>
                  )}

                  {/* Siblings section */}
                  {hasSiblings && (
                    <div>
                      <h3 className={styles.sectionTitle}>الإخوة والأخوات</h3>
                      {siblings.map((sibling) => (
                        <PersonRow
                          key={sibling.id}
                          person={sibling}
                          isClickable={visiblePersonIds.has(sibling.id)}
                          onClick={() => handlePersonClick(sibling.id)}
                          calendarPreference={calendarPreference}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.emptyMessage}>
                  لا توجد بيانات عن عائلة هذا الشخص
                </div>
              )}
            </div>

            {/* Footer with "View full tree" button */}
            {topAncestorId && (
              <div className={styles.footer}>
                <button
                  className={styles.viewTreeButton}
                  onClick={handleViewFullTree}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M6 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M18 9a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M6 21a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M15 6h-4a2 2 0 00-2 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  عرض الشجرة الكاملة
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
