import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTreeEditor, isErrorResponse } from '@/lib/api/workspace-auth';
import { treeMutateLimiter, rateLimitResponse } from '@/lib/api/rate-limit';
import { getOrCreateTree, getTreeIndividual, touchTreeTimestamp } from '@/lib/tree/queries';
import { createFamilySchema } from '@/lib/tree/schemas';
import { validateFamilyGender } from '@/lib/tree/family-validators';
import { parseValidatedBody, isParseError } from '@/lib/api/route-helpers';
import { isPointedIndividualInWorkspace } from '@/lib/tree/branch-pointer-queries';
import { snapshotFamily, buildAuditDescription, JSON_NULL } from '@/lib/tree/audit';

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/workspaces/[id]/tree/families — Create a new family
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: workspaceId } = await params;

  const result = await requireTreeEditor(request, workspaceId);
  if (isErrorResponse(result)) return result;

  const { allowed, retryAfterSeconds } = treeMutateLimiter.check(result.user.id);
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  const parsed = await parseValidatedBody(request, createFamilySchema);
  if (isParseError(parsed)) return parsed;

  const { husbandId, wifeId, childrenIds, ...eventFields } = parsed.data;

  // Self-marriage check
  if (husbandId && wifeId && husbandId === wifeId) {
    return NextResponse.json(
      { error: 'لا يمكن أن يكون الشخص زوجًا وزوجة في نفس العائلة' },
      { status: 400 },
    );
  }

  const tree = await getOrCreateTree(workspaceId);

  // Guard: isUmmWalad requires workspace enableUmmWalad
  if (eventFields.isUmmWalad) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { enableUmmWalad: true } });
    if (!workspace?.enableUmmWalad) {
      return NextResponse.json(
        { error: 'ميزة أم ولد غير مفعّلة في هذه المساحة' },
        { status: 400 },
      );
    }
  }

  // Verify husband belongs to this tree
  if (husbandId) {
    const husband = await getTreeIndividual(tree.id, husbandId);
    if (!husband) {
      return NextResponse.json(
        { error: 'الزوج غير موجود في هذه الشجرة' },
        { status: 400 },
      );
    }
    // Reject creating families with pointed (read-only) individuals
    const husbandPointed = await isPointedIndividualInWorkspace(husbandId, workspaceId);
    if (husbandPointed) {
      return NextResponse.json(
        { error: 'لا يمكن إنشاء عائلة مع شخص مرتبط من مساحة أخرى' },
        { status: 403 },
      );
    }
  }

  // Verify wife belongs to this tree
  if (wifeId) {
    const wife = await getTreeIndividual(tree.id, wifeId);
    if (!wife) {
      return NextResponse.json(
        { error: 'الزوجة غير موجودة في هذه الشجرة' },
        { status: 400 },
      );
    }
    // Reject creating families with pointed (read-only) individuals
    const wifePointed = await isPointedIndividualInWorkspace(wifeId, workspaceId);
    if (wifePointed) {
      return NextResponse.json(
        { error: 'لا يمكن إنشاء عائلة مع شخص مرتبط من مساحة أخرى' },
        { status: 403 },
      );
    }
  }

  // Validate gender consistency for husband/wife roles
  const genderCheck = await validateFamilyGender(husbandId ?? null, wifeId ?? null, tree.id);
  if (!genderCheck.valid) {
    return NextResponse.json({ error: genderCheck.error }, { status: 400 });
  }

  // Duplicate family check (both directions for null-sex cases)
  if (husbandId && wifeId) {
    const existingFamily = await prisma.family.findFirst({
      where: {
        treeId: tree.id,
        OR: [
          { husbandId, wifeId },
          { husbandId: wifeId, wifeId: husbandId },
        ],
      },
    });
    if (existingFamily) {
      return NextResponse.json(
        { error: 'يوجد سجل عائلة بين هذين الشخصين بالفعل' },
        { status: 409 },
      );
    }
  }

  // Verify all children belong to this tree
  if (childrenIds) {
    for (const cId of childrenIds) {
      const child = await getTreeIndividual(tree.id, cId);
      if (!child) {
        return NextResponse.json(
          { error: `الابن/الابنة ${cId} غير موجود في هذه الشجرة` },
          { status: 400 },
        );
      }
    }
  }

  const family = await prisma.family.create({
    data: {
      treeId: tree.id,
      husbandId: husbandId ?? null,
      wifeId: wifeId ?? null,
      ...eventFields,
      children: childrenIds
        ? {
            create: childrenIds.map((individualId) => ({ individualId })),
          }
        : undefined,
    },
    include: { children: true },
  });

  await Promise.all([
    prisma.treeEditLog.create({
      data: {
        treeId: tree.id,
        userId: result.user.id,
        action: 'create',
        entityType: 'family',
        entityId: family.id,
        snapshotBefore: JSON_NULL,
        snapshotAfter: snapshotFamily(family),
        description: buildAuditDescription('create', 'family'),
      },
    }),
    touchTreeTimestamp(tree.id),
  ]);

  return NextResponse.json({ data: family }, { status: 201 });
}
