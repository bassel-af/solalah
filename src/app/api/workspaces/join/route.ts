import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const joinSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

// POST /api/workspaces/join — Join workspace via invite code
export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { code } = parsed.data;

  // Find a valid invitation: not revoked, not expired, not over max uses
  const invitation = await prisma.workspaceInvitation.findFirst({
    where: {
      code,
      type: 'code',
      status: 'pending',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: 'Invite code is invalid or expired' },
      { status: 404 },
    );
  }

  // Check max uses
  if (invitation.maxUses !== null && invitation.useCount >= invitation.maxUses) {
    return NextResponse.json(
      { error: 'Invite code is invalid or expired' },
      { status: 404 },
    );
  }

  // Check if already a member
  const existingMembership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: invitation.workspaceId,
      },
    },
  });

  if (existingMembership) {
    return NextResponse.json(
      { error: 'You are already a member of this workspace' },
      { status: 400 },
    );
  }

  // Create membership
  const membership = await prisma.workspaceMembership.create({
    data: {
      userId: user.id,
      workspaceId: invitation.workspaceId,
      role: 'workspace_member',
    },
  });

  // Increment use count
  await prisma.workspaceInvitation.update({
    where: { id: invitation.id },
    data: { useCount: invitation.useCount + 1 },
  });

  return NextResponse.json({ data: membership }, { status: 201 });
}
