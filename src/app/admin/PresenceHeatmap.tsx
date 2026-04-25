'use client';

import styles from './AdminDashboard.module.css';

const DAY_LABELS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/**
 * 7×24 heatmap rendered as a CSS grid. No chart library.
 *
 * Buckets are server UTC: dayOfWeek 0 = Sunday. The Arabic labels are
 * translated but the time axis is documented as UTC in the parent
 * section's caption (see PresenceSection).
 */
export function PresenceHeatmap({ grid }: { grid: number[][] }) {
  const flat = grid.flat();
  const max = Math.max(1, ...flat);

  return (
    <div className={styles.heatmap} role="img" aria-label="خريطة الحضور الأسبوعية">
      <span />
      {Array.from({ length: 24 }, (_, h) => (
        <span key={`h-${h}`} className={styles.heatmapHeader}>
          {h}
        </span>
      ))}
      {grid.map((row, day) => (
        <Row key={day} day={day} row={row} max={max} />
      ))}
    </div>
  );
}

function Row({ day, row, max }: { day: number; row: number[]; max: number }) {
  return (
    <>
      <span className={styles.heatmapDayLabel}>{DAY_LABELS_AR[day]}</span>
      {row.map((value, hour) => {
        const opacity = value === 0 ? 0 : 0.15 + (value / max) * 0.85;
        return (
          <span
            key={hour}
            className={styles.heatmapCell}
            style={{ ['--cell-opacity' as string]: opacity }}
            title={`${DAY_LABELS_AR[day]} ${hour}:00 — ${value}`}
          />
        );
      })}
    </>
  );
}
