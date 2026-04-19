-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "enable_tree_export" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allow_member_export" BOOLEAN NOT NULL DEFAULT false;
