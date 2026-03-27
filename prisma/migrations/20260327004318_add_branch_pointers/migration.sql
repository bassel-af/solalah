-- CreateEnum
CREATE TYPE "BranchSharingPolicy" AS ENUM ('shareable', 'copyable_only', 'none');

-- CreateEnum
CREATE TYPE "BranchPointerStatus" AS ENUM ('active', 'revoked', 'broken');

-- CreateEnum
CREATE TYPE "BranchPointerRelationship" AS ENUM ('child', 'sibling', 'spouse', 'parent');

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "branch_sharing_policy" "BranchSharingPolicy" NOT NULL DEFAULT 'none';

-- CreateTable
CREATE TABLE "branch_share_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" TEXT NOT NULL,
    "source_workspace_id" UUID NOT NULL,
    "root_individual_id" UUID NOT NULL,
    "depth_limit" INTEGER,
    "include_grafts" BOOLEAN NOT NULL DEFAULT false,
    "target_workspace_id" UUID,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_share_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_pointers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_workspace_id" UUID NOT NULL,
    "root_individual_id" UUID NOT NULL,
    "depth_limit" INTEGER,
    "include_grafts" BOOLEAN NOT NULL DEFAULT false,
    "target_workspace_id" UUID NOT NULL,
    "anchor_individual_id" UUID NOT NULL,
    "relationship" "BranchPointerRelationship" NOT NULL,
    "status" "BranchPointerStatus" NOT NULL DEFAULT 'active',
    "share_token_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_pointers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branch_share_tokens_token_hash_key" ON "branch_share_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "branch_share_tokens_source_workspace_id_idx" ON "branch_share_tokens"("source_workspace_id");

-- CreateIndex
CREATE INDEX "branch_share_tokens_target_workspace_id_idx" ON "branch_share_tokens"("target_workspace_id");

-- CreateIndex
CREATE INDEX "branch_pointers_target_workspace_id_status_idx" ON "branch_pointers"("target_workspace_id", "status");

-- CreateIndex
CREATE INDEX "branch_pointers_source_workspace_id_idx" ON "branch_pointers"("source_workspace_id");

-- CreateIndex
CREATE INDEX "branch_pointers_root_individual_id_idx" ON "branch_pointers"("root_individual_id");

-- AddForeignKey
ALTER TABLE "branch_share_tokens" ADD CONSTRAINT "branch_share_tokens_source_workspace_id_fkey" FOREIGN KEY ("source_workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_share_tokens" ADD CONSTRAINT "branch_share_tokens_target_workspace_id_fkey" FOREIGN KEY ("target_workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_share_tokens" ADD CONSTRAINT "branch_share_tokens_root_individual_id_fkey" FOREIGN KEY ("root_individual_id") REFERENCES "individuals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_share_tokens" ADD CONSTRAINT "branch_share_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_pointers" ADD CONSTRAINT "branch_pointers_source_workspace_id_fkey" FOREIGN KEY ("source_workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_pointers" ADD CONSTRAINT "branch_pointers_target_workspace_id_fkey" FOREIGN KEY ("target_workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_pointers" ADD CONSTRAINT "branch_pointers_root_individual_id_fkey" FOREIGN KEY ("root_individual_id") REFERENCES "individuals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_pointers" ADD CONSTRAINT "branch_pointers_anchor_individual_id_fkey" FOREIGN KEY ("anchor_individual_id") REFERENCES "individuals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_pointers" ADD CONSTRAINT "branch_pointers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
