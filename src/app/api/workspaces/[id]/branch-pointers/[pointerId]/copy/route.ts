import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspaceAdmin, isErrorResponse } from '@/lib/api/workspace-auth';
import { getTreeByWorkspaceId, getOrCreateTree } from '@/lib/tree/queries';
import { dbTreeToGedcomData } from '@/lib/tree/mapper';
import { extractPointedSubtree } from '@/lib/tree/branch-pointer-merge';
import { prepareDeepCopy } from '@/lib/tree/branch-pointer-deep-copy';

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
      marriageContractDate: fam.marriageContract?.date || null,
      marriageContractHijriDate: fam.marriageContract?.hijriDate || null,
      marriageContractPlace: fam.marriageContract?.place || null,
      marriageContractDescription: fam.marriageContract?.description || null,
      marriageContractNotes: fam.marriageContract?.notes || null,
      marriageDate: fam.marriage?.date || null,
      marriageHijriDate: fam.marriage?.hijriDate || null,
      marriagePlace: fam.marriage?.place || null,
      marriageDescription: fam.marriage?.description || null,
      marriageNotes: fam.marriage?.notes || null,
      divorceDate: fam.divorce?.date || null,
      divorceHijriDate: fam.divorce?.hijriDate || null,
      divorcePlace: fam.divorce?.place || null,
      divorceDescription: fam.divorce?.description || null,
      divorceNotes: fam.divorce?.notes || null,
      isDivorced: fam.isDivorced,
    }));

    if (familyData.length > 0) {
      await txPrisma.family.createMany({ data: familyData });
    }

    // Create stitch family (connects copied root to anchor)
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

      // Add stitch family children
      for (const childId of sf.children) {
        await txPrisma.familyChild.create({
          data: { familyId: sf.id, individualId: childId },
        });
      }
    }

    // Create family_children records for copied families
    for (const fam of Object.values(copyResult.families)) {
      for (const childId of fam.children) {
        await txPrisma.familyChild.create({
          data: { familyId: fam.id, individualId: childId },
        });
      }
    }

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
