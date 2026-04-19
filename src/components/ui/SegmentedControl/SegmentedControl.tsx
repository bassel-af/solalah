'use client';

import styles from './SegmentedControl.module.css';

export interface SegmentedControlOption<V extends string> {
  value: V;
  label: string;
}

interface SegmentedControlProps<V extends string> {
  value: V;
  options: readonly SegmentedControlOption<V>[];
  onChange: (value: V) => void;
  disabled?: boolean;
  loading?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
}

/**
 * Inline segmented control — three-way pill picker for mutually exclusive
 * string options. Matches the visual language of the canvas `ViewModeToggle`
 * pill but sits inline in a settings card rather than floating on the canvas.
 *
 * a11y: implemented as a `radiogroup` with `role="radio"` + `aria-checked`
 * per button. Keyboard navigation falls back to native button tabbing.
 */
export function SegmentedControl<V extends string>({
  value,
  options,
  onChange,
  disabled = false,
  loading = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  className,
}: SegmentedControlProps<V>) {
  const isLocked = disabled || loading;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      className={[styles.pill, isLocked ? styles.pillDisabled : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={isLocked}
            className={[styles.segment, isActive ? styles.segmentActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (!isLocked && !isActive) onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
