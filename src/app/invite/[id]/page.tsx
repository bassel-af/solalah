import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import InviteAcceptClient from './InviteAcceptClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'دعوة للانضمام',
};

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { id },
    include: {
      workspace: {
        select: { nameAr: true, slug: true },
      },
      invitedBy: {
        select: { displayName: true },
      },
    },
  });

  if (!invitation) {
    notFound();
  }

  const isExpired = invitation.expiresAt !== null && invitation.expiresAt < new Date();
  const isUsed = invitation.maxUses !== null && invitation.useCount >= invitation.maxUses;
  const isRevoked = invitation.status === 'revoked';
  const isAccepted = invitation.status === 'accepted';

  const maskedEmail = invitation.email ? maskEmail(invitation.email) : null;

  return (
    <InviteAcceptClient
      invitationId={invitation.id}
      workspaceName={invitation.workspace.nameAr}
      workspaceSlug={invitation.workspace.slug}
      inviterName={invitation.invitedBy.displayName}
      invitedEmail={maskedEmail}
      isExpired={isExpired}
      isUsed={isUsed}
      isRevoked={isRevoked}
      isAccepted={isAccepted}
    />
  );
}
