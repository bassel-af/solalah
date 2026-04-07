import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspaceAdmin, isErrorResponse } from '@/lib/api/workspace-auth';
import { auditLogLimiter, rateLimitResponse } from '@/lib/api/rate-limit';
import { auditLogQuerySchema } from '@/lib/tree/audit-log-schemas';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/workspaces/[id]/tree/audit-log
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: workspaceId } = await params;

  // Auth: admin only
  const result = await requireWorkspaceAdmin(request, workspaceId);
  if (isErrorResponse(result)) return result;

  // Rate limit
  const { allowed, retryAfterSeconds } = auditLogLimiter.check(result.user.id);
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  // Feature gate
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { enableAuditLog: true },
  });
  if (!workspace?.enableAuditLog) {
    return NextResponse.json(
      { error: 'سجل التعديلات غير مفعّل في هذه المساحة' },
      { status: 403 },
    );
  }

  // Parse query params
  const url = new URL(request.url);
  const rawParams = Object.fromEntries(url.searchParams);
  const parsed = auditLogQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'معاملات البحث غير صالحة' },
      { status: 400 },
    );
  }

  const { page, limit, entityType, entityId, userId, action, from, to } = parsed.data;

  // Get tree for workspace
  const tree = await prisma.familyTree.findUnique({
    where: { workspaceId },
    select: { id: true },
  });
  if (!tree) {
    return NextResponse.json({ data: [], total: 0, page, limit });
  }

  // Build where clause
  const where: Record<string, unknown> = { treeId: tree.id };
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (from || to) {
    const timestamp: Record<string, Date> = {};
    if (from) timestamp.gte = new Date(from);
    if (to) timestamp.lte = new Date(to);
    where.timestamp = timestamp;
  }

  // Query with pagination
  const [entries, totalCount] = await Promise.all([
    prisma.treeEditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { displayName: true, avatarUrl: true },
        },
      },
    }),
    prisma.treeEditLog.count({ where }),
  ]);

  return NextResponse.json({
    data: entries.map((e) => ({
      id: e.id,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      description: e.description,
      snapshotBefore: e.snapshotBefore,
      snapshotAfter: e.snapshotAfter,
      payload: e.payload,
      timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : String(e.timestamp),
      user: {
        displayName: e.user.displayName,
        avatarUrl: e.user.avatarUrl,
      },
    })),
    total: totalCount,
    page,
    limit,
  });
}
