'use client';

import styles from './AdminDashboard.module.css';
import { PresenceHeatmap } from './PresenceHeatmap';

export interface PresencePayload {
  active1m: number;
  active5m: number;
  activeWorkspaces: number;
  perWorkspace: Array<{
    workspaceId: string;
    name: string;
    activeCount: number;
    dominantCategory: 'viewing' | 'editing';
  }>;
  smallWorkspacesRollup: { workspaceCount: number; activeCount: number } | null;
  heatmap: number[][];
  peak: { count: number; recordedAt: string | null };
}

type SectionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: PresencePayload }
  | { status: 'error'; message: string };

export function PresenceSection({ state }: { state: SectionState }) {
  return (
    <section className={styles.section} aria-labelledby="presence-heading">
      <div id="presence-heading">
        <SectionHead
          kicker="الحضور المباشر"
          title="من في المنصّة الآن"
          meta="بيانات تتجدّد مع كل تحديث"
        />
      </div>
      {state.status === 'loading' || state.status === 'idle' ? (
        <div className={styles.loading}>جارٍ التحميل…</div>
      ) : state.status === 'error' ? (
        <div className={styles.error}>تعذر تحميل المقاييس: {state.message}</div>
      ) : (
        <>
          <div className={styles.presenceHero}>
            <LeadCard
              label="نشطون الآن"
              value={state.data.active1m}
              secondary="آخر ٦٠ ثانية"
            />
            <LeadCard
              label="نشطون · ٥ دقائق"
              value={state.data.active5m}
              secondary="نافذة الـ ٥ دقائق"
            />
            <LeadCard
              label="مساحات نشطة"
              value={state.data.activeWorkspaces}
              secondary="تتضمّن المتجمّعة"
            />
          </div>

          <div className={styles.tableWrap}>
            <span className={styles.tableCaption}>
              توزيع النشاط الحالي حسب المساحة
            </span>
            <table className={styles.topTable}>
              <thead>
                <tr>
                  <th>المساحة</th>
                  <th style={{ textAlign: 'end' }}>النشطون</th>
                  <th style={{ textAlign: 'end' }}>النوع السائد</th>
                </tr>
              </thead>
              <tbody>
                {state.data.perWorkspace.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={styles.empty}>
                      لا توجد بيانات كافية
                    </td>
                  </tr>
                ) : (
                  state.data.perWorkspace.map((w) => (
                    <tr key={w.workspaceId}>
                      <td className={styles.colName}>{w.name}</td>
                      <td className={styles.colNumber}>{w.activeCount}</td>
                      <td style={{ textAlign: 'end' }}>
                        <span
                          className={`${styles.tag} ${
                            w.dominantCategory === 'editing'
                              ? styles.tagGold
                              : styles.tagEmerald
                          }`}
                        >
                          {w.dominantCategory === 'editing' ? 'تعديل' : 'مشاهدة'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {state.data.smallWorkspacesRollup ? (
            <div className={styles.presenceRollup}>
              مساحاتٌ صغيرة (أقل من ٥ أعضاء):{' '}
              <strong>{state.data.smallWorkspacesRollup.workspaceCount}</strong>{' '}
              مساحة،{' '}
              <strong>{state.data.smallWorkspacesRollup.activeCount}</strong>{' '}
              مستخدمٌ نشط
            </div>
          ) : null}

          <PresenceHeatmap grid={state.data.heatmap} />

          <div className={styles.peakLine}>
            الذروة المسجّلة: <strong>{state.data.peak.count}</strong>
            {state.data.peak.recordedAt
              ? ` — ${new Date(state.data.peak.recordedAt).toLocaleString('ar')}`
              : ''}
          </div>

          <button
            className={styles.maintenanceButton}
            type="button"
            disabled
            title="ميزة قادمة"
          >
            جدولة صيانة (قريبًا)
          </button>
        </>
      )}
    </section>
  );
}

function SectionHead({
  kicker,
  title,
  meta,
}: {
  kicker: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className={styles.sectionHead}>
      <div>
        <span className={styles.sectionKicker}>{kicker}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {meta ? <span className={styles.sectionMeta}>{meta}</span> : null}
    </div>
  );
}

function LeadCard({
  label,
  value,
  secondary,
}: {
  label: string;
  value: number;
  secondary?: string;
}) {
  return (
    <div className={`${styles.card} ${styles.cardLead}`}>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardValue}>{value}</span>
      {secondary ? (
        <span className={styles.cardSecondary}>{secondary}</span>
      ) : null}
    </div>
  );
}
