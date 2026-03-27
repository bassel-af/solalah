import { z } from 'zod';

// ---------------------------------------------------------------------------
// Share Token — creation schema
// ---------------------------------------------------------------------------

/** Validated input for creating a branch share token */
export const createShareTokenSchema = z.object({
  rootIndividualId: z.string().uuid(),
  depthLimit: z.number().int().min(0).max(50).optional(),
  includeGrafts: z.boolean().optional().default(false),
  targetWorkspaceSlug: z.string().max(100).optional(),
  isPublic: z.boolean().optional().default(false),
});

// ---------------------------------------------------------------------------
// Token Redemption — redeem schema
// ---------------------------------------------------------------------------

/** Validated input for redeeming a branch share token */
export const redeemTokenSchema = z.object({
  token: z.string().min(1).max(200),
  anchorIndividualId: z.string().uuid(),
  selectedPersonId: z.string().min(1), // The person from the shared branch to link (may not be the token root)
  relationship: z.enum(['child', 'sibling', 'spouse', 'parent']),
});

// ---------------------------------------------------------------------------
// Branch Sharing Policy — update schema
// ---------------------------------------------------------------------------

/** Validated input for updating workspace branch sharing policy */
export const branchSharingPolicySchema = z.object({
  policy: z.enum(['shareable', 'copyable_only', 'none']),
});
