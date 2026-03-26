'use client';

import { useTree } from '@/context/TreeContext';
import type { ViewMode } from '@/context/TreeContext';
import styles from './ViewModeToggle.module.css';

/**
 * Floating segmented pill for switching between single and multi-root view modes.
 * Positioned at top-center of the canvas.
 */
export function ViewModeToggle() {
  const { viewMode, setViewMode } = useTree();

  const segments: Array<{ mode: ViewMode; fullLabel: string; shortLabel: string }> = [
    { mode: 'single', fullLabel: 'شجرة واحدة', shortLabel: 'واحدة' },
    { mode: 'multi', fullLabel: 'عدة جذور', shortLabel: 'عدة' },
  ];

  return (
    <div className={styles.pill} role="radiogroup" aria-label="وضع العرض">
      {segments.map(({ mode, fullLabel, shortLabel }) => (
        <button
          key={mode}
          role="radio"
          aria-checked={viewMode === mode}
          className={`${styles.segment} ${viewMode === mode ? styles.segmentActive : ''}`.trim()}
          onClick={() => setViewMode(mode)}
        >
          <span className={styles.fullLabel}>{fullLabel}</span>
          <span className={styles.shortLabel}>{shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
