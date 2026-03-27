/**
 * Delete all tree data (individuals, families, edit logs) and re-seed from GEDCOM files.
 *
 * Usage: npx tsx scripts/reseed-tree.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { FAMILIES } from '../src/config/families';
import { parseGedcom } from '../src/lib/gedcom/parser';
import { extractSubtree, expandGraftFamilies } from '../src/lib/gedcom/graph';
import { seedTreeFromGedcomData } from '../src/lib/tree/seed-helpers';
import { resolveGedcomPlaces } from '../src/lib/tree/seed-place-mapping';

const ADMIN_EMAIL = 'bassel@autoflowa.com';

async function buildPlaceNameToIdMap(prisma: PrismaClient): Promise<Map<string, string>> {
  const places = await prisma.place.findMany({
    where: { workspaceId: null },
    select: { id: true, nameAr: true },
  });
  const map = new Map<string, string>();
  for (const place of places) map.set(place.nameAr, place.id);
  return map;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const adminUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (!adminUser) {
      console.error(`Error: No user found with email ${ADMIN_EMAIL}.`);
      process.exit(1);
    }

    // Clean existing tree data (order matters for FK constraints)
    console.log('Cleaning existing tree data...');
    await prisma.branchPointer.deleteMany();
    await prisma.branchShareToken.deleteMany();
    await prisma.treeEditLog.deleteMany();
    await prisma.familyChild.deleteMany();
    await prisma.family.deleteMany();
    await prisma.individual.deleteMany();
    await prisma.familyTree.deleteMany();
    console.log('  Done.');

    const placeNameToId = await buildPlaceNameToIdMap(prisma);
    console.log(`Loaded ${placeNameToId.size} global places for ID lookup.`);

    const entries = Object.entries(FAMILIES).filter(([key]) => key !== 'test');
    console.log(`\nRe-seeding ${entries.length} workspaces...`);

    for (const [, config] of entries) {
      const workspace = await prisma.workspace.findUnique({ where: { slug: config.slug } });
      if (!workspace) {
        console.log(`  Workspace ${config.slug} not found, skipping.`);
        continue;
      }

      if (config.gedcomFile) {
        const gedcomPath = path.resolve(__dirname, '..', 'public', config.gedcomFile.replace(/^\//, ''));
        if (fs.existsSync(gedcomPath)) {
          const gedcomText = fs.readFileSync(gedcomPath, 'utf-8');
          const fullData = parseGedcom(gedcomText);
          const subtreeData = extractSubtree(fullData, config.rootId);
          const gedcomData = expandGraftFamilies(subtreeData, fullData, config.rootId);
          const resolvedData = resolveGedcomPlaces(gedcomData, placeNameToId);
          const result = await seedTreeFromGedcomData(workspace.id, resolvedData, prisma);
          console.log(`  ${config.slug}: ${result.individualCount} individuals, ${result.familyCount} families.`);
        } else {
          console.log(`  ${config.slug}: GEDCOM file not found, skipping.`);
        }
      }
    }

    console.log('Re-seed completed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
