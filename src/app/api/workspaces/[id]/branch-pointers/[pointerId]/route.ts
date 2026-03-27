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
      const txPrisma = tx as typeof prisma;
      const targetTree = await getTreeByWorkspaceId(workspaceId);
      if (targetTree) {
        // Create copied individuals
        const individualData = Object.values(copyResult.individuals).map((ind) => ({
          id: ind.id,
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
          await txPrisma.individual.createMany({ data: individualData });
        }

        // Create copied families
        const familyData = Object.values(copyResult.families).map((fam) => ({
          id: fam.id,
          treeId: targetTree.id,
          husbandId: fam.husband || null,
          wifeId: fam.wife || null,
        }));

        if (familyData.length > 0) {
          await txPrisma.family.createMany({ data: familyData });
        }

        // Create stitch family
        if (copyResult.stitchFamily) {
          const sf = copyResult.stitchFamily;
          await txPrisma.family.create({
            data: {
              id: sf.id,
              treeId: targetTree.id,
              husbandId: sf.husband || null,
              wifeId: sf.wife || null,
            },
          });
          for (const childId of sf.children) {
            await txPrisma.familyChild.create({
              data: { familyId: sf.id, individualId: childId },
            });
          }
        }

        // Create family_children records
        for (const fam of Object.values(copyResult.families)) {
          for (const childId of fam.children) {
            await txPrisma.familyChild.create({
              data: { familyId: fam.id, individualId: childId },
            });
          }
        }
      }

      // Mark pointer as broken
      await txPrisma.branchPointer.update({
        where: { id: pointerId },
        data: { status: 'broken' },
      });

      // Create notification for target workspace admins
      await txPrisma.notification.create({
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
