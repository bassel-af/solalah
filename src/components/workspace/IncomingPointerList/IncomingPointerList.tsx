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
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  child: 'ابن/ابنة',
  sibling: 'أخ/أخت',
  spouse: 'زوج/زوجة',
  parent: 'والد/والدة',
};

export function IncomingPointerList({ workspaceId }: IncomingPointerListProps) {
  const [pointers, setPointers] = useState<IncomingPointer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        </div>
      ))}
    </div>
  );
}
