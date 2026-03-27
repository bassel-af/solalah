import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspaceAdmin, isErrorResponse } from '@/lib/api/workspace-auth';

type RouteParams = { params: Promise<{ id: string; tokenId: string }> };

// DELETE /api/workspaces/[id]/share-tokens/[tokenId] — Revoke a share token
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: workspaceId, tokenId } = await params;

  const result = await requireWorkspaceAdmin(request, workspaceId);
  if (isErrorResponse(result)) return result;

  // Find token and verify it belongs to this workspace
  const token = await prisma.branchShareToken.findUnique({
    where: { id: tokenId },
  });

  if (!token || token.sourceWorkspaceId !== workspaceId) {
    return NextResponse.json({ error: 'الرمز غير موجود' }, { status: 404 });
  }

  if (token.isRevoked) {
    return NextResponse.json({ error: 'الرمز ملغى بالفعل' }, { status: 400 });
  }

  await prisma.branchShareToken.update({
    where: { id: tokenId },
    data: { isRevoked: true },
  });

  return NextResponse.json({ success: true });
}
