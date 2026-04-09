import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { getMasterKey } from '@/lib/crypto/master-key';

// Phase 10b: validate WORKSPACE_MASTER_KEY at module load. This file is the
// first thing every API route pulls in, so a missing or malformed key fails
// fast at startup instead of producing confusing decryption errors deep in the
// crypto layer on the first request that touches encrypted data.
getMasterKey();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
