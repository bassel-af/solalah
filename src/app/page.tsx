import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>🌳</div>
        <h1 className={styles.title}>شجرة العائلة</h1>
        <p className={styles.subtitle}>
          يمكنك الوصول إلى شجرة عائلتك من خلال الرابط المخصص لها
        </p>
        <div className={styles.divider} />
        <p className={styles.contact}>
          <a href="mailto:contact@autoflowa.com">contact@autoflowa.com</a>
        </p>
      </div>
    </main>
  );
}
