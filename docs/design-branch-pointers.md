# Phase 5 — Branch Pointers: Design Document

**Status**: Final (reviewed by architecture, frontend, security, TDD)
**Date**: 2026-03-27

---

## 1. Overview

Branch Pointers allow one workspace to display a read-only, live-synced subtree from another workspace's family tree. The source workspace shares a branch via a token; the target workspace redeems the token and attaches the branch to a specific person (the anchor) in their tree.

**Motivating scenario:** فدوى شربك exists in both `/saeed` (married in) and `/sharbek` (maiden family). Her descendants are maintained in `/saeed`. The `/sharbek` workspace can link to her branch instead of duplicating and maintaining it separately.

**Key properties:**
- Live sync: edits in the source tree are visible in the target automatically
- Read-only: pointed individuals cannot be edited in the target workspace
- Auto deep-copy on break/revoke: target never loses data
- No data duplication: merge happens at query time

---

## 2. Data Model

### 2.1 New Enums

```prisma
enum BranchSharingPolicy {
  shareable
  copyable_only
  none
}

enum BranchPointerStatus {
  active
  revoked
  broken
}

enum PointerRelationship {
  child
  sibling
  spouse
  parent
}
```

### 2.2 BranchShareToken

```prisma
model BranchShareToken {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tokenHash         String    @unique @map("token_hash")  // SHA-256 hash; plaintext never stored
  sourceWorkspaceId String    @map("source_workspace_id") @db.Uuid
  rootIndividualId  String    @map("root_individual_id") @db.Uuid
  depthLimit        Int?      @map("depth_limit")         // null = unlimited
  includeGrafts     Boolean   @default(false) @map("include_grafts")
  targetWorkspaceId String?   @map("target_workspace_id") @db.Uuid  // null = public (any workspace)
  expiresAt         DateTime? @map("expires_at")
  maxUses           Int?      @map("max_uses")
  useCount          Int       @default(0) @map("use_count")
  isRevoked         Boolean   @default(false) @map("is_revoked")
  createdById       String    @map("created_by") @db.Uuid
  createdAt         DateTime  @default(now()) @map("created_at")

  // Relations
  sourceWorkspace Workspace  @relation("ShareTokenSource", fields: [sourceWorkspaceId], references: [id], onDelete: Cascade)
  targetWorkspace Workspace? @relation("ShareTokenTarget", fields: [targetWorkspaceId], references: [id])
  rootIndividual  Individual @relation(fields: [rootIndividualId], references: [id])
  createdBy       User       @relation("ShareTokenCreator", fields: [createdById], references: [id])
  pointers        BranchPointer[]

  @@index([tokenHash])
  @@index([sourceWorkspaceId])
  @@map("branch_share_tokens")
}
```

### 2.3 BranchPointer

```prisma
model BranchPointer {
  id                     String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  shareTokenId           String              @map("share_token_id") @db.Uuid
  sourceWorkspaceId      String              @map("source_workspace_id") @db.Uuid
  sourceRootIndividualId String              @map("source_root_individual_id") @db.Uuid
  targetWorkspaceId      String              @map("target_workspace_id") @db.Uuid
  anchorIndividualId     String              @map("anchor_individual_id") @db.Uuid
  relationship           PointerRelationship
  depthLimit             Int?                @map("depth_limit")
  includeGrafts          Boolean             @default(false) @map("include_grafts")
  status                 BranchPointerStatus @default(active)
  createdById            String              @map("created_by") @db.Uuid
  brokenAt               DateTime?           @map("broken_at")
  revokedAt              DateTime?           @map("revoked_at")
  createdAt              DateTime            @default(now()) @map("created_at")

  // Relations
  shareToken           BranchShareToken @relation(fields: [shareTokenId], references: [id])
  sourceWorkspace      Workspace        @relation("PointerSource", fields: [sourceWorkspaceId], references: [id])
  targetWorkspace      Workspace        @relation("PointerTarget", fields: [targetWorkspaceId], references: [id])
  sourceRootIndividual Individual       @relation("PointerSourceRoot", fields: [sourceRootIndividualId], references: [id])
  anchorIndividual     Individual       @relation("PointerAnchor", fields: [anchorIndividualId], references: [id])
  createdBy            User             @relation("PointerCreator", fields: [createdById], references: [id])

  @@unique([targetWorkspaceId, sourceWorkspaceId, sourceRootIndividualId])
  @@index([targetWorkspaceId, status])
  @@index([sourceWorkspaceId, status])
  @@map("branch_pointers")
}
```

