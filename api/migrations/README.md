# Migrations (Phase 11, REQ-INF-migrations)

## The one documented path

Every environment — a developer's machine, CI, and the production VPS — reaches the
same schema by running the same command against an ordered set of `*.sql` files in
this directory:

```bash
npm run migrate:api   # -> npm --workspace api run migrate -> node api/scripts/migrate.js
```

`api/scripts/migrate.js`:

1. Takes a session-level advisory lock (`pg_advisory_lock`) so a manual run and the
   API image's own startup migration cannot race each other.
2. Ensures a `schema_migrations(id, filename, applied_at)` bookkeeping table exists.
3. Reads every `NNN_description.sql` file in this directory, sorted by filename, and
   skips any whose filename is already recorded in `schema_migrations`.
4. Applies each remaining file, in order, and records it.

A **fresh database** (a new dev machine, a CI run, a brand-new VPS) and the
**production database** therefore always converge on the same schema: both start
from an empty `schema_migrations` table (or whatever subset they already have) and
apply exactly the files they are missing, in the same numeric order. There is no
second path (no manual `ALTER TABLE`, no separate "prod-only" script) — a change to
the schema is a new numbered file here, nothing else.

## A failed migration cannot half-apply

Each file is applied as `BEGIN; <file contents>; INSERT INTO schema_migrations ...;
COMMIT;`. The file's SQL is sent as a single multi-statement query, so if any
statement in it fails, PostgreSQL aborts the whole transaction; the runner's `catch`
then issues `ROLLBACK`. This means, for the file that failed:

- none of its statements are kept, even ones that ran successfully before the
  failing statement;
- no row is written to `schema_migrations` for it, so the next run retries it from
  the start once the file is fixed;
- every migration applied before it stays committed and untouched.

This was verified directly (Phase 11, `.planning/phases/20-durable-backend/`): a
temporary migration file with a valid `CREATE TABLE` followed by a call to a
non-existent function was run against a database that already had migrations
001–016 applied. The runner exited non-zero, the table from the valid first
statement did not exist afterwards, and `schema_migrations` still listed exactly
the 16 prior migrations — no 17th row, no partial DDL. Removing the broken file and
re-running the migrator immediately reported "Migrations are up to date," with no
manual cleanup required.

## Writing a new migration

- Add `NNN_short_description.sql` with `NNN` one higher than the last file.
- Prefer `IF NOT EXISTS` / `IF EXISTS` guards on `CREATE`/`DROP` so a migration is
  safe to re-run by hand against a database where it partially exists (this also
  makes local debugging easier; it does not replace the transactional guarantee
  above).
- The runner wraps the file in `BEGIN`/`COMMIT` itself — do not add your own, and do
  not use `CREATE INDEX CONCURRENTLY` (it cannot run inside a transaction block).
- Never edit an already-applied, already-shipped migration file; add a new one.
