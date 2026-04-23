import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkPlatformOwnerForLayout } from '@/lib/api/admin-auth';

/**
 * /admin layout — server-side gate for the platform owner dashboard.
 *
 * Defense in depth:
 *   1. Middleware (src/middleware.ts) bounces non-owners before this layout
 *      ever runs — so under normal flows this re-check is redundant.
 *   2. This layout re-checks at the React-server-component layer in case
 *      the matcher misses an edge case (e.g. internal navigation that
 *      bypasses middleware in a future Next version).
 *   3. Every /api/admin/* route handler ALSO calls `requirePlatformOwner`.
 *
 * The decision logic is in `checkPlatformOwnerForLayout` — pure and
 * unit-tested in src/test/admin-layout-guard.test.ts.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const result = await checkPlatformOwnerForLayout(supabase);

  if (!result.ok) {
    redirect(result.redirectTo);
  }

  return <>{children}</>;
}
