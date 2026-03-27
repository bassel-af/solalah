'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api/client';
import styles from './ShareTokenList.module.css';

interface ShareToken {
  id: string;
  rootIndividualId: string;
  rootPersonName?: string;
  depthLimit: number | null;
  includeGrafts: boolean;
  isRevoked: boolean;
  useCount: number;
  maxUses: number | null;
  createdAt: string;
}

interface ShareTokenListProps {
  workspaceId: string;
  refreshTrigger?: number;
}

export function ShareTokenList({ workspaceId, refreshTrigger }: ShareTokenListProps) {
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/share-tokens`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'فشل في تحميل رموز المشاركة');
      }
      const body = await res.json();
      setTokens(body.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens, refreshTrigger]);

  const handleRevoke = useCallback(async (tokenId: string) => {
    setRevokingId(tokenId);
    setError('');
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/share-tokens/${tokenId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'فشل في إلغاء الرمز');
      }
      // Refresh list
      await fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setRevokingId(null);
    }
  }, [workspaceId, fetchTokens]);

  if (loading) {
    return <div className={styles.empty}>جاري التحميل...</div>;
  }

  if (tokens.length === 0 && !error) {
    return <div className={styles.empty}>لا توجد رموز مشاركة</div>;
  }

  return (
    <div className={styles.container}>
      {error && <div className={styles.error}>{error}</div>}
      {tokens.map((token) => (
        <div key={token.id} className={styles.tokenCard}>
          <div className={styles.tokenInfo}>
            <span className={styles.tokenRootName}>
              {token.rootPersonName || token.rootIndividualId}
            </span>
            <div className={styles.tokenMeta}>
              <span>
                العمق: {token.depthLimit ?? 'بدون حد'}
              </span>
              <span>
                الاستخدام: {token.useCount}{token.maxUses ? `/${token.maxUses}` : ''}
              </span>
              {token.isRevoked && <span className={styles.revokedBadge}>ملغى</span>}
            </div>
          </div>
          <div className={styles.tokenActions}>
            {!token.isRevoked && (
              <button
                className={styles.revokeButton}
                onClick={() => handleRevoke(token.id)}
                disabled={revokingId === token.id}
              >
                {revokingId === token.id ? '...' : 'إلغاء'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
