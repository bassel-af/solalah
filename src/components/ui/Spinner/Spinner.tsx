import styles from './Spinner.module.css';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}

export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  const spinnerClassName = [styles.spinner, styles[size], className ?? '']
    .filter(Boolean)
    .join(' ');

  if (label) {
    return (
      <div className={styles.wrapper}>
        <div className={spinnerClassName} />
        <span className={styles.label}>{label}</span>
      </div>
    );
  }

  return <div className={spinnerClassName} />;
}
