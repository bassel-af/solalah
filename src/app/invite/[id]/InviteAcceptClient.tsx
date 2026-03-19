'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import { CenteredCardLayout } from '@/components/ui/CenteredCardLayout';
import styles from './invite.module.css';

interface InviteAcceptClientProps {
  invitationId: string;
  workspaceName: string;
  workspaceSlug: string;
  inviterName: string | null;
  invitedEmail: string | null;
  isExpired: boolean;
  isUsed: boolean;
  isRevoked: boolean;
  isAccepted: boolean;
}

export default function InviteAcceptClient({
  invitationId,
  workspaceName,
  workspaceSlug,
  inviterName,
  invitedEmail,
  isExpired,
  isUsed,
  isRevoked,
  isAccepted,
}: InviteAcceptClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailMismatch, setEmailMismatch] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  const isInvalid = isExpired || isUsed || isRevoked || isAccepted;

  function getInvalidMessage(): string {
    if (isRevoked) return 'تم إلغاء هذه الدعوة.';
    if (isAccepted) return 'تم قبول هذه الدعوة مسبقاً.';
    if (isExpired) return 'انتهت صلاحية هذه الدعوة.';
    if (isUsed) return 'تم استخدام هذه الدعوة بالكامل.';
    return '';
  }

  async function handleAccept() {
    setError('');
    setEmailMismatch(false);
    setAlreadyMember(false);
    setLoading(true);

    try {
      const res = await apiFetch(`/api/invitations/${invitationId}/accept`, {
        method: 'POST',
      });

      if (res.ok) {
        window.location.href = `/workspaces/${workspaceSlug}`;
        return;
      }

      const body = await res.json();

      if (res.status === 403 && body.code === 'EMAIL_MISMATCH') {
        setEmailMismatch(true);
        setLoading(false);
        return;
      }

      if (body.code === 'ALREADY_MEMBER') {
        setAlreadyMember(true);
        setLoading(false);
        return;
      }

      setError(body.error || 'حدث خطأ أثناء قبول الدعوة');
      setLoading(false);
    } catch {
      setError('حدث خطأ أثناء قبول الدعوة');
      setLoading(false);
    }
  }

  return (
    <CenteredCardLayout>
      <div className={styles.icon}>
        <iconify-icon icon="material-symbols:mail" width="48" height="48" />
      </div>
      <h1 className={styles.title}>دعوة للانضمام</h1>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>المساحة</span>
          <span className={styles.detailValue}>{workspaceName}</span>
        </div>
        {inviterName && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>الدعوة من</span>
            <span className={styles.detailValue}>{inviterName}</span>
          </div>
        )}
        {invitedEmail && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>البريد الإلكتروني</span>
            <span className={styles.detailValue} dir="ltr">{invitedEmail}</span>
          </div>
        )}
      </div>

      {isInvalid && (
        <div className={styles.warning}>
          {getInvalidMessage()}
        </div>
      )}

      {emailMismatch && (
        <div className={styles.warning}>
          هذه الدعوة مخصصة لـ {invitedEmail}. يرجى تسجيل الدخول بهذا البريد الإلكتروني.
        </div>
      )}

      {alreadyMember && (
        <div className={styles.info}>
          أنت بالفعل عضو في هذه المساحة.{' '}
          <a href={`/workspaces/${workspaceSlug}`} className={styles.link}>
            الذهاب للمساحة
          </a>
        </div>
      )}

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {!isInvalid && !alreadyMember && !emailMismatch && (
        <button
          onClick={handleAccept}
          className={styles.button}
          disabled={loading}
        >
          {loading ? 'جاري القبول...' : 'قبول الدعوة'}
        </button>
      )}
    </CenteredCardLayout>
  );
}
