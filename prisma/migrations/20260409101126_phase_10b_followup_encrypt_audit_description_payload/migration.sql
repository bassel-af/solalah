-- Phase 10b follow-up (task #20): encrypt TreeEditLog.description + payload.
--
-- The Phase 10b shipping task (#13) intentionally left these two columns
-- plaintext to contain the scope of the main migration (16 call sites write
-- description; payload is per-action free-form). Security audit flagged them
-- as PII leaks:
--   - `description` can contain `"إضافة شخص \"أحمد\""` — carries the given name
--   - `payload.targetName` on cascade_delete carries the target givenName
--   - `payload` can carry arbitrary other entity metadata
--
-- Fix: convert both to BYTEA so AES-256-GCM ciphertext can live there.
-- Existing plaintext rows become raw UTF-8 bytes via `convert_to(col, 'UTF8')`
-- (for payload we have to cast Json→text first via `::text` because the
-- Json type doesn't have a text coercion). Task #24 will walk every row
-- through the same "try decrypt first, else treat as plaintext" gate used in
-- #16 and re-encrypt in place.
--
-- The `ALTER TABLE ... ALTER COLUMN ... TYPE BYTEA USING convert_to(...)`
-- pattern is the same one we used in
-- `20260408191530_phase_10b_workspace_encryption` — it preserves every
-- existing byte without any DROP+RECREATE step.

ALTER TABLE "tree_edit_logs"
  ALTER COLUMN "description" TYPE BYTEA USING convert_to("description", 'UTF8'),
  ALTER COLUMN "payload"     TYPE BYTEA USING convert_to("payload"::text, 'UTF8');
