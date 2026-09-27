---
phase: 11-durable-backend
plan: 02
subsystem: infra
tags: [postgresql, backup, restore, systemd, docker-compose]

requires: []
provides:
  - "infra/vps/backup-postgres.sh: unattended pg_dump --format=custom with size-sanity check and retention pruning"
  - "infra/vps/restore-postgres.sh: restore into a brand-new, never-existing-before database"
  - "infra/vps/cortege-backup.service / .timer: daily unattended schedule"
  - "infra/vps/README.md 'Backups' section + retitled disaster-recovery restore section"
affects: []

tech-stack:
  added: []
  patterns:
    - "Scripts resolve POSTGRES_USER/POSTGRES_DB from the running container's own env (docker compose exec ... printenv), not by re-parsing the env file, so they never drift from what the API actually connects to"
    - "Restore never overwrites the live database: it always creates a new, uniquely-named database and refuses if that name exists"

key-files:
  created:
    - infra/vps/backup-postgres.sh
    - infra/vps/restore-postgres.sh
    - infra/vps/cortege-backup.service
    - infra/vps/cortege-backup.timer
  modified:
    - infra/vps/README.md

key-decisions:
  - "Custom pg_dump format (not plain SQL), so pg_restore can restore selectively and in parallel"
  - "A dump under 1 KiB is treated as a failed backup and discarded rather than kept and later pruning out a good one"
  - "Retention: 14 days by default, overridable via RETENTION_DAYS"
  - "Daily backup at 03:17 UTC with a 10-minute randomized delay, deliberately off the deploy timer's 5-minute cadence"
  - "Offsite copy of the backup directory is documented as a known gap, not implemented: the requirement is a working scheduled backup + a proven restore, not full 3-2-1 redundancy"
  - "Rehearsal was run against the local dev Docker Compose stack (infra/docker-compose.yml), never the production VPS, per the task's explicit guardrail"

requirements-completed: [REQ-INF-backups]

duration: ~50min
completed: 2026-09-27
---

# Phase 11 Plan 02: PostgreSQL Backup and Restore Summary

**A scheduled, unattended PostgreSQL backup (`cortege-backup.timer`, daily) now exists alongside
the existing deploy timer, and the backup+restore pipeline was proven end to end against the local
dev Compose stack: a real survey and user row, and the full 16-migration `schema_migrations`
history, both round-tripped through `pg_dump --format=custom` and `pg_restore` with zero data
loss.**

## What was built

- `infra/vps/backup-postgres.sh` — runs `pg_dump --format=custom` inside the running `postgres`
  compose service, writes a UTC-timestamped dump to `$BACKUP_DIR` (default
  `/home/ubuntu/backups/postgres`), discards it if under 1 KiB (a failed or empty-database dump
  must never displace a good one during pruning), and prunes anything older than `$RETENTION_DAYS`
  (default 14).
- `infra/vps/restore-postgres.sh <dump> [target-db]` — always creates a **brand-new** database
  (refuses if the name already exists) and restores into it, so it is safe to run as a routine
  rehearsal next to a live stack. It never touches the live database; a real disaster restore
  (replacing the live database) is documented as a separate, deliberate operation in the retitled
  "Restoring the database (disaster recovery)" section, which already existed from an earlier
  phase (the `xid8` fix-up for the sync feed) and now also references the concrete restore command
  instead of a `# ... restore the dump ...` placeholder.
- `cortege-backup.service` / `cortege-backup.timer` — systemd units matching the existing
  `cortege-deploy.*` pattern, daily at 03:17 UTC with a randomized 10-minute delay.
- `infra/vps/README.md` gets a new "Backups" section between "Rolling back" and the disaster-
  recovery restore section: install commands, a run-once verification, the rehearsal command, and
  an explicit, honest note that copying `$BACKUP_DIR` off the VPS is a real gap this script does
  not close (documented as a follow-up, not implemented).

## Local rehearsal (the actual proof)

Run against `infra/docker-compose.yml` (the dev stack), **not** the production VPS:

1. Started the dev Postgres container, ran all 16 migrations (`npm run migrate:api`), seeded one
   user and one survey row.
2. Ran the real `backup-postgres.sh` unmodified (with `COMPOSE_FILE`/`ENV_FILE` pointed at the dev
   stack): produced a 24 200-byte custom-format dump.
3. Ran the real `restore-postgres.sh` against that dump into a new `ibp_restore_rehearsal`
   database: it reported 8 tables and 1 `surveys` row. Verified directly: the survey row
   (`site_name`, `parcel_id`, `status`), the user row (`email`, `display_name`), and all 16
   `schema_migrations` filenames were present and byte-identical to the source.
4. Verified the guard rails: restoring into `ibp_restore_rehearsal` a second time was refused
   ("already exists"); a target name containing `; DROP TABLE users;` was refused before any SQL
   ran.
5. Verified failure handling: pointing the backup script at a non-running service failed cleanly
   with no partial file left behind; a synthetic 20-day-old dump was correctly pruned on the next
   run while a fresh one was kept.
6. Cleaned up (`dropdb`, removed the temporary backup directory) and confirmed the native
   PostgreSQL cluster used by the rest of this session's E2E work was unaffected.

## What deploying this to production still requires (owner action, not performed here)

Per `infra/vps/README.md`, "Backups": `sudo cp infra/vps/cortege-backup.* /etc/systemd/system/ &&
systemctl daemon-reload && systemctl enable --now cortege-backup.timer`, then one manual run of
`infra/vps/restore-postgres.sh` against a real production dump to confirm the same proof holds
against the actual VPS Postgres container — the scripts are unchanged between the local rehearsal
and production use, only `COMPOSE_FILE`/`ENV_FILE` differ (they already default to the production
paths).

## Verification

- Backup: non-empty custom-format dump produced from a real, migrated database.
- Restore: full data and schema-history fidelity confirmed by direct query, not just the script's
  own row-count report.
- Both scripts' error paths (existing target db, invalid db name, unreachable service, tiny/empty
  dump) exercised and confirmed to fail safely with no partial state.
- No change made to the production VPS, its database, or its systemd units.
