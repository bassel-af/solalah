'use client';

import { Button } from '@/components/ui';
import styles from './EmptyTreeState.module.css';

interface EmptyTreeStateProps {
  canEdit: boolean;
  onAddFirst?: () => void;
  onImport?: () => void;
  importLoading?: boolean;
}

function TreeIcon() {
  return (
    <svg
      className={styles.icon}
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Root person circle */}
      <circle cx="40" cy="16" r="8" stroke="currentColor" strokeWidth="1.5" />
      {/* Vertical line down from root */}
      <line x1="40" y1="24" x2="40" y2="34" stroke="currentColor" strokeWidth="1.5" />
      {/* Horizontal connector */}
      <line x1="20" y1="34" x2="60" y2="34" stroke="currentColor" strokeWidth="1.5" />
      {/* Left branch */}
      <line x1="20" y1="34" x2="20" y2="44" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20" cy="52" r="8" stroke="currentColor" strokeWidth="1.5" />
      {/* Right branch */}
      <line x1="60" y1="34" x2="60" y2="44" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="52" r="8" stroke="currentColor" strokeWidth="1.5" />
      {/* Left sub-branch */}
      <line x1="20" y1="60" x2="20" y2="66" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* Right sub-branch */}
      <line x1="60" y1="60" x2="60" y2="66" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9 12V3M9 3L5 7M9 3L13 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12V14C3 14.5523 3.44772 15 4 15H14C14.5523 15 15 14.5523 15 14V12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EmptyTreeState({ canEdit, onAddFirst, onImport, importLoading }: EmptyTreeStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <TreeIcon />
        <h2 className={styles.heading}>
          لا توجد بيانات في شجرة العائلة بعد
        </h2>
        <p className={styles.subtext}>
          {canEdit
            ? 'ابدأ بإضافة أول شخص أو استيراد ملف GEDCOM'
            : 'سيقوم المحرر بإضافة بيانات شجرة العائلة قريباً'}
        </p>
        {canEdit && (onAddFirst || onImport) && (
          <div className={styles.actions}>
            {onAddFirst && (
              <Button
                variant="primary"
                size="lg"
                onClick={onAddFirst}
                disabled={importLoading}
              >
                إضافة أول شخص
              </Button>
            )}
            {onAddFirst && onImport && (
              <span className={styles.divider}>أو</span>
            )}
            {onImport && (
              <Button
                variant="secondary"
                size="lg"
                onClick={onImport}
                loading={importLoading}
                disabled={importLoading}
              >
                <UploadIcon />
                {importLoading ? 'جاري الاستيراد...' : 'استيراد ملف GEDCOM'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
