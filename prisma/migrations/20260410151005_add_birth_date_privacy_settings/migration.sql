-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "hide_birth_date_for_female" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hide_birth_date_for_male" BOOLEAN NOT NULL DEFAULT false;
