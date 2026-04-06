'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { stripArabicDiacritics } from '@/lib/utils/search';
import styles from './CascadeDeleteModal.module.css';

interface CascadeDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmationName?: string) => void;
  personName: string;
  affectedCount: number;
  affectedNames: string[];
  truncated: boolean;
  branchPointerCount: number;
  loading?: boolean;
}

const NAME_CONFIRM_THRESHOLD = 5;

export function CascadeDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  personName,
  affectedCount,
  affectedNames,
  truncated,
  branchPointerCount,
  loading = false,
}: CascadeDeleteModalProps) {
  const [nameInput, setNameInput] = useState('');

  const requiresNameConfirm = affectedCount >= NAME_CONFIRM_THRESHOLD;
  const nameMatches = requiresNameConfirm
    ? stripArabicDiacritics(nameInput.trim()) === stripArabicDiacritics(personName.trim())
    : true;

  const totalDeleteCount = affectedCount + 1; // target + affected
  const truncatedRemainder = affectedCount - affectedNames.length;

  const canConfirm = !loading && nameMatches;

  const countText = affectedCount === 1
    ? 'شخص إضافي واحد'
    : affectedCount === 2
      ? 'شخصين إضافيين'
      : `${affectedCount} أشخاص إضافيين`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تحذير: حذف متسلسل"
      className={styles.modal}
    >
      <div className={styles.warning}>
        <svg className={styles.warningIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p>
          حذف {personName} سيؤدي إلى حذف {countText} من الشجرة نهائيًا.
        </p>
      </div>

      {branchPointerCount > 0 && (
        <div className={styles.pointerWarning}>
          سيتم قطع <strong>{branchPointerCount}</strong> رابط فرعي
        </div>
      )}

      <div className={styles.namesList}>
        {affectedNames.map((name, i) => (
          <span key={i} className={styles.nameTag}>{name}</span>
        ))}
        {truncated && truncatedRemainder > 0 && (
          <span className={styles.truncatedNote}>
            و{truncatedRemainder} آخرين
          </span>
        )}
      </div>

      {requiresNameConfirm && (
        <div className={styles.nameConfirm}>
          <label className={styles.nameConfirmLabel}>
            اكتب اسم الشخص <strong>{personName}</strong> للتأكيد
          </label>
          <input
            type="text"
            className={styles.nameConfirmInput}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            dir="rtl"
            autoComplete="off"
          />
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.cancelButton}
          onClick={onClose}
          disabled={loading}
        >
          إلغاء
        </button>
        <button
          className={styles.confirmButton}
          onClick={() => onConfirm(requiresNameConfirm ? nameInput.trim() : undefined)}
          disabled={!canConfirm}
        >
          {loading ? 'جارٍ الحذف...' : `حذف ${totalDeleteCount} أشخاص`}
        </button>
      </div>
    </Modal>
  );
}
