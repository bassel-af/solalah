---
name: query-prod-db
description: How to run read-only queries against the gynat production Postgres — connection, table names, encrypted fields, timestamps.
---

# Querying the gynat production database

Read-only queries only. For any write (`UPDATE`/`DELETE`/`INSERT`/`ALTER`/`DROP`/`TRUNCATE`/role changes), confirm with the user first.

## Connection

Postgres runs in Docker on `hz`. Container `docker-db-1`, superuser `postgres`. The application database is **`gynat`**.

```bash
ssh hz 'docker exec docker-db-1 psql -U postgres -d gynat -c "<SQL>"'
```

Always pass `-d gynat` — the default `postgres` DB is empty.

## Table names

Prisma maps models to snake_case plurals via `@@map`. Use the SQL names:

| Prisma model | SQL table |
|---|---|
| `Workspace` | `workspaces` |
| `User` | `users` |
| `Individual` | `individuals` |
| `Family` | `families` |
| `FamilyTree` | `family_trees` (one per workspace, `workspace_id` FK) |
| `WorkspaceMembership` | `workspace_memberships` |
| `BranchPointer` | `branch_pointers` |

Columns are snake_case too: `created_at`, `name_ar`, `tree_id`, `workspace_id`, `is_private`, `is_deceased`.

## Encrypted fields

Per `docs/encryption.md`, these `Individual` and `Family` fields are AES-256-GCM ciphertext (`bytea`), keyed per-workspace with a key wrapped under `WORKSPACE_MASTER_KEY`:

- `Individual`: `given_name`, `surname`, `full_name`, `birth_date`, `birth_place`, `birth_description`, `birth_notes`, every `death_*` counterpart, `birth_hijri_date`, `death_hijri_date`, `kunya`, `notes`
- `Family` event fields: `marc_*`, `marr_*`, `div_*` for date/place/description/notes

To read decrypted values, go through the app — either `GET /api/workspaces/[id]/tree` as an authenticated member, or run a `tsx` script on `hz` that imports `src/lib/tree/encryption.ts`. Tell the user this is the path so they understand why raw SQL won't show names.

Plaintext fields safe for raw SQL: `id`, `tree_id`, `gedcom_id`, `sex` (M/F), `is_deceased`, `is_private`, `created_at`, `updated_at`, `birth_place_id`, `death_place_id`, `created_by`. Use these for counts, existence checks, joins, and filters.

## Timestamps

`created_at` and friends are `timestamp without time zone`. Prisma writes UTC and the DB session is UTC. Always label timestamps as UTC when reporting, and offer a Damascus (UTC+3) conversion when it helps the reader.

## Workspace → tree join

`family_trees` is created lazily on first edit, so a workspace may have no row yet. To distinguish "no tree" from "empty tree":

```sql
SELECT w.slug, ft.id IS NOT NULL AS has_tree, COUNT(i.id) AS people
FROM workspaces w
LEFT JOIN family_trees ft ON ft.workspace_id = w.id
LEFT JOIN individuals i ON i.tree_id = ft.id
WHERE w.slug = 'safi'
GROUP BY w.slug, ft.id;
```

## Permissions

`docker exec` into the prod DB is sandbox-restricted, so the first query in a session needs user approval. Batch follow-up reads into a single `psql -c "...; ...; ..."` invocation to keep prompts down. The container uses trust auth from inside, so no credentials are needed — don't read `.env` files.
