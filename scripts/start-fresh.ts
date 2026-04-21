/**
 * Start fresh: clean links/tokens + re-seed places + re-seed tree data.
 *
 * Usage: npx tsx scripts/start-fresh.ts
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
import { seedPlaces } from '../src/lib/seed/seed-places';
import type { PlacesData } from '../src/lib/seed/seed-places';

const ADMIN_EMAIL = 'bassel@gynat.com';
const PLACES_FILE = path.resolve(__dirname, '../prisma/seed-data/places.json');

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

    // --- Clean links/tokens ---
    console.log('Cleaning branch pointers and share tokens...');
    const pointers = await prisma.branchPointer.deleteMany();
    const tokens = await prisma.branchShareToken.deleteMany();
    console.log(`  Deleted ${pointers.count} pointers, ${tokens.count} tokens.`);

    // --- Clean tree data ---
    console.log('Cleaning tree data...');
    await prisma.treeEditLog.deleteMany();
    await prisma.familyChild.deleteMany();
    await prisma.family.deleteMany();
    await prisma.individual.deleteMany();
    await prisma.familyTree.deleteMany();
    console.log('  Done.');

    // --- Clean and re-seed places ---
    if (fs.existsSync(PLACES_FILE)) {
      console.log('\nRe-seeding places...');
      await prisma.place.deleteMany();
      const raw = fs.readFileSync(PLACES_FILE, 'utf-8');
      const data: PlacesData = JSON.parse(raw);
      const result = await seedPlaces(prisma, data);
      console.log(`  Seeded: ${result.countryCount} countries, ${result.regionCount} regions, ${result.cityCount} cities`);
    } else {
      console.log('\nNo places.json found, skipping places.');
    }

    // --- Re-seed tree data ---
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
        }
      }
    }

    console.log('\nStart fresh completed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
