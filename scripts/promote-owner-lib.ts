import { prisma } from '@/lib/db';

/**
 * Promote a user to platform owner by email.
 *
 * Pure data-mutation function used by `scripts/promote-owner.ts`. The script
 * wraps this with a TTY confirmation prompt; this function trusts that the
 * caller has already confirmed and just performs the lookup + update.
 *
 * Throws on:
 *   - empty / whitespace-only email,
 *   - no user matching the email.
 */
export async function promoteOwnerByEmail(emailRaw: string) {
  const email = (emailRaw ?? '').trim();
  if (!email) {
    throw new Error('Email is required');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isPlatformOwner: true },
  });

  if (!user) {
    throw new Error(`User not found for email: ${email}`);
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { isPlatformOwner: true },
    select: { id: true, email: true, isPlatformOwner: true },
  });
}
