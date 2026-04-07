import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspaceAdmin, isErrorResponse } from '@/lib/api/workspace-auth';
import { getTreeByWorkspaceId, getOrCreateTree } from '@/lib/tree/queries';
import { dbTreeToGedcomData } from '@/lib/tree/mapper';
import { extractPointedSubtree } from '@/lib/tree/branch-pointer-merge';
import { prepareDeepCopy, persistDeepCopy } from '@/lib/tree/branch-pointer-deep-copy';
import { snapshotBranchPointer, buildAuditDescription } from '@/lib/tree/audit';

type RouteParams = { params: Promise<{ id: string; pointerId: string }> };

// POST /api/workspaces/[id]/branch-pointers/[pointerId]/copy — Deep copy pointed branch (keep pointer active)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: workspaceId, pointerId } = await params;

  const result = await requireWorkspaceAdmin(request, workspaceId);
  if (isErrorResponse(result)) return result;

  const pointer = await prisma.branchPointer.findUnique({
    where: { id: pointerId },
  });

  if (!pointer || pointer.targetWorkspaceId !== workspaceId) {
    return NextResponse.json(
      { error: 'الرابط غير موجود' },
      { status: 404 },
    );
  }

  if (pointer.status !== 'active') {
    return NextResponse.json(
      { error: 'الرابط غير نشط' },
      { status: 400 },
    );
  }

  // Fetch source tree
  const sourceTree = await getTreeByWorkspaceId(pointer.sourceWorkspaceId);
  if (!sourceTree) {
    return NextResponse.json(
      { error: 'شجرة المصدر غير متوفرة' },
      { status: 404 },
    );
  }

  const sourceData = dbTreeToGedcomData(sourceTree);
  const pointedSubtree = extractPointedSubtree(sourceData, {
    rootIndividualId: pointer.rootIndividualId,
    depthLimit: pointer.depthLimit,
    includeGrafts: pointer.includeGrafts,
  });

  const copyResult = prepareDeepCopy(pointedSubtree, {
    anchorIndividualId: pointer.anchorIndividualId,
    relationship: pointer.relationship as 'child' | 'sibling' | 'spouse' | 'parent',
    pointerId: pointer.id,
  });

  const targetTree = await getOrCreateTree(workspaceId);

  await prisma.$transaction(async (tx) => {
    const txPrisma = tx as typeof prisma;

    await persistDeepCopy(txPrisma, targetTree.id, copyResult);

    // Mark pointer as broken (deep copy replaces the live link)
    await txPrisma.branchPointer.update({
      where: { id: pointerId },
      data: { status: 'broken' },
    });

    // Log the action
    await txPrisma.treeEditLog.create({
      data: {
        treeId: targetTree.id,
        userId: result.user.id,
        action: 'deep_copy',
        entityType: 'branch_pointer',
        entityId: pointerId,
        snapshotBefore: snapshotBranchPointer(pointer),
        snapshotAfter: snapshotBranchPointer({ ...pointer, status: 'broken' }),
        description: buildAuditDescription('deep_copy', 'branch_pointer'),
      },
    });
  });

  return NextResponse.json({
    data: {
      copiedIndividuals: Object.keys(copyResult.individuals).length,
      copiedFamilies: Object.keys(copyResult.families).length,
      status: 'broken',
    },
  });
}
