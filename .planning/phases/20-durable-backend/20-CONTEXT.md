# Phase 11: Durable Backend - Context

**Gathered:** 2026-09-27
**Status:** Executed autonomously (no interactive owner available in this session)
**Source:** `.planning/ROADMAP.md` Phase 11 definition + `.planning/REQUIREMENTS.md` (REQ-INF-hosting-adr,
REQ-INF-backups, REQ-INF-migrations, REQ-INF-deadcode, REQ-QA-sql-injection, REQ-QA-indexes)

<domain>
## Phase Boundary

Phase 11 is independent of every other MVP phase (Depends on: Nothing) and is almost entirely
backend/infra/docs work, run in parallel with Phase 2 (association-only sharing) and Phase 3
(field-entry ergonomics), both mobile-UI phases with minimal overlap risk.

Five success criteria, investigated before any code was written:

1. **Hosting ADR** — ratify the VPS stack, superseding the unratified alwaysdata + Cloudflare R2
   note. Documentation/decision only, not a migration.
2. **Backups** — a scheduled, unattended PostgreSQL backup, with at least one recorded
   backup+restore rehearsal into a clean database. Must not touch the real production VPS.
3. **Migrations** — a fresh database and production reach the same schema version through one
   documented path, and a deliberately failed migration must not half-apply.
4. **Dead code** — `api/src/users/email.service.ts` and `SMTP_*` gone from the repo, env examples
   and deployment env.
5. **SQL injection / indexes** — a lint rule against SQL string interpolation, plus
   `survey_events(actor_id)` indexed and three redundant indexes dropped, confirmed by `EXPLAIN`.

## Pre-existing state (found during investigation, not built in this phase)

Two of the five criteria were **already fully satisfied** by earlier phases, before any Phase 11
work started:

- **Criterion 4 (dead code)**: `api/src/users/email.service.ts` does not exist in the repo, and
  `SMTP_*` appears nowhere under `api/src` or `api/.env.example`. `infra/vps/check-env.sh` already
  lists all seven `SMTP_*` variables plus `EMAIL_CHANGE_CONFIRM_URL_TEMPLATE` under "Variables
  supprimées en phase 01.9 (D-09)". `CLAUDE.md` already documents "The API sends no email: the SMTP
  settings and EmailService were removed (phase 01.9)." Verified by grep across `api/src`,
  `api/.env.example` and `infra/vps/env.example`: zero hits.
- **Criterion 5, index half**: migration `015_public_indexes_centroid_columns.sql` (phase 01.7)
  already adds `idx_survey_events_actor_id ON survey_events (actor_id) WHERE actor_id IS NOT NULL`
  and already drops `idx_users_auth0_sub`, `idx_surveys_parcel_id` and
  `idx_survey_parcels_survey_id` with a one-line reason for each. Nothing to add here; this phase's
  job was to produce the `EXPLAIN` evidence the requirement asks for, not to write the migration.

This phase's real, net-new work is therefore: the ADR (criterion 1), the backup/restore mechanism
and its local rehearsal (criterion 2), the migration-atomicity proof plus its documentation
(criterion 3), the SQL-injection lint rule (criterion 5, lint half), and the `EXPLAIN` evidence
(criterion 5, second half).

</domain>

<decisions>
## Implementation Decisions

### D-01: Hosting ADR (REQ-INF-hosting-adr)

- New `docs/technical/adr-004-hosting-and-infrastructure-v1.md`, following the ADR-001 template
  (Status/Date/Context/Decision/Why/Consequences/Out of Scope/Expected Validation).
- Ratifies the status quo (VPS + Docker Compose + Caddy + GHCR + systemd timer + MinIO), explicitly
  superseding `docs/project/presentation-association.md`'s alwaysdata + Cloudflare R2 note. Not a
  migration: no infrastructure changes as a result of the ADR itself.
