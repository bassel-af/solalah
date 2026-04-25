-- Phase 2 Live Presence — User heartbeat columns + PlatformStat singleton.
-- See docs/prd-admin-dashboard.md §4.4.

-- AlterTable: add the three heartbeat columns and FK to workspaces.
ALTER TABLE "users"
  ADD COLUMN "last_active_at" TIMESTAMP(3),
  ADD COLUMN "last_active_route" VARCHAR(200),
  ADD COLUMN "last_active_workspace_id" UUID;

ALTER TABLE "users"
  ADD CONSTRAINT "users_last_active_workspace_id_fkey"
  FOREIGN KEY ("last_active_workspace_id")
  REFERENCES "workspaces"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "users_last_active_at_idx" ON "users" ("last_active_at");

-- CreateTable: singleton stats row (id always 1).
CREATE TABLE "platform_stats" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "peak_concurrent_users" INTEGER NOT NULL DEFAULT 0,
  "peak_recorded_at" TIMESTAMP(3),
  CONSTRAINT "platform_stats_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_stats_singleton" CHECK ("id" = 1)
);

INSERT INTO "platform_stats" ("id", "peak_concurrent_users") VALUES (1, 0)
  ON CONFLICT ("id") DO NOTHING;

-- Backfill platform owner flag for the two seed accounts. Idempotent: only
-- updates rows where the flag is currently false.
UPDATE "users"
SET "is_platform_owner" = true
WHERE lower("email") IN ('bassel.saeed9@gmail.com', 'bassel@gynat.com')
  AND "is_platform_owner" = false;

-- Post-commit assertion. If the assertion fails the migration aborts and
-- the transaction is rolled back. Rationale: we never want a deploy that
-- silently leaves the platform with zero or one owner — the team-lead spec
-- requires at-least-2 to prevent a lockout.
DO $$
DECLARE
  owner_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO owner_count FROM "users" WHERE "is_platform_owner" = true;
  IF owner_count < 2 THEN
    RAISE EXCEPTION 'Expected at least 2 platform owners after backfill, got %', owner_count;
  END IF;
END $$;
