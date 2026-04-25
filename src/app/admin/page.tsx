import styles from './AdminDashboard.module.css';
import AdminDashboardClient from './AdminDashboardClient';

/**
 * /admin — platform owner dashboard.
 *
 * The layout (src/app/admin/layout.tsx) has already verified the visitor
 * is a platform owner by this point. This page is a thin shell: the
 * metrics live in a client component because they're fetched via the
 * browser's Supabase session (Bearer attached through `apiFetch`).
 *
 * The h1 heading is rendered by the client (it depends on the live
 * "last refreshed" timestamp), but Playwright gate tests still find it
 * by accessible name.
 */
export default function AdminDashboardPage() {
  return (
    <main className={styles.surface}>
      <div className={styles.main}>
        <AdminDashboardClient />
      </div>
    </main>
  );
}
