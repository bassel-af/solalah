/**
 * Delete all branch pointers and share tokens.
 *
 * Usage: npx tsx scripts/clean-links.ts
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const pointers = await prisma.branchPointer.deleteMany();
    const tokens = await prisma.branchShareToken.deleteMany();
    console.log(`Deleted ${pointers.count} branch pointers, ${tokens.count} share tokens.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
