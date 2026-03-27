/*
  Warnings:

  - Added the required column `selected_individual_id` to the `branch_pointers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "branch_pointers" ADD COLUMN     "selected_individual_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "workspaces" ALTER COLUMN "branch_sharing_policy" SET DEFAULT 'shareable';

-- AddForeignKey
ALTER TABLE "branch_pointers" ADD CONSTRAINT "branch_pointers_selected_individual_id_fkey" FOREIGN KEY ("selected_individual_id") REFERENCES "individuals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
