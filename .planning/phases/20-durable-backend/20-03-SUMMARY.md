---
phase: 20-durable-backend
plan: 03
subsystem: api-migrations
tags: [postgresql, migrations, atomicity, documentation]

requires: []
provides:
  - "api/migrations/README.md: documented one-path guarantee + verified atomicity contract"
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - api/migrations/README.md
  modified: []

key-decisions:
  - "No code change to api/scripts/migrate.js: it already wraps each file in BEGIN/COMMIT with rollback on error and takes an advisory lock (phase 01.7 D-14). This phase's job was to prove and document that guarantee, not build it"
  - "Verification used a temporary, never-committed migration file against a scratch database, not a change to any real migration"

requirements-completed: [REQ-INF-migrations]

duration: ~20min
completed: 2026-09-27
---

# Phase 11 Plan 03: Migration Atomicity Proof Summary

**`api/scripts/migrate.js` already gives a fresh database and production the same schema through
one path (`npm run migrate:api`) and already makes a failed migration roll back completely rather
than half-apply. This plan verified that guarantee directly against a real PostgreSQL 16 instance
and wrote it down as a documented contract (`api/migrations/README.md`).**

## What was verified

1. Created a scratch database (`ibp_migration_atomicity_test`) and applied all 16 real migrations
   via `node scripts/migrate.js` — the same command a fresh dev machine or a fresh production VPS
   would run. All 16 applied cleanly, confirming the "one documented path" property directly (this
   is the exact mechanism that keeps prod and fresh databases in sync, not just an assertion).
2. Added a temporary `api/migrations/017_test_deliberately_broken.sql`:
   ```sql
   CREATE TABLE test_atomicity_marker (id int);
   SELECT this_function_does_not_exist();
   ```
3. Ran `node scripts/migrate.js` again. Result: `Migration failed: function
   this_function_does_not_exist() does not exist`, process exited non-zero.
4. Confirmed the schema was left **exactly** as it was before the failed run:
   - `SELECT to_regclass('public.test_atomicity_marker')` → NULL (the valid `CREATE TABLE`
     statement that ran before the failing one was rolled back, not just the failing statement
     itself — proving whole-file atomicity, not per-statement).
   - `schema_migrations` still listed exactly the 16 prior filenames, no row for `017_...`.
5. Removed the temporary file and re-ran the migrator: `Migrations are up to date.` with zero
   manual cleanup required — proving the retry-after-fix path works as designed.
6. Dropped the scratch database. `git status api/migrations/` confirmed no trace of the temporary
   file was left in the working tree.

## What was written

`api/migrations/README.md`: states the one documented path (`npm run migrate:api` →
`node api/scripts/migrate.js`, sorted `NNN_*.sql` files, `schema_migrations` bookkeeping, advisory
lock), the atomicity mechanism (`BEGIN`/`COMMIT`/`ROLLBACK` around each file, sent as one
multi-statement query so a mid-file failure aborts every statement in that file, not just the
failing one), the exact verification this plan performed (summarized above), and house rules for
writing new migrations (numbering, `IF EXISTS`/`IF NOT EXISTS` guards, never `CREATE INDEX
CONCURRENTLY` inside the runner's transaction, never edit an already-shipped file).

## Verification

- Automated: the migration run's exit code, the `to_regclass` NULL result, and the
  `schema_migrations` row count were all checked directly via `psql`, not inferred.
- No production database, migration file, or CI configuration was touched.
