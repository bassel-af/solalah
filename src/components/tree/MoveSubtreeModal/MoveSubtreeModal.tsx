'use client';

import { useState, useCallback, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { matchesSearch } from '@/lib/utils/search';
import styles from './MoveSubtreeModal.module.css';

export interface MoveSubtreeFamily {
  familyId: string;
  parentNames: string;
}

export interface MoveSubtreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (familyId: string) => void;
  families: MoveSubtreeFamily[];
  personName: string;
  descendantCount: number;
  loading?: boolean;
}

type Step = 'select' | 'confirm';

export function MoveSubtreeModal({
  isOpen,
  onClose,
  onConfirm,
  families,
  personName,
  descendantCount,
  loading = false,
}: MoveSubtreeModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [query, setQuery] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setStep('select');
    setQuery('');
    setSelectedFamilyId(null);
    onClose();
  }, [onClose]);

  const filteredFamilies = useMemo(() => {
    if (!query.trim()) return families;
    return families.filter((f) => matchesSearch(f.parentNames, query));
  }, [families, query]);

  const selectedFamily = useMemo(
    () => families.find((f) => f.familyId === selectedFamilyId) ?? null,
    [families, selectedFamilyId],
  );

  const handleNext = useCallback(() => {
    if (!selectedFamilyId) return;
    setStep('confirm');
  }, [selectedFamilyId]);

  const handleBack = useCallback(() => {
    setStep('select');
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedFamilyId) {
      onConfirm(selectedFamilyId);
    }
  }, [selectedFamilyId, onConfirm]);

  if (step === 'confirm' && selectedFamily) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="تأكيد نقل الفرع"
        actions={
          <>
            <Button variant="ghost" size="md" onClick={handleBack} disabled={loading}>
              رجوع
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              disabled={loading}
              loading={loading}
            >
              {loading ? 'جارٍ النقل...' : 'تأكيد'}
            </Button>
          </>
        }
        className={styles.modal}
      >
        <div className={styles.confirmContent}>
          <div className={styles.confirmWarning}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={styles.confirmIcon}>
              <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={styles.confirmText}>
              {descendantCount > 0
                ? `سيتم نقل ${personName} و ${descendantCount} من الذرية إلى العائلة المحددة. هل تريد المتابعة؟`
                : `سيتم نقل ${personName} إلى العائلة المحددة. هل تريد المتابعة؟`}
            </span>
          </div>
          <div className={styles.confirmDetail}>
            <div className={styles.confirmRow}>
              <span className={styles.confirmLabel}>العائلة المحددة:</span>
              <span className={styles.confirmValue}>{selectedFamily.parentNames}</span>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="نقل الفرع إلى عائلة أخرى"
      actions={
        <>
          <Button variant="ghost" size="md" onClick={handleClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!selectedFamilyId}
            onClick={handleNext}
          >
            التالي
          </Button>
        </>
      }
      className={styles.modal}
    >
      <div className={styles.searchWrapper}>
        <svg viewBox="0 0 24 24" fill="none" className={styles.searchIcon}>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
          <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بأسماء الوالدين..."
          className={styles.searchInput}
          autoComplete="off"
          autoFocus
        />
        {query && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => setQuery('')}
            aria-label="مسح البحث"
          >
            <svg viewBox="0 0 16 16" fill="none" className={styles.clearIcon}>
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      <div className={styles.list} role="radiogroup" aria-label="اختر العائلة">
        {filteredFamilies.length === 0 ? (
          <div className={styles.emptyState}>
            {query.trim() ? 'لا توجد نتائج' : 'لا توجد عائلات متاحة للنقل'}
          </div>
        ) : (
          filteredFamilies.map((family) => (
            <label
              key={family.familyId}
              className={`${styles.row} ${selectedFamilyId === family.familyId ? styles.rowSelected : ''}`}
            >
              <input
                type="radio"
                name="move-subtree-family"
                value={family.familyId}
                checked={selectedFamilyId === family.familyId}
                onChange={() => setSelectedFamilyId(family.familyId)}
                className={styles.radioInput}
              />
              <span className={styles.familyLabel}>{family.parentNames}</span>
            </label>
          ))
        )}
      </div>

      <div className={styles.resultCount}>
        {families.length > 0 && (
          <span>
            {query.trim()
              ? `${filteredFamilies.length} من ${families.length}`
              : `${families.length} عائلة`}
          </span>
        )}
      </div>
    </Modal>
  );
}
