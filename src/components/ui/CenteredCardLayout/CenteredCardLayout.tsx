import styles from './CenteredCardLayout.module.css';

interface CenteredCardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function CenteredCardLayout({ children, className }: CenteredCardLayoutProps) {
  const cardClassName = className
    ? `${styles.card} ${className}`
    : styles.card;

  return (
    <main className={styles.container}>
      <div className={cardClassName}>
        {children}
      </div>
    </main>
  );
}
