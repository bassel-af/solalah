'use client';

import { useId, useState, type ReactNode, type MouseEvent } from 'react';
import styles from './CollapsibleSection.module.css';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  headerRight?: ReactNode;
  id?: string;
  className?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  headerRight,
  id,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reactId = useId();
  const contentId = id ? `${id}-content` : `collapsible-${reactId}-content`;

  const handleHeaderRightClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={[styles.section, className ?? ''].filter(Boolean).join(' ')}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={contentId}
        >
          <span
            className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
            aria-hidden="true"
          >
            <iconify-icon icon="material-symbols:expand-more" width="20" height="20" />
          </span>
          <h3 className={styles.title}>{title}</h3>
        </button>
        {headerRight && (
          <div className={styles.headerRight} onClick={handleHeaderRightClick}>
            {headerRight}
          </div>
        )}
      </div>

      <div
        id={contentId}
        className={`${styles.content} ${open ? styles.contentOpen : ''}`}
      >
        <div className={styles.contentInner}>{children}</div>
      </div>
    </div>
  );
}
