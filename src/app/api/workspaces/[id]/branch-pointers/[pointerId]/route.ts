import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspaceAdmin, isErrorResponse } from '@/lib/api/workspace-auth';
import { snapshotBranchPointer, buildAuditDescription } from '@/lib/tree/audit';
import { touchTreeTimestamp } from '@/lib/tree/queries';

type RouteParams = { params: Promise<{ id: string; pointerId: string }> };

// DELETE /api/workspaces/[id]/branch-pointers/[pointerId] — Disconnect a pointer
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

  // Mark pointer as broken
  await prisma.branchPointer.update({
    where: { id: pointerId },
    data: { status: 'broken' },
  });

  // Audit log (best effort)
  try {
    const tree = await prisma.familyTree.findUnique({
      where: { workspaceId },
      select: { id: true },
    });
    if (tree) {
      await Promise.all([
        prisma.treeEditLog.create({
          data: {
            treeId: tree.id,
            userId: result.user.id,
            action: 'disconnect',
            entityType: 'branch_pointer',
            entityId: pointerId,
            snapshotBefore: snapshotBranchPointer(pointer),
            snapshotAfter: snapshotBranchPointer({ ...pointer, status: 'broken' }),
            description: buildAuditDescription('disconnect', 'branch_pointer'),
          },
        }),
        touchTreeTimestamp(tree.id),
      ]);
    }
  } catch {
    // Audit logging failure should not block pointer disconnect
  }

  // Create notification
  await prisma.notification.create({
    data: {
      userId: result.user.id,
      type: 'branch_pointer_broken',
      payload: {
        pointerId: pointer.id,
        sourceWorkspaceId: pointer.sourceWorkspaceId,
        action: 'disconnect',
      },
    },
  });

  return NextResponse.json({ data: { status: 'broken' } });
}
