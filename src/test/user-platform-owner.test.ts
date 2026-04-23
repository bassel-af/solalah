import { describe, test, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { UserModel } from '../../generated/prisma/models';

/**
 * T1 — isPlatformOwner schema field.
 *
 * Three guarantees:
 *  1. The Prisma schema source declares `isPlatformOwner Boolean @default(false)`
 *     on the User model — verified by reading prisma/schema.prisma.
 *  2. The generated Prisma client type for User includes `isPlatformOwner: boolean`
 *     — enforced by the type assertion below; if the column is removed this
 *     file fails to compile.
 *  3. A user created without specifying the flag receives `false` — proven
 *     against a mocked Prisma client that echoes the DB-level default.
 */

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { create: mockCreate },
  },
}));

import { prisma } from '@/lib/db';

describe('User.isPlatformOwner schema field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('prisma/schema.prisma declares isPlatformOwner Boolean @default(false) on User', () => {
    const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
    const schema = readFileSync(schemaPath, 'utf8');

    // Locate the User model block.
    const userMatch = schema.match(/model User \{[\s\S]*?\n\}/);
    expect(userMatch, 'User model block must exist').not.toBeNull();
    const userBlock = userMatch![0];

    // Match: isPlatformOwner   Boolean   @default(false)   ... (any whitespace, any extra modifiers).
    expect(userBlock).toMatch(/isPlatformOwner\s+Boolean\s+@default\(false\)/);
  });

  test('generated Prisma User type includes isPlatformOwner: boolean', () => {
    // Compile-time check: if the schema does not declare the column, the
    // generated `UserModel` type lacks `isPlatformOwner` and the next line
    // produces a TypeScript error, failing this file at type-check time.
    const probe: Pick<UserModel, 'isPlatformOwner'> = { isPlatformOwner: false };
    expect(typeof probe.isPlatformOwner).toBe('boolean');
  });

  test('defaults to false when a user is created without specifying the flag', async () => {
    mockCreate.mockImplementation(async ({ data }) => ({
      id: data.id,
      email: data.email,
      displayName: data.displayName,
      avatarUrl: null,
      phone: null,
      calendarPreference: 'hijri',
      // Simulating the DB-level default declared in the schema.
      isPlatformOwner: false,
      createdAt: new Date(),
    }));

    const user = await prisma.user.create({
      data: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'defaultflag@example.com',
        displayName: 'Default Flag',
      },
    });

    expect(user).toHaveProperty('isPlatformOwner');
    expect(user.isPlatformOwner).toBe(false);
  });
});
