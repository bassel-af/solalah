import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspaceAdmin, isErrorResponse } from '@/lib/api/workspace-auth';
import { getTreeByWorkspaceId } from '@/lib/tree/queries';
import { dbTreeToGedcomData } from '@/lib/tree/mapper';
import { extractPointedSubtree } from '@/lib/tree/branch-pointer-merge';
import { prepareDeepCopy } from '@/lib/tree/branch-pointer-deep-copy';

type RouteParams = { params: Promise<{ id: string; pointerId: string }> };

// DELETE /api/workspaces/[id]/branch-pointers/[pointerId] — Break a pointer (deep copy + deactivate)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: workspaceId, pointerId } = await params;

  const result = await requireWorkspaceAdmin(request, workspaceId);
  if (isErrorResponse(result)) return result;

  // Find the pointer
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

  // Fetch source tree for deep copy
  const sourceTree = await getTreeByWorkspaceId(pointer.sourceWorkspaceId);
  if (sourceTree) {
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

    // Execute deep copy + pointer update + notification in a transaction
    await prisma.$transaction(async (tx) => {
      // Create copied individuals in the target workspace tree
      const targetTree = await getTreeByWorkspaceId(workspaceId);
      if (targetTree) {
        const individualData = Object.values(copyResult.individuals).map((ind) => ({
          treeId: targetTree.id,
          givenName: ind.givenName || null,
          surname: ind.surname || null,
          fullName: ind.name || null,
          sex: ind.sex,
          birthDate: ind.birth || null,
          birthPlace: ind.birthPlace || null,
          birthDescription: ind.birthDescription || null,
          birthNotes: ind.birthNotes || null,
          birthHijriDate: ind.birthHijriDate || null,
          deathDate: ind.death || null,
          deathPlace: ind.deathPlace || null,
          deathDescription: ind.deathDescription || null,
          deathNotes: ind.deathNotes || null,
          deathHijriDate: ind.deathHijriDate || null,
          notes: ind.notes || null,
          isDeceased: ind.isDeceased,
          isPrivate: ind.isPrivate,
        }));

        if (individualData.length > 0) {
          await (tx as typeof prisma).individual.createMany({ data: individualData });
        }
      }

      // Mark pointer as broken
      await (tx as typeof prisma).branchPointer.update({
        where: { id: pointerId },
        data: { status: 'broken' },
      });

      // Create notification for target workspace admins
      await (tx as typeof prisma).notification.create({
        data: {
          userId: result.user.id,
          type: 'branch_pointer_broken',
          payload: {
            pointerId: pointer.id,
            sourceWorkspaceId: pointer.sourceWorkspaceId,
            action: 'break',
          },
        },
      });
    });
  } else {
    // Source tree no longer available — just mark as broken
    await prisma.branchPointer.update({
      where: { id: pointerId },
      data: { status: 'broken' },
    });
  }

  return NextResponse.json({ data: { status: 'broken' } });
}
