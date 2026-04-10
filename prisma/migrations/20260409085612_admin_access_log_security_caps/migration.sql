/*
  Warnings:

  - You are about to alter the column `action` on the `admin_access_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `entity_type` on the `admin_access_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `entity_id` on the `admin_access_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `ip_address` on the `admin_access_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.

*/
-- DropForeignKey
ALTER TABLE "admin_access_logs" DROP CONSTRAINT "admin_access_logs_user_id_fkey";

-- AlterTable
ALTER TABLE "admin_access_logs" ALTER COLUMN "action" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "entity_type" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "entity_id" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "ip_address" SET DATA TYPE VARCHAR(64);
