-- Phase 10b: Per-workspace application encryption
--
-- Adds Workspace.encrypted_key (nullable — existing workspaces are populated by
-- scripts/encrypt-existing-data.ts in a second pass) and converts sensitive
-- text columns on Individual, Family, RadaFamily, and TreeEditLog from TEXT /
-- VARCHAR to BYTEA. Data loss is prevented by the `USING convert_to(col, 'UTF8')`
-- clause, which rewrites existing plaintext as raw UTF-8 bytes. The migration
-- script then reads these plaintext bytes (which decryptFieldNullable
-- pass-through will recognize because they lack the ciphertext envelope) and
-- re-encrypts them in place.
--
-- PlaceId FK columns, booleans, sex, timestamps, and IDs stay plaintext because
-- they are needed for querying, referential integrity, and tree layout.
-- Place.name_ar / name_en are intentionally NOT changed (see schema comment).

-- ---------------------------------------------------------------------------
-- Workspace: add nullable wrapped key column
-- ---------------------------------------------------------------------------
ALTER TABLE "workspaces"
  ADD COLUMN "encrypted_key" BYTEA;

-- ---------------------------------------------------------------------------
-- Individual: convert sensitive fields to BYTEA preserving existing plaintext
-- ---------------------------------------------------------------------------
ALTER TABLE "individuals"
  ALTER COLUMN "given_name"        TYPE BYTEA USING convert_to("given_name", 'UTF8'),
  ALTER COLUMN "surname"           TYPE BYTEA USING convert_to("surname", 'UTF8'),
  ALTER COLUMN "full_name"         TYPE BYTEA USING convert_to("full_name", 'UTF8'),
  ALTER COLUMN "birth_date"        TYPE BYTEA USING convert_to("birth_date", 'UTF8'),
  ALTER COLUMN "birth_place"       TYPE BYTEA USING convert_to("birth_place", 'UTF8'),
  ALTER COLUMN "birth_description" TYPE BYTEA USING convert_to("birth_description", 'UTF8'),
  ALTER COLUMN "birth_notes"       TYPE BYTEA USING convert_to("birth_notes", 'UTF8'),
  ALTER COLUMN "birth_hijri_date"  TYPE BYTEA USING convert_to("birth_hijri_date", 'UTF8'),
  ALTER COLUMN "death_date"        TYPE BYTEA USING convert_to("death_date", 'UTF8'),
  ALTER COLUMN "death_place"       TYPE BYTEA USING convert_to("death_place", 'UTF8'),
  ALTER COLUMN "death_description" TYPE BYTEA USING convert_to("death_description", 'UTF8'),
  ALTER COLUMN "death_notes"       TYPE BYTEA USING convert_to("death_notes", 'UTF8'),
  ALTER COLUMN "death_hijri_date"  TYPE BYTEA USING convert_to("death_hijri_date", 'UTF8'),
  ALTER COLUMN "kunya"             TYPE BYTEA USING convert_to("kunya", 'UTF8'),
  ALTER COLUMN "notes"             TYPE BYTEA USING convert_to("notes", 'UTF8');

-- ---------------------------------------------------------------------------
-- Family: convert marriage contract / marriage / divorce event fields to BYTEA
-- ---------------------------------------------------------------------------
ALTER TABLE "families"
  ALTER COLUMN "marriage_contract_date"        TYPE BYTEA USING convert_to("marriage_contract_date", 'UTF8'),
  ALTER COLUMN "marriage_contract_hijri_date"  TYPE BYTEA USING convert_to("marriage_contract_hijri_date", 'UTF8'),
  ALTER COLUMN "marriage_contract_place"       TYPE BYTEA USING convert_to("marriage_contract_place", 'UTF8'),
  ALTER COLUMN "marriage_contract_description" TYPE BYTEA USING convert_to("marriage_contract_description", 'UTF8'),
  ALTER COLUMN "marriage_contract_notes"       TYPE BYTEA USING convert_to("marriage_contract_notes", 'UTF8'),
  ALTER COLUMN "marriage_date"        TYPE BYTEA USING convert_to("marriage_date", 'UTF8'),
  ALTER COLUMN "marriage_hijri_date"  TYPE BYTEA USING convert_to("marriage_hijri_date", 'UTF8'),
  ALTER COLUMN "marriage_place"       TYPE BYTEA USING convert_to("marriage_place", 'UTF8'),
  ALTER COLUMN "marriage_description" TYPE BYTEA USING convert_to("marriage_description", 'UTF8'),
  ALTER COLUMN "marriage_notes"       TYPE BYTEA USING convert_to("marriage_notes", 'UTF8'),
  ALTER COLUMN "divorce_date"        TYPE BYTEA USING convert_to("divorce_date", 'UTF8'),
  ALTER COLUMN "divorce_hijri_date"  TYPE BYTEA USING convert_to("divorce_hijri_date", 'UTF8'),
  ALTER COLUMN "divorce_place"       TYPE BYTEA USING convert_to("divorce_place", 'UTF8'),
  ALTER COLUMN "divorce_description" TYPE BYTEA USING convert_to("divorce_description", 'UTF8'),
  ALTER COLUMN "divorce_notes"       TYPE BYTEA USING convert_to("divorce_notes", 'UTF8');

-- ---------------------------------------------------------------------------
-- RadaFamily: encrypt notes
-- ---------------------------------------------------------------------------
ALTER TABLE "rada_families"
  ALTER COLUMN "notes" TYPE BYTEA USING convert_to("notes", 'UTF8');

-- ---------------------------------------------------------------------------
-- TreeEditLog: encrypt Arabic description
-- (snapshot_before / snapshot_after remain JSON; encryption is handled by
--  wrapping stored values in `{ _encrypted: true, data: "<base64>" }` — no
--  schema change needed.)
-- ---------------------------------------------------------------------------
ALTER TABLE "tree_edit_logs"
  ALTER COLUMN "description" TYPE BYTEA USING convert_to("description", 'UTF8');
