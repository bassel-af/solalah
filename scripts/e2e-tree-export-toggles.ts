/**
 * E2E verification for enableTreeExport + allowMemberExport toggles.
 *
 * Creates a throwaway admin + member user via the Supabase admin API, an
 * empty workspace with the admin as creator, a membership row for the
 * member, and then exercises GET /api/workspaces/[id]/tree/export across
 * the three toggle-state scenarios. Cleans up on exit.
 *
 * Requires: dev server on localhost:4000, Docker Supabase stack up, .env.local.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { getOrCreateWorkspaceKey } from '../src/lib/tree/encryption';

const BASE_URL = 'http://localhost:4000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.DATABASE_URL!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DB_URL) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: DB_URL });
const prisma = new PrismaClient({ adapter });

interface AdminUser {
  id: string;
  email: string;
  access_token: string;
}

async function createAuthUser(email: string): Promise<AdminUser> {
  const resCreate = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: 'Test1234!',
      email_confirm: true,
    }),
  });
  if (!resCreate.ok) {
    throw new Error(`admin create user failed: ${resCreate.status} ${await resCreate.text()}`);
  }
  const created = await resCreate.json();
  const userId = created.id as string;

  const resToken = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email, password: 'Test1234!' }),
  });
  if (!resToken.ok) {
    throw new Error(`token fetch failed: ${resToken.status} ${await resToken.text()}`);
  }
  const token = await resToken.json();
  return { id: userId, email, access_token: token.access_token as string };
}

async function deleteAuthUser(userId: string) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

async function main() {
  const stamp = uid();
  const adminEmail = `e2e-admin-${stamp}@test.local`;
  const memberEmail = `e2e-member-${stamp}@test.local`;
  const slug = `e2e-export-${stamp}`;

  let adminAuth: AdminUser | null = null;
  let memberAuth: AdminUser | null = null;
  let workspaceId: string | null = null;

  let failed = false;

  try {
    console.log(`\n🔧 Creating admin + member auth users...`);
    adminAuth = await createAuthUser(adminEmail);
    memberAuth = await createAuthUser(memberEmail);

    // Mirror users into public.users (same UUID as GoTrue)
    await prisma.user.create({
      data: { id: adminAuth.id, email: adminEmail, displayName: `Admin ${stamp}` },
    });
    await prisma.user.create({
      data: { id: memberAuth.id, email: memberEmail, displayName: `Member ${stamp}` },
    });

    console.log(`🔧 Creating workspace ${slug}...`);
    const ws = await prisma.workspace.create({
      data: { slug, nameAr: `اختبار ${stamp}`, createdById: adminAuth.id },
    });
    workspaceId = ws.id;

    // Memberships
    await prisma.workspaceMembership.create({
      data: { userId: adminAuth.id, workspaceId: ws.id, role: 'workspace_admin', permissions: [] },
    });
    await prisma.workspaceMembership.create({
      data: { userId: memberAuth.id, workspaceId: ws.id, role: 'workspace_member', permissions: [] },
    });

    // Phase 10b: wrap a data key so the export route doesn't throw on decrypt
    await getOrCreateWorkspaceKey(ws.id);

    // Family tree (empty is fine — export still returns 200 with HEAD/TRLR)
    await prisma.familyTree.create({ data: { workspaceId: ws.id } });

    async function setToggles(enableTreeExport: boolean, allowMemberExport: boolean) {
      await prisma.workspace.update({
        where: { id: ws.id },
        data: { enableTreeExport, allowMemberExport },
      });
    }

    async function exportStatus(auth: AdminUser): Promise<number> {
      const res = await fetch(
        `${BASE_URL}/api/workspaces/${ws.id}/tree/export?version=5.5.1`,
        { headers: { authorization: `Bearer ${auth.access_token}` } },
      );
      return res.status;
    }

    async function patchToggle(auth: AdminUser, body: Record<string, boolean>): Promise<number> {
      const res = await fetch(`${BASE_URL}/api/workspaces/${ws.id}`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${auth.access_token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return res.status;
    }

    const scenarios: { label: string; run: () => Promise<boolean> }[] = [
      {
        label: 'Scenario 1: enableTreeExport=false → 403 for admin AND member',
        run: async () => {
          await setToggles(false, false);
          const adminStatus = await exportStatus(adminAuth!);
          const memberStatus = await exportStatus(memberAuth!);
          const ok = adminStatus === 403 && memberStatus === 403;
          console.log(`   admin=${adminStatus}, member=${memberStatus} ${ok ? '✅' : '❌'}`);
          return ok;
        },
      },
      {
        label: 'Scenario 2: enableTreeExport=true, allowMemberExport=false → admin 200, member 403',
        run: async () => {
          await setToggles(true, false);
          const adminStatus = await exportStatus(adminAuth!);
          const memberStatus = await exportStatus(memberAuth!);
          const ok = adminStatus === 200 && memberStatus === 403;
          console.log(`   admin=${adminStatus}, member=${memberStatus} ${ok ? '✅' : '❌'}`);
          return ok;
        },
      },
      {
        label: 'Scenario 3: enableTreeExport=true, allowMemberExport=true → both 200',
        run: async () => {
          await setToggles(true, true);
          const adminStatus = await exportStatus(adminAuth!);
          const memberStatus = await exportStatus(memberAuth!);
          const ok = adminStatus === 200 && memberStatus === 200;
          console.log(`   admin=${adminStatus}, member=${memberStatus} ${ok ? '✅' : '❌'}`);
          return ok;
        },
      },
      {
        label: 'Scenario 4: PATCH admin-only — member gets 403 trying to toggle',
        run: async () => {
          const status = await patchToggle(memberAuth!, { enableTreeExport: false });
          const ok = status === 403;
          console.log(`   member PATCH=${status} ${ok ? '✅' : '❌'}`);
          return ok;
        },
      },
      {
        label: 'Scenario 5: PATCH dependency — admin cannot allowMemberExport=true while enableTreeExport=false',
        run: async () => {
          await setToggles(false, false);
          const status = await patchToggle(adminAuth!, { allowMemberExport: true });
          const ok = status === 400;
          console.log(`   admin PATCH=${status} ${ok ? '✅' : '❌'}`);
          return ok;
        },
      },
      {
        label: 'Scenario 6: PATCH cascade — disabling enableTreeExport auto-disables allowMemberExport',
        run: async () => {
          // Arrange: both on
          await setToggles(true, true);
          const patchStatus = await patchToggle(adminAuth!, { enableTreeExport: false });
          const row = await prisma.workspace.findUnique({
            where: { id: ws.id },
            select: { enableTreeExport: true, allowMemberExport: true },
          });
          const ok = patchStatus === 200 && row?.enableTreeExport === false && row?.allowMemberExport === false;
          console.log(`   PATCH=${patchStatus}, row=${JSON.stringify(row)} ${ok ? '✅' : '❌'}`);
          return ok;
        },
      },
    ];

    console.log(`\n🔥 Running ${scenarios.length} E2E scenarios...\n`);
    for (const s of scenarios) {
      console.log(`▶ ${s.label}`);
      const ok = await s.run();
      if (!ok) failed = true;
    }
  } catch (err) {
    console.error('❌ script error:', err);
    failed = true;
  } finally {
    console.log(`\n🧹 Cleanup...`);
    if (workspaceId) {
      await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
    if (adminAuth) {
      await prisma.user.delete({ where: { id: adminAuth.id } }).catch(() => {});
      await deleteAuthUser(adminAuth.id);
    }
    if (memberAuth) {
      await prisma.user.delete({ where: { id: memberAuth.id } }).catch(() => {});
      await deleteAuthUser(memberAuth.id);
    }
    await prisma.$disconnect();
  }

  if (failed) {
    console.log(`\n❌ One or more scenarios failed`);
    process.exit(1);
  }
  console.log(`\n✅ All scenarios passed`);
}

main();
