import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspaceMember, isErrorResponse } from '@/lib/api/workspace-auth';
import { getOrCreateTree, getTreeByWorkspaceId } from '@/lib/tree/queries';
import { dbTreeToGedcomData, redactPrivateIndividuals } from '@/lib/tree/mapper';
import { getActivePointersForWorkspace } from '@/lib/tree/branch-pointer-queries';
import { extractPointedSubtree, mergePointedSubtree } from '@/lib/tree/branch-pointer-merge';
import type { GedcomData } from '@/lib/gedcom/types';
import { createHash } from 'crypto';

type RouteParams = { params: Promise<{ id: string }> };

function computeETag(lastModifiedAt: Date): string {
  const hash = createHash('sha1')
    .update(lastModifiedAt.toISOString())
    .digest('hex')
    .slice(0, 16);
  return `"${hash}"`;
}

// GET /api/workspaces/[id]/tree — Get workspace family tree data
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: workspaceId } = await params;

  const result = await requireWorkspaceMember(request, workspaceId);
  if (isErrorResponse(result)) return result;

  const tree = await getOrCreateTree(workspaceId);

  // ETag/304 — check If-None-Match before doing expensive work
  const etag = computeETag(tree.lastModifiedAt);
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { 'ETag': etag },
    });
  }

  let gedcomData: GedcomData = dbTreeToGedcomData(tree);

  // Merge pointed subtrees from active branch pointers
  const pointers = await getActivePointersForWorkspace(workspaceId);

  // Deduplicate source workspace IDs and fetch all unique trees in parallel
  const uniqueSourceIds = [...new Set(pointers.map((p) => p.sourceWorkspaceId))];
  const sourceTreeMap = new Map<string, GedcomData>();
  const sourceTreeEntries = await Promise.all(
    uniqueSourceIds.map(async (wsId) => {
      const tree = await getTreeByWorkspaceId(wsId);
      if (!tree) return null;
      return [wsId, dbTreeToGedcomData(tree)] as const;
    }),
  );
  for (const entry of sourceTreeEntries) {
    if (entry) sourceTreeMap.set(entry[0], entry[1]);
  }

  // Merge each pointer sequentially using the cached source trees
  for (const pointer of pointers) {
    const sourceData = sourceTreeMap.get(pointer.sourceWorkspaceId);
    if (!sourceData) continue;

    const pointedSubtree = extractPointedSubtree(sourceData, {
      rootIndividualId: pointer.rootIndividualId,
      depthLimit: pointer.depthLimit,
      includeGrafts: pointer.includeGrafts,
    });

    gedcomData = mergePointedSubtree(gedcomData, pointedSubtree, {
      pointerId: pointer.id,
      anchorIndividualId: pointer.anchorIndividualId,
      selectedIndividualId: pointer.selectedIndividualId,
      relationship: pointer.relationship,
      sourceWorkspaceId: pointer.sourceWorkspaceId,
      linkChildrenToAnchor: pointer.linkChildrenToAnchor,
    });
  }

  let safeData = redactPrivateIndividuals(gedcomData);

  // Strip kunya when feature is disabled
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { enableKunya: true },
  });
  if (!workspace?.enableKunya) {
    const strippedIndividuals: Record<string, typeof safeData.individuals[string]> = {};
    for (const [id, ind] of Object.entries(safeData.individuals)) {
      strippedIndividuals[id] = { ...ind, kunya: '' };
    }
    safeData = { ...safeData, individuals: strippedIndividuals };
  }

  // Build pointer metadata for the frontend
  const pointerMetadata = pointers.map((p) => ({
    id: p.id,
    sourceWorkspaceNameAr: p.sourceWorkspaceNameAr,
    sourceWorkspaceSlug: p.sourceWorkspaceSlug,
    sourceRootName: p.sourceRootName || 'غير معروف',
    anchorIndividualId: p.anchorIndividualId,
    relationship: p.relationship,
    status: 'active' as const,
  }));

  return NextResponse.json(
    { data: safeData, pointers: pointerMetadata },
    {
      headers: {
        'ETag': etag,
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=300',
      },
    },
  );
}
