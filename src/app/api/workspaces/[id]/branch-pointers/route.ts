import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspaceMember, requireTreeEditor, isErrorResponse } from '@/lib/api/workspace-auth';
import { redeemTokenSchema } from '@/lib/tree/branch-pointer-schemas';
import { hashToken } from '@/lib/tree/branch-share-token';

type RouteParams = { params: Promise<{ id: string }> };

/** Max active branch pointers per workspace */
const MAX_POINTERS_PER_WORKSPACE = 50;

/** Generic error message for invalid/expired/revoked tokens (security: no info leakage) */
const INVALID_TOKEN_ERROR = 'رمز المشاركة غير صالح أو منتهي الصلاحية';

// GET /api/workspaces/[id]/branch-pointers — List incoming branch pointers
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: workspaceId } = await params;

  const result = await requireWorkspaceMember(request, workspaceId);
  if (isErrorResponse(result)) return result;

  const pointers = await prisma.branchPointer.findMany({
    where: { targetWorkspaceId: workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      sourceWorkspace: {
        select: { nameAr: true },
      },
      rootIndividual: {
        select: { givenName: true, surname: true },
      },
    },
  });

  const data = pointers.map((p) => ({
    id: p.id,
    sourceWorkspaceNameAr: p.sourceWorkspace.nameAr,
    sourceRootName: [p.rootIndividual.givenName, p.rootIndividual.surname]
      .filter(Boolean)
      .join(' ') || 'غير معروف',
    anchorIndividualId: p.anchorIndividualId,
    relationship: p.relationship,
    status: p.status,
  }));

  return NextResponse.json({ data });
}

// POST /api/workspaces/[id]/branch-pointers — Redeem a share token
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: workspaceId } = await params;

  const result = await requireTreeEditor(request, workspaceId);
  if (isErrorResponse(result)) return result;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = redeemTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { token, anchorIndividualId, selectedPersonId, relationship } = parsed.data;

  // Look up token by hash
  const tokenHash = hashToken(token);
  const shareToken = await prisma.branchShareToken.findFirst({
    where: {
      tokenHash,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!shareToken) {
    return NextResponse.json(
      { error: INVALID_TOKEN_ERROR },
      { status: 400 },
    );
  }

  // Check use count
  if (shareToken.useCount >= shareToken.maxUses) {
    return NextResponse.json(
      { error: INVALID_TOKEN_ERROR },
      { status: 400 },
    );
  }

  // Check workspace scope (by workspace ID, not slug — security finding #7)
  // If targetWorkspaceId is set, only that workspace can redeem. If null, any workspace can.
  if (!shareToken.isPublic && shareToken.targetWorkspaceId && shareToken.targetWorkspaceId !== workspaceId) {
    return NextResponse.json(
      { error: INVALID_TOKEN_ERROR },
      { status: 400 },
    );
  }

  // Prevent self-pointing
  if (shareToken.sourceWorkspaceId === workspaceId) {
    return NextResponse.json(
      { error: 'لا يمكن ربط فرع من نفس المساحة' },
      { status: 400 },
    );
  }

  // Check pointer limit
  const activePointerCount = await prisma.branchPointer.count({
    where: {
      targetWorkspaceId: workspaceId,
      status: 'active',
    },
  });

  if (activePointerCount >= MAX_POINTERS_PER_WORKSPACE) {
    return NextResponse.json(
      { error: 'تم الوصول للحد الأقصى من الفروع المرتبطة' },
      { status: 429 },
    );
  }

  // Verify anchor individual exists in the target workspace's tree
  const anchor = await prisma.individual.findFirst({
    where: {
      id: anchorIndividualId,
      tree: { workspaceId },
    },
  });

  if (!anchor) {
    return NextResponse.json(
      { error: 'الشخص المرجعي غير موجود في شجرة هذه المساحة' },
      { status: 404 },
    );
  }

  // Increment use count
  await prisma.branchShareToken.update({
    where: { id: shareToken.id },
    data: { useCount: { increment: 1 } },
  });

  // Create the branch pointer
  // rootIndividualId = boundary root (token's root, e.g., فدوى)
  // selectedIndividualId = the person picked by the admin (e.g., خالد)
  const pointer = await prisma.branchPointer.create({
    data: {
      sourceWorkspaceId: shareToken.sourceWorkspaceId,
      rootIndividualId: shareToken.rootIndividualId,
      selectedIndividualId: selectedPersonId,
      depthLimit: shareToken.depthLimit,
      includeGrafts: shareToken.includeGrafts,
      targetWorkspaceId: workspaceId,
      anchorIndividualId,
      relationship,
      status: 'active',
      shareTokenId: shareToken.id,
      createdById: result.user.id,
    },
  });

  return NextResponse.json({ data: pointer }, { status: 201 });
}
