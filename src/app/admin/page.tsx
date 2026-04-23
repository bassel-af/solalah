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
 * We still render the <h1> heading server-side for two reasons:
 *   1. It's the first paint — users see the page heading immediately
 *      instead of a flash of empty content.
 *   2. Playwright gate tests (e2e-browser/admin-gate.spec.ts) look for
 *      this exact heading to confirm a rendered dashboard, not a redirect.
 */
export default function AdminDashboardPage() {
  return (
    <main className={styles.main}>
      <AdminDashboardClient />
    </main>
  );
}