- `docs/project/presentation-association.md` is corrected in the same change (budget table, "Où
  sont hébergées les données", "Le serveur", the tool-access ask list) so the stakeholder-facing
  document and the ratified decision agree. A dated addendum line records what changed and why,
  consistent with how ADR-001 records its own 2026-04-06 update inline.
- `docs/README.md` gets one new line pointing at ADR-004, next to the existing ADR-003 line.
- `.planning/INGEST-CONFLICTS.md` (a generated, timestamped snapshot) is left untouched; its
  warning 7 is closed the same way `REQUIREMENTS.md` already closes warning-referencing items —
  by the requirement's own "Closes conflict-report warning 7" line, now checked off.

### D-02: Backups (REQ-INF-backups)

- Two new scripts under `infra/vps/`, matching the existing `update-stack.sh`/`check-env.sh` shell
  style (bash, `set -euo pipefail`, timestamped `log()`, `REPO_DIR`/`ENV_FILE`/`COMPOSE_FILE`
  overridable via env for local rehearsal):
  - `backup-postgres.sh`: `docker compose exec postgres pg_dump --format=custom` into
    `$BACKUP_DIR` (default `/home/ubuntu/backups/postgres`), rejects a suspiciously small dump
    (<1 KiB, a sign `pg_dump` ran against an empty/unreachable database), prunes dumps older than
    `$RETENTION_DAYS` (default 14).
  - `restore-postgres.sh <dump> [target-db]`: always creates a **new** database and refuses if it
    already exists, so it never touches the live database — safe to run as a routine rehearsal
    next to a running stack. Reports table and `surveys` row counts on success.
- New systemd units `cortege-backup.service` / `cortege-backup.timer` (daily,
  `OnCalendar=*-*-* 03:17:00`, `RandomizedDelaySec=10min`), matching the `cortege-deploy.*` pattern.
- `infra/vps/README.md` gets a new "Backups" section (install, run-once check, rehearsal command)
  between "Rolling back" and the existing "Restoring the database" section, which is retitled
  "Restoring the database (disaster recovery)" and updated to reference the actual restore command
  instead of a placeholder comment; both timers are stopped/restarted together in that section now.
- **What deploying this to production requires** (documented, not performed by this session — see
  "Not done" below): the owner runs the `sudo cp .../cortege-backup.* ...; systemctl enable --now
  cortege-backup.timer` block from the README on the VPS, then runs
  `infra/vps/restore-postgres.sh` once by hand to confirm the rehearsal also works against the real
  production Postgres container, exactly as it was proven locally in this phase.
- **Rehearsal actually run in this session**: against the **local dev Compose stack**
  (`infra/docker-compose.yml`), never the production VPS. See `evidence/` and 20-02-SUMMARY.md.
- Explicitly out of scope (documented as a follow-up in the new README section, not implemented):
  copying `$BACKUP_DIR` off the VPS. The requirement asks for a working scheduled backup + a proven
  restore, not full 3-2-1 backup redundancy.

### D-03: Migrations (REQ-INF-migrations)

- No code change needed: `api/scripts/migrate.js` already wraps each migration file in
  `BEGIN; <file>; INSERT INTO schema_migrations ...; COMMIT;` with a `catch` that issues
  `ROLLBACK`, and already takes a session advisory lock. This already gives per-file atomicity and
  a single documented path (`npm run migrate:api`) that a fresh database and production both use.
- What this phase adds: **proof** (a deliberately broken migration run locally, see
  20-03-SUMMARY.md and evidence) and **documentation** — new `api/migrations/README.md` stating the
  one documented path, the atomicity guarantee and the concrete verification, so this is no longer
  an implicit property of the script but a written, checkable contract.

### D-04: SQL injection lint rule + index evidence (REQ-QA-sql-injection, REQ-QA-indexes)

- A **custom local ESLint rule** (`api/eslint-local-rules/sql-no-unsafe-interpolation.js`), loaded
  via ESLint 8's `--rulesdir` flag (no new npm dependency, no plugin package needed) and wired into
  `api/.eslintrc.json` as `"sql-no-unsafe-interpolation": "error"`. No off-the-shelf ESLint plugin
  targets raw-`pg` template-literal SQL the way this codebase writes it, and a generic "no template
  literal expressions" rule would reject this codebase's own safe, existing dynamic-query-building
  code (see RESEARCH below), so a small purpose-built rule was the correct scope for "prevent a
  future regression" rather than "rewrite how queries are built."
- Rule design (full rationale in the file's header comment): gate on template literals that read
  like SQL (≥2 SQL-keyword matches, to avoid tripping on English words/test ids like
  `e2e-tx-update-...`), then recursively prove each interpolated expression is one of: a literal, a
  `.length`-based computation, a ternary between two safe branches, a lookup into a `const` object
  whose every value is safe, a `.join()` of an array whose every `.push()`ed element is safe, a
  locally-resolvable `const`/`let` whose every write is safe, or a SCREAMING_SNAKE_CASE identifier
  (this codebase's own naming convention for exported SQL fragment constants, e.g.
  `SURVEY_EVENT_INSERT_SQL`). Anything else is flagged.
- Verified empirically against the whole `api/src` and `api/test` tree (see 20-04-SUMMARY.md):
  zero findings in `api/src`; three genuine, unavoidable identifier-interpolation cases in
  test-only helpers (a dynamic table name, a DDL `WHEN` clause, a dynamic column list) — Postgres
  cannot bind an identifier as a query parameter, so each got a scoped, justified
  `eslint-disable`/`eslint-enable` with a one-line reason, not a rule change.
- `EXPLAIN (ANALYZE, BUFFERS)` evidence recorded in `evidence/explain-output.txt` against a locally
  seeded database (5 001 users, 40 020 surveys, 40 020 survey_events, 40 020 survey_parcels): the
  `users_auth0_sub_key` unique-constraint index serves the auth0_sub lookup (not the dropped
  `idx_users_auth0_sub`), `idx_survey_events_actor_id` serves the account-deletion anonymisation
  update, `idx_surveys_user_status`/`idx_surveys_user_updated` serve every account-deletion and
  survey-list query on `user_id` (no dropped index needed), `idx_surveys_parcel_year_version`
  serves the parcel-based lookup (the dropped `idx_surveys_parcel_id` was a pure prefix
  duplicate), and the `survey_parcels` primary key alone serves a `survey_id` lookup (the dropped
  `idx_survey_parcels_survey_id` was a pure prefix duplicate of it).

## Not done in this session (explicitly out of scope, per the task's own guardrail)

- **No change to the real production VPS or its database.** The backup timer, the restore script
  and the migration path are all proven locally (native PostgreSQL 16 cluster + the dev Docker
  Compose stack); deploying the timer to the VPS and rehearsing a restore there is the owner's
  action, documented step by step in `infra/vps/README.md`.
- **No offsite copy of backups.** Documented as a known gap and a follow-up, not implemented.
</decisions>
