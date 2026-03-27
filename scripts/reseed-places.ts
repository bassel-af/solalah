/**
 * Delete all places and re-seed from places.json.
 *
 * Usage: npx tsx scripts/reseed-places.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { seedPlaces } from '../src/lib/seed/seed-places';
import type { PlacesData } from '../src/lib/seed/seed-places';

const PLACES_FILE = path.resolve(__dirname, '../prisma/seed-data/places.json');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Deleting existing places...');
    await prisma.place.deleteMany();
    console.log('  Done.');

    if (!fs.existsSync(PLACES_FILE)) {
      console.error(`Error: ${PLACES_FILE} not found. Run "pnpm preprocess-geonames" first.`);
      process.exit(1);
    }

    console.log('Seeding places...');
    const raw = fs.readFileSync(PLACES_FILE, 'utf-8');
    const data: PlacesData = JSON.parse(raw);
    const result = await seedPlaces(prisma, data);

    if (result.skipped) {
      console.log('Places already seeded, skipped.');
    } else {
      console.log(`Seeded: ${result.countryCount} countries, ${result.regionCount} regions, ${result.cityCount} cities`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
