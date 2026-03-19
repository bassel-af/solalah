import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { FAMILIES } from '../src/config/families';

// We can't use the @/ alias or the singleton from src/lib/db.ts here
// because this script runs outside of Next.js/Vite.
// Instead, we create a standalone Prisma client.

async function main() {
  const adminUserId = process.env.SEED_ADMIN_USER_ID || process.argv[2];

  if (!adminUserId) {
    console.error(
      'Error: Admin user ID is required.\n' +
        'Provide it via SEED_ADMIN_USER_ID env var or as the first argument.\n' +
        'Usage: npx tsx prisma/seed.ts <admin-user-id>',
    );
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const entries = Object.entries(FAMILIES).filter(([key]) => key !== 'test');

    console.log(`Seeding ${entries.length} workspaces for admin user ${adminUserId}...`);

    for (const [, config] of entries) {
      const workspace = await prisma.workspace.upsert({
        where: { slug: config.slug },
        update: { nameAr: config.displayName },
        create: {
          slug: config.slug,
          nameAr: config.displayName,
          createdById: adminUserId,
        },
      });

      await prisma.workspaceMembership.upsert({
        where: {
          userId_workspaceId: {
            userId: adminUserId,
            workspaceId: workspace.id,
          },
        },
        update: {},
        create: {
          userId: adminUserId,
          workspaceId: workspace.id,
          role: 'workspace_admin',
        },
      });

      console.log(`  Seeded workspace: ${config.slug} (${config.displayName})`);
    }

    console.log('Seed completed successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
