import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspaceMember, requireWorkspaceAdmin, isErrorResponse } from '@/lib/api/workspace-auth';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const inviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  individualId: z.string().uuid().optional(),
});

// GET /api/workspaces/[id]/members — List members
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const result = await requireWorkspaceMember(request, id);
  if (isErrorResponse(result)) return result;

  const members = await prisma.workspaceMembership.findMany({
    where: { workspaceId: id },
    include: { user: true },
  });

  return NextResponse.json({ data: members });
}

// POST /api/workspaces/[id]/members — Invite by email
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const result = await requireWorkspaceAdmin(request, id);
  if (isErrorResponse(result)) return result;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { email, individualId } = parsed.data;

  // Check if email is already a member
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const existingMembership = await prisma.workspaceMembership.findMany({
      where: { workspaceId: id, userId: existingUser.id },
    });

    if (existingMembership.length > 0) {
      return NextResponse.json(
        { error: 'This email is already a member of this workspace' },
        { status: 400 },
      );
    }
  }

  const invitation = await prisma.workspaceInvitation.create({
    data: {
      workspaceId: id,
      type: 'email',
      email,
      individualId: individualId ?? null,
      invitedById: result.user.id,
    },
  });

  // Email sending is stubbed
  console.log(`[STUB] Sending workspace invitation email to ${email} for workspace ${id}`);

  return NextResponse.json({ data: invitation }, { status: 201 });
}
