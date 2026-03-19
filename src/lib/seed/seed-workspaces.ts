import type { FamilyConfig } from '@/config/families';
import { prisma } from '@/lib/db';

export async function seedWorkspacesFromFamilies(
  families: Record<string, FamilyConfig>,
  adminUserId: string,
): Promise<void> {
  if (!adminUserId) {
    throw new Error('Admin user ID is required');
  }

  const entries = Object.entries(families).filter(([key]) => key !== 'test');

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
  }
}