### 2.4 Existing Model Changes

**Workspace** — add fields and relations:
```prisma
model Workspace {
  // ... existing fields ...
  branchSharingPolicy BranchSharingPolicy @default(none) @map("branch_sharing_policy")

  // New relations
  shareTokens      BranchShareToken[] @relation("ShareTokenSource")
  targetTokens     BranchShareToken[] @relation("ShareTokenTarget")
  outgoingPointers BranchPointer[]    @relation("PointerSource")
  incomingPointers BranchPointer[]    @relation("PointerTarget")
}
```

**User** — add relations:
```prisma
model User {
  // ... existing fields ...
  createdShareTokens BranchShareToken[] @relation("ShareTokenCreator")
  createdPointers    BranchPointer[]    @relation("PointerCreator")
}
```

**Individual** — add relations and DB-level length constraints:
```prisma
model Individual {
  // ... existing fields ...
  // Add DB-level length constraints (migration):
  givenName String? @map("given_name") @db.VarChar(200)
  surname   String? @db.VarChar(200)
  fullName  String? @map("full_name") @db.VarChar(200)

  // New relations
  shareTokens          BranchShareToken[]
  pointersAsSourceRoot BranchPointer[] @relation("PointerSourceRoot")
  pointersAsAnchor     BranchPointer[] @relation("PointerAnchor")
}
```

### 2.5 GedcomData Type Extensions (Runtime Only)

These fields are added to the TypeScript types but are NOT persisted in the database. They are set at query time by the merge logic.

```typescript
// In src/lib/gedcom/types.ts
interface Individual {
  // ... existing fields ...
  _pointed?: boolean;           // true if from a pointed branch
  _sourceWorkspaceId?: string;  // source workspace UUID
  _pointerId?: string;          // which pointer brought this in
  _sharedRoot?: boolean;        // true if this person is a shared branch root (source tree only)
}

interface Family {
  // ... existing fields ...
  _pointed?: boolean;
  _sourceWorkspaceId?: string;
  _pointerId?: string;
}
```

---

## 3. Token Security

### 3.1 Token Generation

Tokens use 256 bits of cryptographic randomness with a `brsh_` prefix for identification:

```typescript
// src/lib/workspace/share-token.ts
import { randomBytes, createHash } from 'crypto';

export function generateShareToken(): string {
  return 'brsh_' + randomBytes(32).toString('base64url');
}

export function hashShareToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
```

### 3.2 Hashed Storage

The database stores only the SHA-256 hash of the token (`tokenHash`). The plaintext token is returned exactly once at creation time and never stored. All lookups (redemption, preview) hash the input and compare against `tokenHash`.

### 3.3 Token Validation on Redemption

All of the following must be true:
1. `tokenHash` matches `sha256(input)`
2. `isRevoked` is `false`
3. `expiresAt` is `null` or in the future
4. `useCount < maxUses` (if `maxUses` is set)
5. If `targetWorkspaceId` is set, the redeeming workspace's ID must match

---

## 4. API Endpoints

### 4.1 Share Token Management (Source Workspace)

#### `POST /api/workspaces/[id]/tree/share-tokens` — Create share token

- **Auth:** `requireWorkspaceAdmin`
- **Guards:**
  - Workspace `branchSharingPolicy` must NOT be `none` (checked first; returns 403)
  - Active token count for workspace must be < 20
- **Rate limit:** 5 per 15 minutes per user
- **Body:**
  ```typescript
  {
    rootIndividualId: string;       // UUID, must belong to this workspace's tree
    depthLimit?: number | null;     // null = unlimited
    includeGrafts?: boolean;        // default false
    targetWorkspaceSlug?: string;   // resolved to UUID server-side; null = public
    expiresAt?: string;             // ISO datetime
    maxUses?: number;
  }
  ```
- **Response:** `{ data: { id, token, depthLimit, includeGrafts, ... } }` — `token` is the plaintext, returned only here
- **Notes:** If `targetWorkspaceSlug` is provided, resolve to UUID via `prisma.workspace.findUnique({ where: { slug } })`. If not found, return 404.

