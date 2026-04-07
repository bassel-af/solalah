-- AlterTable
ALTER TABLE "tree_edit_logs" ADD COLUMN     "description" VARCHAR(500),
ADD COLUMN     "snapshot_after" JSONB,
ADD COLUMN     "snapshot_before" JSONB;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "enable_audit_log" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enable_version_control" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "tree_edit_logs_tree_id_entity_type_entity_id_idx" ON "tree_edit_logs"("tree_id", "entity_type", "entity_id");
