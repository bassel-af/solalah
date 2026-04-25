'use client';

import styles from './AdminDashboard.module.css';

const DAY_LABELS_AR = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

/**
 * 7×24 heatmap rendered as a CSS grid. No chart library.
 *
 * Buckets are server UTC: dayOfWeek 0 = Sunday. The heritage emerald ramp
 * is driven by two CSS custom properties:
 *   --cell-base     base alpha for the emerald fill (0 when empty)
 *   --cell-strength normalized intensity (0..1) used by the gold inner ring
 *
 * The Arabic labels are translated but the time axis is documented as UTC
 * in the parent section's caption (see PresenceSection).
 */
export function PresenceHeatmap({ grid }: { grid: number[][] }) {
  const flat = grid.flat();
  const max = Math.max(1, ...flat);

  return (
    <div className={styles.heatmapWrap}>
      <div className={styles.heatmapHead}>
        <span className={styles.heatmapTitle}>
          خريطة الحضور الأسبوعيّة (توقيت عالميّ)
        </span>
        <span className={styles.heatmapLegend}>
          <span>أقلّ</span>
          <span className={styles.heatmapLegendBar}>
            <span style={{ background: 'rgba(46, 152, 118, 0.06)' }} />
            <span style={{ background: 'rgba(46, 152, 118, 0.22)' }} />
            <span style={{ background: 'rgba(46, 152, 118, 0.4)' }} />
            <span style={{ background: 'rgba(46, 152, 118, 0.58)' }} />
            <span style={{ background: 'rgba(46, 152, 118, 0.78)' }} />
          </span>
          <span>أكثر</span>
        </span>
      </div>

      <div
        className={styles.heatmap}
        role="img"
        aria-label="خريطة الحضور الأسبوعية"
      >
        <span aria-hidden />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={`h-${h}`} className={styles.heatmapHeader}>
            {h}
          </span>
        ))}
        {grid.map((row, day) => (
          <Row key={day} day={day} row={row} max={max} />
        ))}
      </div>
    </div>
  );
}

function Row({ day, row, max }: { day: number; row: number[]; max: number }) {
  return (
    <>
      <span className={styles.heatmapDayLabel}>{DAY_LABELS_AR[day]}</span>
      {row.map((value, hour) => {
        if (value === 0) {
          return (
            <span
              key={hour}
              className={`${styles.heatmapCell} ${styles.heatmapCellEmpty}`}
              title={`${DAY_LABELS_AR[day]} ${hour}:00 — لا نشاط`}
            />
          );
        }
        const strength = value / max; // 0..1
        // base alpha 0.18 + strength*0.55 ≈ 0.18..0.73 emerald
        const styleVars: Record<string, string | number> = {
          '--cell-base': 0.18,
          '--cell-strength': strength,
        };
        return (
          <span
            key={hour}
            className={styles.heatmapCell}
            style={styleVars as React.CSSProperties}
            title={`${DAY_LABELS_AR[day]} ${hour}:00 — ${value}`}
          />
        );
      })}
    </>
  );
}
