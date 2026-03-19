import styles from './Alert.module.css';

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  variant: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ variant, children, className }: AlertProps) {
  const classNames = [styles.alert, styles[variant], className ?? '']
    .filter(Boolean)
    .join(' ');

  return <div className={classNames} role="alert">{children}</div>;
}