#### `GET /api/workspaces/[id]/tree/share-tokens` — List share tokens

- **Auth:** `requireWorkspaceAdmin`
- **Response:** `{ data: BranchShareToken[] }` with `useCount` and active pointer count per token

#### `DELETE /api/workspaces/[id]/tree/share-tokens/[tokenId]` — Revoke share token

- **Auth:** `requireWorkspaceAdmin`
- **Behavior:**
  1. Set `isRevoked = true`
  2. For each active pointer using this token: trigger deep copy (see section 6), set pointer status to `revoked`
  3. Create notification for each target workspace admin (generic text, no source workspace identity)
- **Response:** `{ data: { revokedPointerCount } }`

#### `GET /api/workspaces/[id]/tree/share-tokens/[tokenId]/preview` — Preview shared branch

- **Auth:** `requireWorkspaceAdmin` (source workspace)
- **Query params:** `previewDepthLimit?: number` (default: 3 when person count > 100)
- **Response:** `{ data: GedcomData }` — scoped subtree with privacy redaction applied

#### `GET /api/workspaces/[id]/tree/share-tokens/[tokenId]/pointers` — List pointers for token

- **Auth:** `requireWorkspaceAdmin` (source workspace)
- **Response:** `{ data: Array<{ targetWorkspaceNameAr, status, createdAt }> }`

### 4.2 Branch Pointer Management (Target Workspace)

#### `POST /api/workspaces/[id]/tree/branch-pointers` — Redeem token

- **Auth:** `requireTreeEditor`
- **Guards:**
  - Active incoming pointer count for workspace must be < 10
- **Rate limit:** 5 per 15 minutes per user
- **Body:**
  ```typescript
  {
    token: string;                  // plaintext token
    anchorIndividualId: string;     // UUID, must belong to target workspace's tree
    relationship: 'child' | 'sibling' | 'spouse' | 'parent';
  }
  ```
- **Validation:**
  - Token: hash input, look up by `tokenHash`, validate per section 3.3
  - `anchorIndividualId` belongs to target workspace's tree
  - No existing active pointer from the same source root to this target workspace
  - Relationship is structurally valid (e.g., parent: anchor must not already have both parents)
- **Behavior:**
  1. Create `BranchPointer` record (snapshot `depthLimit` + `includeGrafts` from token)
  2. Increment token `useCount`
  3. If source workspace policy is `copyable_only`: immediately trigger deep copy and set pointer to `broken`
- **Response:** `{ data: { id, status, ... } }`

#### `GET /api/workspaces/[id]/tree/branch-pointers` — List incoming pointers

- **Auth:** `requireWorkspaceMember`
- **Response:** `{ data: BranchPointer[] }` with source workspace `nameAr`, root person display name

#### `DELETE /api/workspaces/[id]/tree/branch-pointers/[pointerId]` — Break pointer

- **Auth:** `requireWorkspaceAdmin`
- **Behavior:** Trigger deep copy (section 6), set status to `broken`, set `brokenAt`
- **Response:** `{ data: { copiedIndividualCount, copiedFamilyCount } }`

#### `POST /api/workspaces/[id]/tree/branch-pointers/[pointerId]/copy` — Copy without breaking

- **Auth:** `requireWorkspaceAdmin`
- **Behavior:** Deep copy the pointed branch into the target workspace. Pointer remains `active`.
- **Response:** `{ data: { copiedIndividualCount, copiedFamilyCount } }`

### 4.3 Token Preview (Target Context)

#### `POST /api/workspaces/[id]/tree/branch-pointers/preview` — Preview token before redemption

- **Auth:** `requireTreeEditor(request, workspaceId)` — the target workspace
- **Body:** `{ token: string }`
- **Validation:**
  - Token must be valid (not revoked, not expired)
  - If token is scoped: target workspace ID must match
- **Response:**
  ```typescript
  {
    data: {
      sourceWorkspaceNameAr: string;
      rootPersonName: string;
      subtree: GedcomData;          // privacy-redacted
      depthLimit: number | null;
      includeGrafts: boolean;
    }
  }
  ```

### 4.4 Workspace Settings

#### `PATCH /api/workspaces/[id]` — Extend existing endpoint

- Add `branchSharingPolicy` to the update schema (Zod enum validation)
- Auth: `requireWorkspaceAdmin` (already enforced)

---

