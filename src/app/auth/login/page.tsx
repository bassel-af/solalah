'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from '../auth.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = '/';
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>🌳</div>
        <h1 className={styles.title}>تسجيل الدخول</h1>
        <p className={styles.subtitle}>أدخل بياناتك للوصول إلى منصة صلة</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="name@example.com"
              dir="ltr"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>كلمة المرور</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              dir="ltr"
              required
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>

        <p className={styles.switchLink}>
          ليس لديك حساب؟{' '}
          <a href="/auth/signup">إنشاء حساب</a>
        </p>
      </div>
    </main>
  );
}
