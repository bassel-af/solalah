-- Phase 10b follow-up: revert tree_edit_logs.description from BYTEA back to
-- VARCHAR(500). Encrypting the description column proved entangled with the
-- audit log read path and 16 mutation routes that currently write plaintext
-- strings. Task #13 will re-introduce encryption in a dedicated second pass,
-- either by re-encoding this column or by adding a separate Bytes column.

ALTER TABLE "tree_edit_logs"
  ALTER COLUMN "description" TYPE VARCHAR(500) USING convert_from("description", 'UTF8');
