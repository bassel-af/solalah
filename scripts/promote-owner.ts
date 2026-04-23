/**
 * scripts/promote-owner.ts — bootstrap helper for the platform owner role.
 *
 * Reads the target email from PROMOTE_OWNER_EMAIL, prints a confirmation
 * prompt, and (only after typing YES) sets `isPlatformOwner=true` on the
 * matching user.
 *
 * Usage:
 *   PROMOTE_OWNER_EMAIL=you@example.com pnpm tsx scripts/promote-owner.ts
 *
 * Notes:
 *   - DOES NOT ship a corresponding /api/admin/promote route. The flag is
 *     intentionally only mutable through this out-of-band script so an
 *     attacker who pops a session can't escalate themselves.
 *   - Running this script is a one-time bootstrap step; once the owner is
 *     set, future promotions can happen via the admin dashboard if/when we
 *     decide to expose them.
 *   - Exits non-zero on any failure.
 */

import readline from 'node:readline';
import { promoteOwnerByEmail } from './promote-owner-lib';
import { prisma } from '../src/lib/db';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main(): Promise<void> {
  const email = (process.env.PROMOTE_OWNER_EMAIL ?? '').trim();
  if (!email) {
    console.error('PROMOTE_OWNER_EMAIL env var is required.');
    process.exit(1);
  }

  console.log(`About to set isPlatformOwner=true for ${email}.`);
  const answer = await ask('Type YES to confirm: ');

  if (answer.trim() !== 'YES') {
    console.error('Aborted. Confirmation not given.');
    process.exit(1);
  }

  try {
    const result = await promoteOwnerByEmail(email);
    console.log(`OK — ${result.email} is now a platform owner (id=${result.id}).`);
  } catch (err) {
    console.error('Failed to promote user:');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
