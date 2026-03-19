'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from '../auth.module.css';

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });

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
        <h1 className={styles.title}>إنشاء حساب</h1>
        <p className={styles.subtitle}>سجّل حساباً جديداً في منصة صلة</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor="displayName" className={styles.label}>الاسم</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={styles.input}
              placeholder="الاسم الكامل"
              required
            />
          </div>

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
              placeholder="٦ أحرف على الأقل"
              dir="ltr"
              minLength={6}
              required
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
          </button>
        </form>

        <p className={styles.switchLink}>
          لديك حساب بالفعل؟{' '}
          <a href="/auth/login">تسجيل الدخول</a>
        </p>
      </div>
    </main>
  );
}
