'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

export default function Home() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/dashboard';
      } else {
        setChecking(false);
      }
    });
  }, []);

  if (checking) {
    return null;
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>🌳</div>
        <h1 className={styles.title}>شجرة العائلة</h1>
        <p className={styles.subtitle}>
          يمكنك الوصول إلى شجرة عائلتك من خلال الرابط المخصص لها
        </p>
        <div className={styles.divider}>
          <span className={styles.dividerDot} />
        </div>
        <p className={styles.contact}>
          <span className={styles.contactLabel}>تواصل معنا</span>
          <a href="mailto:contact@autoflowa.com">contact@autoflowa.com</a>
        </p>
        <p className={styles.switchLink}>
          <a href="/auth/login">تسجيل الدخول</a>
        </p>
      </div>
    </main>
  );
}
