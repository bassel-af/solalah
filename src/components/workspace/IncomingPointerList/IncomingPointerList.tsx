'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api/client';
import styles from './IncomingPointerList.module.css';

interface IncomingPointer {
  id: string;
  sourceWorkspaceNameAr?: string;
  sourceRootName: string;
  anchorIndividualId: string;
  relationship: string;
  status: string;
}

interface IncomingPointerListProps {
  workspaceId: string;
  isAdmin: boolean;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  child: 'ابن/ابنة',
  sibling: 'أخ/أخت',
  spouse: 'زوج/زوجة',
  parent: 'والد/والدة',
};

export function IncomingPointerList({ workspaceId, isAdmin }: IncomingPointerListProps) {
  const [pointers, setPointers] = useState<IncomingPointer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmBreak, setConfirmBreak] = useState<string | null>(null);

  const fetchPointers = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/branch-pointers`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'فشل في تحميل الفروع المرتبطة');
      }
      const body = await res.json();
      setPointers(body.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchPointers();
  }, [fetchPointers]);

  const handleBreak = useCallback(async (pointerId: string) => {
    setActionId(pointerId);
    setError('');
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/branch-pointers/${pointerId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'فشل في فصل الفرع');
      }
      setConfirmBreak(null);
      await fetchPointers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setActionId(null);
    }
  }, [workspaceId, fetchPointers]);

  const handleCopy = useCallback(async (pointerId: string) => {
    setActionId(pointerId);
    setError('');
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/branch-pointers/${pointerId}/copy`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'فشل في نسخ الفرع');
      }
      await fetchPointers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setActionId(null);
    }
  }, [workspaceId, fetchPointers]);

  if (loading) {
    return <div className={styles.empty}>جاري التحميل...</div>;
  }

  if (pointers.length === 0 && !error) {
    return <div className={styles.empty}>لا توجد فروع مرتبطة</div>;
  }

  return (
    <div className={styles.container}>
      {error && <div className={styles.error}>{error}</div>}
      {pointers.map((pointer) => (
        <div key={pointer.id} className={styles.pointerCard}>
          <div className={styles.pointerInfo}>
            <span className={styles.pointerRootName}>
              {pointer.sourceRootName}
            </span>
            <div className={styles.pointerMeta}>
              {pointer.sourceWorkspaceNameAr && (
                <span className={styles.pointerSourceName}>
                  من: {pointer.sourceWorkspaceNameAr}
                </span>
              )}
              <span>
                {RELATIONSHIP_LABELS[pointer.relationship] || pointer.relationship}
              </span>
              <span className={
                pointer.status === 'active' ? styles.statusActive : styles.statusBroken
              }>
                {pointer.status === 'active' ? 'نشط' : pointer.status === 'broken' ? 'مفصول' : 'ملغى'}
              </span>
            </div>
          </div>
          {isAdmin && pointer.status === 'active' && (
            <div className={styles.pointerActions}>
              {confirmBreak === pointer.id ? (
                <div className={styles.confirmInline}>
                  <span className={styles.confirmText}>فصل؟</span>
                  <button
                    className={styles.confirmYes}
                    onClick={() => handleBreak(pointer.id)}
                    disabled={actionId === pointer.id}
                  >
                    {actionId === pointer.id ? '...' : 'نعم'}
                  </button>
                  <button
                    className={styles.confirmNo}
                    onClick={() => setConfirmBreak(null)}
                    disabled={actionId === pointer.id}
                  >
                    لا
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className={styles.breakButton}
                    onClick={() => setConfirmBreak(pointer.id)}
                    disabled={actionId === pointer.id}
                  >
                    فصل
                  </button>
                  <button
                    className={styles.copyButton}
                    onClick={() => handleCopy(pointer.id)}
                    disabled={actionId === pointer.id}
                  >
                    {actionId === pointer.id ? '...' : 'نسخ'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