## 5. GET /tree Merge Strategy

### 5.1 Query Flow

```
GET /api/workspaces/[id]/tree
  1. requireWorkspaceMember(request, workspaceId)
  2. getOrCreateTree(workspaceId) → local DbTree
  3. dbTreeToGedcomData(localTree) → localGedcom
  4. Annotate shared roots:
     a. Query active BranchShareTokens where sourceWorkspaceId = workspaceId
     b. For each, set individuals[rootIndividualId]._sharedRoot = true
  5. getActiveIncomingPointers(workspaceId, limit=10) → BranchPointer[]
  6. Batch-fetch source trees (deduplicate by sourceWorkspaceId, parallel):
     For each unique sourceWorkspaceId:
       a. getOrCreateTree(sourceWorkspaceId) → sourceDbTree
       b. dbTreeToGedcomData(sourceDbTree) → sourceGedcom
  7. For each active pointer:
     a. extractPointedSubtree(sourceGedcom, pointer) → subtree
     b. mergePointedSubtree(localGedcom, subtree, pointer) → merged
     c. localGedcom = merged
  8. redactPrivateIndividuals(localGedcom) → safeData
  9. Build pointers metadata array
  10. Redact source workspace identity for non-admin members:
      If requesting user is NOT workspace_admin:
        Strip sourceWorkspaceNameAr and sourceWorkspaceSlug from each pointer entry
  11. Return { data: safeData, pointers }
```

### 5.2 Response Shape

```typescript
{
  data: GedcomData,
  pointers: Array<{
    id: string;
    sourceWorkspaceNameAr?: string;  // only present for workspace_admin
    sourceWorkspaceSlug?: string;    // only present for workspace_admin
    sourceRootName: string;
    anchorIndividualId: string;
    relationship: string;
    status: string;
  }>
}
```

**Source identity redaction:** `sourceWorkspaceNameAr` and `sourceWorkspaceSlug` are stripped from the response for non-admin members (server-side enforcement). Non-admins see that a pointer exists but not which workspace it comes from. The frontend sidebar banner shows "فرع مرتبط — للقراءة فقط" for non-admins, or "مرتبط من: [name]" for admins.

### 5.3 extractPointedSubtree()

Location: `src/lib/tree/branch-pointer-merge.ts`

```typescript
function extractPointedSubtree(
  sourceData: GedcomData,
  pointer: {
    sourceRootIndividualId: string;
    depthLimit: number | null;
    includeGrafts: boolean;
  }
): GedcomData
```

Steps:
1. Call `extractSubtree(sourceData, pointer.sourceRootIndividualId)`
2. If `depthLimit` is set: walk from root using BFS, remove individuals deeper than `depthLimit` generations and their orphaned families
3. If `includeGrafts`: include graft individuals (parents + siblings of married-in spouses) using `computeGraftDescriptors()`
4. Return the filtered subtree

### 5.4 mergePointedSubtree()

```typescript
function mergePointedSubtree(
  targetData: GedcomData,
  pointedSubtree: GedcomData,
  pointer: {
    id: string;
    anchorIndividualId: string;
    sourceRootIndividualId: string;
    sourceWorkspaceId: string;
    relationship: PointerRelationship;
  }
): GedcomData
```

Rules:
- **No ID prefixing:** UUIDs are globally unique; no collisions between workspaces
- **Read-only marking:** Every individual and family from the pointed subtree gets `_pointed: true`, `_sourceWorkspaceId`, and `_pointerId`
- **Synthetic families for stitching:** Deterministic IDs using `ptr-{pointerId}-fam` format (not valid UUIDs — rejected by mutation guards)

**Relationship stitching by type:**

| Relationship | Stitching Logic |
|---|---|
| `child` | Source root becomes a child of the anchor. Find/create a family where anchor is husband/wife, add source root to `children`. |
| `sibling` | Source root becomes a sibling of the anchor. Add source root to anchor's `familyAsChild` family's children list. |
| `spouse` | Source root becomes a spouse of the anchor. Create a synthetic family linking them. |
| `parent` | Source root becomes a parent of the anchor. Create/update a family where source root is husband/wife, set anchor's `familyAsChild`. |

### 5.5 Cross-Workspace Authorization

The pointer record itself is the authorization for cross-workspace reads. The requesting user does NOT need membership in the source workspace. The server reads source tree data directly via Prisma.

