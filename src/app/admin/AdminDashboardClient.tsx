'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import styles from './AdminDashboard.module.css';
import type {
  GrowthMetrics,
  EngagementMetrics,
  HealthMetrics,
} from '@/lib/admin/queries';
import { PresenceSection, type PresencePayload } from './PresenceSection';

/**
 * Client dashboard — fetches all three metric endpoints in parallel and
 * renders three stacked sections (Growth, Engagement, Health). Each section
 * can fail independently without blowing up the page (PRD §11 non-functional
 * requirement: dashboard reads never 500).
 *
 * The refresh button simply re-fetches. There's no polling — the PRD
 * explicitly rules it out ("refreshes on demand").
 */

type SectionState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string };

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'غير متوفر';
  if (bytes === 0) return '0 بايت';
  const units = ['بايت', 'ك.ب', 'م.ب', 'ج.ب', 'ت.ب'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${Math.round(rate * 100)}%`;
}

function formatAvg(avg: number | null): string {
  if (avg === null) return '—';
  return avg.toString();
}

function formatRelative(ts: number | null): string {
  if (ts === null) return '—';
  const date = new Date(ts);
  return date.toLocaleTimeString('ar', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AdminDashboardClient() {
  const [growth, setGrowth] = useState<SectionState<GrowthMetrics>>({
    status: 'idle',
  });
  const [engagement, setEngagement] = useState<SectionState<EngagementMetrics>>(
    { status: 'idle' },
  );
  const [health, setHealth] = useState<SectionState<HealthMetrics>>({
    status: 'idle',
  });
  const [presence, setPresence] = useState<SectionState<PresencePayload>>({
    status: 'idle',
  });
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);

  const loadSection = useCallback(
    async <T,>(
      path: string,
      setter: (state: SectionState<T>) => void,
    ): Promise<void> => {
      setter({ status: 'loading' });
      try {
        const res = await apiFetch(path);
        if (!res.ok) {
          setter({ status: 'error', message: `HTTP ${res.status}` });
          return;
        }
        const body = (await res.json()) as T | { error?: string; errorType?: string };
        // Route-level query failure envelope: { error: 'query_failed', errorType }
        if (
          typeof body === 'object' &&
          body !== null &&
          'error' in body &&
          (body as { error?: string }).error === 'query_failed'
        ) {
          setter({
            status: 'error',
            message: `query_failed: ${(body as { errorType?: string }).errorType ?? 'unknown'}`,
          });
          return;
        }
        setter({ status: 'ok', data: body as T });
      } catch (err) {
        const message =
          err instanceof Error ? err.constructor.name : 'UnknownError';
        setter({ status: 'error', message });
      }
    },
    [],
  );

  const refreshAll = useCallback(() => {
    void Promise.all([
      loadSection<PresencePayload>('/api/admin/metrics/presence', setPresence),
      loadSection<GrowthMetrics>('/api/admin/metrics/growth', setGrowth),
      loadSection<EngagementMetrics>(
        '/api/admin/metrics/engagement',
        setEngagement,
      ),
      loadSection<HealthMetrics>('/api/admin/metrics/health', setHealth),
    ]).then(() => {
      setLastRefresh(Date.now());
    });
  }, [loadSection]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const isLoading =
    growth.status === 'loading' ||
    engagement.status === 'loading' ||
    health.status === 'loading' ||
    presence.status === 'loading';

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>لوحة تحكم المنصة</h1>
        <div className={styles.headerActions}>
          <span className={styles.lastRefresh}>
            آخر تحديث: {formatRelative(lastRefresh)}
          </span>
          <button
            className={styles.refreshButton}
            onClick={refreshAll}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? 'جارٍ التحديث…' : 'تحديث'}
          </button>
        </div>
      </div>

      <PresenceSection state={presence} />
      <GrowthSection state={growth} />
      <EngagementSection state={engagement} />
      <HealthSection state={health} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Growth
// ---------------------------------------------------------------------------

function GrowthSection({ state }: { state: SectionState<GrowthMetrics> }) {
  return (
    <section className={styles.section} aria-labelledby="growth-heading">
      <h2 id="growth-heading" className={styles.sectionTitle}>
        النمو
      </h2>
      {state.status === 'loading' || state.status === 'idle' ? (
        <div className={styles.loading}>جارٍ التحميل…</div>
      ) : state.status === 'error' ? (
        <div className={styles.error}>تعذر تحميل المقاييس: {state.message}</div>
      ) : (
        <div className={styles.grid}>
          <Card
            label="إجمالي المساحات"
            value={state.data.totalWorkspaces}
            secondary="جميع المساحات"
          />
          <Card
            label="مساحات جديدة"
            value={state.data.workspacesCreatedLast7d}
            secondary="آخر ٧ أيام"
          />
          <Card
            label="مساحات جديدة"
            value={state.data.workspacesCreatedLast30d}
            secondary="آخر ٣٠ يومًا"
          />
          <Card
            label="إجمالي المستخدمين"
            value={state.data.totalUsers}
            secondary="جميع الحسابات"
          />
          <Card
            label="مستخدمون جدد"
            value={state.data.usersCreatedLast7d}
            secondary="آخر ٧ أيام"
          />
          <Card
            label="مستخدمون جدد"
            value={state.data.usersCreatedLast30d}
            secondary="آخر ٣٠ يومًا"
          />
          <Card
            label="دعوات معلقة"
            value={state.data.pendingInvitations}
            secondary="لم تُقبل ولم تنتهِ"
          />
          <Card
            label="نسبة قبول الدعوات"
            value={formatRate(state.data.inviteAcceptanceRate30d)}
            secondary="آخر ٣٠ يومًا"
          />
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------

function EngagementSection({
  state,
}: {
  state: SectionState<EngagementMetrics>;
}) {
  return (
    <section className={styles.section} aria-labelledby="engagement-heading">
      <h2 id="engagement-heading" className={styles.sectionTitle}>
        الاستخدام
      </h2>
      {state.status === 'loading' || state.status === 'idle' ? (
        <div className={styles.loading}>جارٍ التحميل…</div>
      ) : state.status === 'error' ? (
        <div className={styles.error}>تعذر تحميل المقاييس: {state.message}</div>
      ) : (
        <>
          <div className={styles.grid}>
            <Card
              label="مساحات نشطة أسبوعيًا"
              value={state.data.weeklyActiveWorkspaces}
              secondary="تعديل خلال آخر ٧ أيام"
            />
            <Card
              label="تعديلات"
              value={state.data.editsLast7d}
              secondary="آخر ٧ أيام"
            />
            <Card
              label="تعديلات"
              value={state.data.editsLast30d}
              secondary="آخر ٣٠ يومًا"
            />
            <Card
              label="متوسط التعديلات لكل مساحة نشطة"
              value={formatAvg(state.data.avgEditsPerActiveWorkspace)}
              secondary="آخر ٧ أيام"
            />
            <Card
              label="مساحات متعددة الأعضاء"
              value={state.data.workspacesWithMultipleMembers}
              secondary="عضوان أو أكثر"
            />
            <Card
              label="روابط فروع نشطة"
              value={state.data.branchPointers.active}
              secondary={`ملغاة: ${state.data.branchPointers.revoked} · منقطعة: ${state.data.branchPointers.broken}`}
            />
          </div>

          <table className={styles.topTable}>
            <caption>أكثر المساحات نشاطًا (آخر ٧ أيام)</caption>
            <thead>
              <tr>
                <th>المساحة</th>
                <th>عدد التعديلات</th>
              </tr>
            </thead>
            <tbody>
              {state.data.topActiveWorkspaces7d.length === 0 ? (
                <tr>
                  <td colSpan={2} className={styles.empty}>
                    لا توجد بيانات كافية
                  </td>
                </tr>
              ) : (
                state.data.topActiveWorkspaces7d.map((w) => (
                  <tr key={w.workspaceId}>
                    <td>{w.name}</td>
                    <td>{w.editCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

function HealthSection({ state }: { state: SectionState<HealthMetrics> }) {
  return (
    <section className={styles.section} aria-labelledby="health-heading">
      <h2 id="health-heading" className={styles.sectionTitle}>
        الصحة
      </h2>
      {state.status === 'loading' || state.status === 'idle' ? (
        <div className={styles.loading}>جارٍ التحميل…</div>
      ) : state.status === 'error' ? (
        <div className={styles.error}>تعذر تحميل المقاييس: {state.message}</div>
      ) : (
        <>
          <HealthDot
            label="قاعدة البيانات"
            ok={state.data.db.ok}
            error={state.data.db.error}
          />
          <HealthDot
            label="خدمة المصادقة (GoTrue)"
            ok={state.data.gotrue.ok}
            status={state.data.gotrue.status}
            error={state.data.gotrue.error}
          />
          <HealthDot
            label="البريد الإلكتروني"
            ok={state.data.mail.ok}
            error={state.data.mail.error}
          />
          <HealthDot
            label="مفتاح التشفير محمّل"
            ok={state.data.encryption.masterKeyLoaded}
            error={
              state.data.encryption.masterKeyLoaded
                ? undefined
                : 'master-key-missing'
            }
          />
          <div className={styles.grid} style={{ marginTop: '1rem' }}>
            <Card
              label="سعة الوسائط المستخدمة"
              value={formatBytes(state.data.storage.totalMediaBytes)}
              secondary="مجموع حجم الملفات"
            />
            <Card
              label="قراءات المشرف (٢٤ ساعة)"
              value={state.data.adminReadsLast24h}
              secondary="سجل الوصول الإداري"
            />
          </div>
        </>
      )}
    </section>
  );
}

function HealthDot({
  label,
  ok,
  status,
  error,
}: {
  label: string;
  ok: boolean;
  status?: number;
  error?: string;
}) {
  const dotClass = ok ? styles.dotOk : styles.dotBad;
  return (
    <div className={styles.healthRow}>
      <span className={`${styles.dot} ${dotClass}`} />
      <span className={styles.healthLabel}>{label}</span>
      <span
        className={`${styles.healthStatus} ${ok ? '' : styles.healthStatusBad}`}
      >
        {ok
          ? status !== undefined
            ? `سليم (${status})`
            : 'سليم'
          : error ?? 'خلل'}
      </span>
    </div>
  );
}

function Card({
  label,
  value,
  secondary,
}: {
  label: string;
  value: number | string;
  secondary?: string;
}) {
  return (
    <div className={styles.card}>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardValue}>{value}</span>
      {secondary ? <span className={styles.cardSecondary}>{secondary}</span> : null}
    </div>
  );
}
