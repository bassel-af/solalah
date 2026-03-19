import { prisma } from '@/lib/db';

interface GoTrueUser {
  id: string;
  email?: string;
  phone?: string | null;
  user_metadata?: Record<string, string>;
}

/**
 * Upserts a GoTrue user into the public.users table.
 * Used by both the sync-user API route and the callback route (server-side).
 */
export async function syncUserToDb(user: GoTrueUser) {
  const email = user.email!;
  const displayName = user.user_metadata?.display_name || email.split('@')[0];
  const avatarUrl = user.user_metadata?.avatar_url || null;
  const phone = user.phone || null;

  return prisma.user.upsert({
    where: { id: user.id },
    update: { email, displayName, avatarUrl, phone },
    create: { id: user.id, email, displayName, avatarUrl, phone },
  });
}