### 5.6 Performance

- Deduplicate source tree fetches (if multiple pointers reference the same source workspace, fetch once)
- Batch-fetch source trees in parallel via `Promise.all()`
- Cap at 10 incoming pointers per GET /tree request
- `@@index([targetWorkspaceId, status])` ensures fast pointer lookup
- Set `Cache-Control: no-store` on the response header

---

## 6. Deep Copy Algorithm

### 6.1 Triggers

Deep copy is triggered when:
1. **Target admin breaks a pointer** (DELETE branch-pointer)
2. **Source admin revokes a share token** (DELETE share-token)
3. **Source deletes the root individual** of a shared branch
4. **Target admin copies without breaking** (POST branch-pointer copy)
5. **Token has `copyable_only` policy** — immediate deep copy on redemption

### 6.2 Algorithm

```
deepCopyPointedBranch(pointer: BranchPointer, updateStatus: boolean = true):

  1. Fetch source tree: getOrCreateTree(pointer.sourceWorkspaceId)
  2. Convert: dbTreeToGedcomData(sourceTree)
  3. Extract subtree: extractPointedSubtree(sourceGedcom, pointer)
  4. Get target tree: getOrCreateTree(pointer.targetWorkspaceId)
  5. In a Prisma $transaction with SELECT FOR UPDATE:
     a. Lock the BranchPointer row:
        SELECT * FROM branch_pointers WHERE id = pointer.id FOR UPDATE
     b. Verify pointer is still active (skip if already broken/revoked)
     c. Build oldId→newId mapping
     d. For each individual in subtree:
        - Validate fields against individualFieldsSchema (Zod)
        - Create new Individual in target tree (new UUID)
        - Map place references:
          - Global places (workspaceId = null): keep placeId
          - Source workspace places: copy string field, set placeId = null
     e. For each family in subtree:
        - Validate fields against familyEventFieldsSchema (Zod)
        - Create new Family in target tree (new UUID)
        - Remap husband/wife/children IDs using oldId→newId map
        - Map place references (same logic as individuals)
     f. Create FamilyChild records for all parent-child relationships
     g. Stitch to anchor:
        - Based on pointer.relationship, create/update a family
          linking the copied root (new UUID) to the anchor individual
     h. If updateStatus:
        - Update pointer status to 'broken' (or 'revoked'), set timestamp
     i. Log in TreeEditLog: action='deep_copy', entityType='branch_pointer'
  6. Create notification for target workspace admins:
     - Type: 'branch_pointer_converted'
     - Payload: { pointerId, copiedIndividualCount, copiedFamilyCount, anchorIndividualName }
     - Text: "تم تحويل فرع مرتبط (N شخص) إلى نسخة محلية"
     - Does NOT include source workspace name/slug (prevents info leakage)
```

### 6.3 Source Deletion Handling

