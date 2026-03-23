import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspaceAdmin, isErrorResponse } from '@/lib/api/workspace-auth';
import { inviteCodeGenLimiter, rateLimitResponse } from '@/lib/api/rate-limit';
import { generateJoinCode } from '@/lib/workspace/join-code';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const generateCodeSchema = z.object({
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().positive().optional(),
}).optional();

// POST /api/workspaces/[id]/invitations/code — Generate join code
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const result = await requireWorkspaceAdmin(request, id);
  if (isErrorResponse(result)) return result;

  const { allowed, retryAfterSeconds } = inviteCodeGenLimiter.check(result.user.id);
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine — all fields are optional
  }

  const parsed = generateCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id },
  });

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const code = generateJoinCode(workspace.slug);

  const invitation = await prisma.workspaceInvitation.create({
    data: {
      workspaceId: id,
      type: 'code',
      code,
      invitedById: result.user.id,
      expiresAt: parsed.data?.expiresAt ? new Date(parsed.data.expiresAt) : null,
      maxUses: parsed.data?.maxUses ?? null,
    },
  });

  return NextResponse.json({ data: invitation }, { status: 201 });
}