When DELETE individual is called on the source workspace and the individual is a `sourceRootIndividualId` for active pointers:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Lock pointer rows
  const pointers = await tx.$queryRaw`
    SELECT * FROM branch_pointers
    WHERE source_root_individual_id = ${individualId}
    AND status = 'active'
    FOR UPDATE
  `;

  // 2. Deep copy each pointer's subtree
  for (const pointer of pointers) {
    await deepCopySubtreeInTx(tx, pointer);
    await tx.branchPointer.update({
      where: { id: pointer.id },
      data: { status: 'revoked', revokedAt: new Date() },
    });
  }

  // 3. Delete the individual (only after copies are safe)
  await tx.individual.delete({ where: { id: individualId } });
});
```

The `SELECT ... FOR UPDATE` serializes concurrent deletion attempts. If two concurrent DELETEs target the same individual, the second blocks until the first completes, then finds pointers already `revoked` and skips the deep copy.

### 6.4 Place Reference Handling

| Place type | On deep copy |
|---|---|
| Global place (`workspaceId = null`) | Keep `placeId` reference (valid across workspaces) |
| Source workspace place | Copy the string field (e.g., `birthPlace`), set `placeId = null` |

---

## 7. Server-Side Mutation Guards

### 7.1 UUID Validation

All mutation endpoints validate path parameters as UUIDs:

```typescript
const { individualId } = await params;
if (!z.string().uuid().safeParse(individualId).success) {
  return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
}
```

This rejects synthetic family IDs (`ptr-{pointerId}-fam`) at the validation layer.

### 7.2 Ownership Check

Existing mutation endpoints already verify entity ownership via `getTreeIndividual(treeId, individualId)` / `getTreeFamily(treeId, familyId)`. Since pointed individuals are never written to the target workspace's tree tables, these queries return `null` → 404/403.

### 7.3 Affected Endpoints

All of the following must enforce both UUID validation and ownership:

- `PATCH /api/workspaces/[id]/tree/individuals/[individualId]`
- `DELETE /api/workspaces/[id]/tree/individuals/[individualId]`
- `PATCH /api/workspaces/[id]/tree/families/[familyId]`
- `DELETE /api/workspaces/[id]/tree/families/[familyId]`
- `POST /api/workspaces/[id]/tree/families/[familyId]/children`
- `DELETE /api/workspaces/[id]/tree/families/[familyId]/children/[individualId]`
- `POST /api/workspaces/[id]/tree/families/[familyId]/children/[individualId]/move`

---

## 8. Limits and Rate Limiting

| Limit | Value | Enforcement point |
|---|---|---|
| Max active outgoing share tokens per workspace | 20 | Token creation endpoint |
| Max active incoming pointers per workspace | 10 | Pointer redemption endpoint |
| GET /tree pointer resolution cap | 10 | GET /tree query (LIMIT 10) |
| Token creation rate limit | 5 per 15 min per user | Token creation endpoint |
| Token redemption rate limit | 5 per 15 min per user | Pointer redemption endpoint |

---

## 9. Frontend Integration

### 9.1 Visual Treatment

- **Pointed individuals (target tree):** Teal dashed border, teal background tint, 20px teal circle badge (link icon) at top-right
- **Pointed edges:** Dashed teal stroke
- **Shared root badge (source tree):** 22px teal circle badge (share icon) at top-left, generic tooltip "فرع مُشارَك"
- **Sidebar banner for pointed person:** Teal info banner "مرتبط من: [workspace name] — للقراءة فقط", replaces action buttons

### 9.2 Read-Only Enforcement (Client)

When `person._pointed === true`:
- Hide all action buttons (edit, delete, add child, add spouse, add parent, add sibling)
- Show pointer banner instead of action bar
- PersonCard: `cursor: default`, no hover lift transform
- PersonCard is still clickable (opens sidebar for viewing)

### 9.3 Token Redemption Flow

Inside `IndividualForm` when in create mode:
1. Toggle "ربط من مساحة أخرى" at top of form (checkbox)
2. When ON: form body replaced with token input + validate button
3. After validation: preview card with source info + mini-tree preview
4. Confirm: calls `POST .../branch-pointers` with token + anchor + relationship

New props on `IndividualForm`:
```typescript
allowBranchLink?: boolean;  // true when workspace context + tree_editor/admin + create mode
onBranchLink?: (token: string) => Promise<void>;
```

### 9.4 Share Creation Flow

Source workspace settings page → "إنشاء رمز مشاركة" button → modal:
1. Search for root person (client-side filter of tree data, lazy-loaded if needed)
2. Set depth limit, grafts toggle, target workspace slug or public
3. Preview mini-tree (server-side trimmed: max 3 generations when > 100 people)
4. Generate token → display once with copy button

### 9.5 Pointer Management

**Source side (workspace settings):** List outgoing tokens with root person, target, depth, expiry. Revoke button (red).

**Target side (workspace settings):** List incoming pointers with linked person, source workspace, relationship. Two actions:
- "فصل" (break): red destructive button, deep copies + removes pointer
- "نسخ" (copy): neutral button, deep copies without breaking pointer

Both require confirmation dialogs.

### 9.6 New Components

| Component | Location |
|---|---|
| `BranchLinkForm` | `src/components/tree/BranchLinkForm/BranchLinkForm.tsx` |
| `BranchPreview` | `src/components/tree/BranchPreview/BranchPreview.tsx` |
| `ShareBranchModal` | `src/components/workspace/ShareBranchModal/ShareBranchModal.tsx` |
| `ShareTokenList` | `src/components/workspace/ShareTokenList/ShareTokenList.tsx` |
| `IncomingPointerList` | `src/components/workspace/IncomingPointerList/IncomingPointerList.tsx` |

### 9.7 Design Tokens

Add to `src/styles/tokens/colors.css`:
```css
--color-pointer: #38b2ac;
--color-pointer-light: #81e6d9;
--color-pointer-dark: #2c7a7b;
--color-pointer-bg: rgba(56, 178, 172, 0.08);
--color-pointer-border: rgba(56, 178, 172, 0.25);
--color-pointer-badge-bg: rgba(56, 178, 172, 0.12);
```

---

## 10. Implementation Order

### Step 1: Database Schema + Migration

**Files:** `prisma/schema.prisma`
- Add `BranchSharingPolicy`, `BranchPointerStatus`, `PointerRelationship` enums
- Add `BranchShareToken`, `BranchPointer` models
- Add `branchSharingPolicy` to `Workspace`
- Add relations to `Workspace`, `User`, `Individual`
- Add `@db.VarChar(200)` to `Individual.givenName`, `surname`, `fullName`
- Run `npx prisma migrate dev --name branch-pointers`

### Step 2: Core Library Functions

**New files:**
- `src/lib/tree/branch-pointer-merge.ts` — `extractPointedSubtree()`, `mergePointedSubtree()`, `deepCopyPointedBranch()`
- `src/lib/tree/branch-pointer-queries.ts` — DB query helpers for pointers and tokens
- `src/lib/tree/branch-pointer-schemas.ts` — Zod schemas for all new API endpoints
- `src/lib/workspace/share-token.ts` — `generateShareToken()`, `hashShareToken()`

**Modified files:**
- `src/lib/gedcom/types.ts` — add optional `_pointed`, `_sourceWorkspaceId`, `_pointerId`, `_sharedRoot` fields

### Step 3: Share Token API Routes

**New files:**
- `src/app/api/workspaces/[id]/tree/share-tokens/route.ts` — POST + GET
- `src/app/api/workspaces/[id]/tree/share-tokens/[tokenId]/route.ts` — DELETE
- `src/app/api/workspaces/[id]/tree/share-tokens/[tokenId]/preview/route.ts` — GET
- `src/app/api/workspaces/[id]/tree/share-tokens/[tokenId]/pointers/route.ts` — GET

### Step 4: Branch Pointer API Routes

**New files:**
- `src/app/api/workspaces/[id]/tree/branch-pointers/route.ts` — POST + GET
- `src/app/api/workspaces/[id]/tree/branch-pointers/[pointerId]/route.ts` — DELETE
- `src/app/api/workspaces/[id]/tree/branch-pointers/[pointerId]/copy/route.ts` — POST
- `src/app/api/workspaces/[id]/tree/branch-pointers/preview/route.ts` — POST

### Step 5: Modify GET /tree to Merge Pointed Branches

**Modified files:**
- `src/app/api/workspaces/[id]/tree/route.ts` — fetch active pointers, merge subtrees, annotate shared roots, add `Cache-Control: no-store`

### Step 6: Server-Side Mutation Guards

**Modified files:**
- `src/app/api/workspaces/[id]/tree/individuals/[individualId]/route.ts` — UUID validation on path param
- `src/app/api/workspaces/[id]/tree/families/[familyId]/route.ts` — UUID validation on path param
- `src/app/api/workspaces/[id]/tree/families/[familyId]/children/route.ts` — UUID validation
- `src/app/api/workspaces/[id]/tree/families/[familyId]/children/[individualId]/move/route.ts` — UUID validation

### Step 7: Source Tree Deletion Trigger

**Modified files:**
- `src/app/api/workspaces/[id]/tree/individuals/[individualId]/route.ts` — DELETE handler checks for active pointers, triggers deep copy with `FOR UPDATE` lock

### Step 8: Frontend — TreeContext + Types

**Modified files:**
- `src/context/TreeContext.tsx` — store `pointers` metadata from GET response
- `src/context/WorkspaceTreeContext.tsx` — pass pointers data
- `src/hooks/useWorkspaceTreeData.ts` — parse `pointers` from response

### Step 9: Frontend — Read-Only Enforcement + Visual Indicators

**Modified files:**
- `src/styles/tokens/colors.css` — add pointer color tokens
- `src/styles/tree-global.css` — add `.person.pointed`, `.pointed-badge`, `.pointed-edge`, `.shared-root-badge` styles
- `src/components/tree/FamilyTree/FamilyTree.tsx` — apply `pointed` class, render badges
- Sidebar PersonDetail — show pointer banner, hide action buttons for pointed individuals
- `src/hooks/usePersonActions.ts` — early return when person is pointed

### Step 10: Frontend — Share Creation Flow

**New files:**
- `src/components/workspace/ShareBranchModal/ShareBranchModal.tsx`
- `src/components/workspace/ShareBranchModal/ShareBranchModal.module.css`
- `src/components/tree/BranchPreview/BranchPreview.tsx`
- `src/components/tree/BranchPreview/BranchPreview.module.css`

### Step 11: Frontend — Token Redemption

**New files:**
- `src/components/tree/BranchLinkForm/BranchLinkForm.tsx`
- `src/components/tree/BranchLinkForm/BranchLinkForm.module.css`

**Modified files:**
- `src/hooks/usePersonActions.ts` — new FormMode `{ kind: 'linkBranch'; relationship: PointerRelationship }`
- `src/components/tree/IndividualForm/IndividualForm.tsx` — add `allowBranchLink` toggle + `onBranchLink` prop

### Step 12: Frontend — Pointer Management

**New files:**
- `src/components/workspace/ShareTokenList/ShareTokenList.tsx`
- `src/components/workspace/ShareTokenList/ShareTokenList.module.css`
- `src/components/workspace/IncomingPointerList/IncomingPointerList.tsx`
- `src/components/workspace/IncomingPointerList/IncomingPointerList.module.css`

### Step 13: Workspace Settings — Sharing Policy

**Modified files:**
- Workspace settings page — add sharing policy selector + share/pointer management sections
- `src/app/api/workspaces/[id]/route.ts` — extend PATCH schema with `branchSharingPolicy`

---

## 11. File Structure Summary

```
src/
  lib/
    tree/
      branch-pointer-merge.ts      # extractPointedSubtree, mergePointedSubtree, deepCopyPointedBranch
      branch-pointer-queries.ts    # DB queries for BranchPointer, BranchShareToken
      branch-pointer-schemas.ts    # Zod schemas for branch pointer APIs
    workspace/
      share-token.ts               # generateShareToken(), hashShareToken()
  app/
    api/
      workspaces/[id]/
        tree/
          share-tokens/
            route.ts               # POST (create) + GET (list)
            [tokenId]/
              route.ts             # DELETE (revoke)
              preview/
                route.ts           # GET (preview subtree)
              pointers/
                route.ts           # GET (list pointers for token)
          branch-pointers/
            route.ts               # POST (redeem) + GET (list)
            preview/
              route.ts             # POST (preview token)
            [pointerId]/
              route.ts             # DELETE (break)
              copy/
                route.ts           # POST (copy without breaking)
  components/
    workspace/
      ShareBranchModal/
        ShareBranchModal.tsx
        ShareBranchModal.module.css
      ShareTokenList/
        ShareTokenList.tsx
        ShareTokenList.module.css
      IncomingPointerList/
        IncomingPointerList.tsx
        IncomingPointerList.module.css
    tree/
      BranchLinkForm/
        BranchLinkForm.tsx
        BranchLinkForm.module.css
      BranchPreview/
        BranchPreview.tsx
        BranchPreview.module.css
  styles/
    tokens/
      colors.css                   # Add --color-pointer-* tokens
    tree-global.css                # Add .person.pointed, .pointed-badge, etc.
```

---

## 12. Test Priority

1. **Pure functions (unit):** `extractPointedSubtree`, `mergePointedSubtree` — all 4 relationship types, depth limiting, graft inclusion
2. **Token utilities (unit):** `generateShareToken`, `hashShareToken` — entropy, hash consistency
3. **Deep copy (integration):** Full copy with ID remapping, place handling, anchor stitching, transaction safety
4. **Share token API (integration):** Create, list, revoke, preview, policy guard, rate limit, pointer limit
5. **Pointer redemption API (integration):** Redeem, validation (expired/revoked/wrong-workspace/max-used), relationship validation
6. **GET /tree merge (integration):** Merge with pointers, privacy redaction, shared root annotation, pointer metadata
7. **Mutation guards (integration):** UUID validation rejects `ptr-` IDs, ownership check rejects pointed individuals
8. **Source deletion cascade (integration):** Delete source root → pointer becomes broken → target gets copy
