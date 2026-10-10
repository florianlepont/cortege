---
phase: 20-durable-backend
verified: 2026-10-06T00:00:00Z
status: passed
score: 5/5 must-haves verified in the repository; the 2 owner-only production checks done 2026-10-10
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "On the VPS, install the backup timer as written in infra/vps/README.md (Backups): copy cortege-backup.* to /etc/systemd/system, daemon-reload, enable --now cortege-backup.timer, then run `sudo systemctl start cortege-backup.service` once and check `ls -lh /home/ubuntu/backups/postgres/`"
    expected: "A cortege-postgres-<timestamp>.dump of several tens of KiB appears; `systemctl list-timers cortege-backup.timer` shows the next 03:17 UTC run; a second dump appears the next day without any manual action"
    why_human: "Nothing in the repository, STATE.md, PROJECT.md or the owner log records that the timer was ever installed on the VPS. 20-CONTEXT.md and 20-02-SUMMARY.md state this was left to the owner on purpose (no production access in the build session). Without it the 'runs unattended' half of the criterion is true of the repository, not yet of production."
  - test: "On the VPS, run `infra/vps/restore-postgres.sh /home/ubuntu/backups/postgres/<a real dump>` once, check the table and surveys counts it prints, then drop the throwaway database with the dropdb command it prints"
    expected: "'restore OK' with 8 or more public tables (the schema now has more than at rehearsal time) and a surveys count equal to the live count"
    why_human: "Only the owner has VPS access. The rehearsal on record ran against the local dev Compose stack with the same unmodified scripts. The production container (service `postgres`, container `cortege-postgres` in infra/docker-compose.vps.yml) is the same shape, but it has not been exercised."
---

# Phase 11: Durable Backend Verification Report

**Phase Goal:** The production database can survive a failure, the hosting that is actually running is the hosting that is written down, and the API no longer carries dead or unsafe code.
**Verified:** 2026-10-06
**Status:** human_needed (no code gap; two owner-only checks on the VPS)
**Re-verification:** No, initial verification (the phase shipped in commit 6759205 on 2026-09-27 without a VERIFICATION.md)

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | An accepted ADR ratifies the VPS stack (Docker + Caddy + GHCR + systemd timer + MinIO on `cortege.algernon.ovh`), superseding the alwaysdata + Cloudflare R2 note | VERIFIED | `docs/technical/adr-004-hosting-and-infrastructure-v1.md` exists, `## Status` is `Accepted`, dated 2026-09-27. Its Context names the unratified alwaysdata + R2 plan and says it was never implemented. Its Decision lists compute (Compose on the VPS), Caddy for `cortege.algernon.ovh` and `cortege-files.algernon.ovh`, GHCR, the systemd deploy timer and `pgsty/minio`, and ties the database to the Phase 11 durability work. `docs/README.md:12` links it as superseding the R2 note. `docs/project/presentation-association.md` (lines 7, 163, 267) now says the alwaysdata + R2 plan was never carried out and points at ADR-004. The ADR matches the infra actually in the repo: `infra/docker-compose.vps.yml` (service `postgres`, container `cortege-postgres`), `infra/vps/Caddyfile.snippet`, `cortege-deploy.timer`. |
| 2 | A scheduled PostgreSQL backup runs unattended, and a restore of one of those backups into a clean database has been performed and recorded at least once | VERIFIED in the repo; production install is a human item | Mechanism present and consistent: `infra/vps/backup-postgres.sh` (mode 100755 in git, `bash -n` clean) runs `pg_dump --format=custom` inside the `postgres` compose service, writes `$BACKUP_DIR/cortege-postgres-<UTC>.dump` through a `.part` file, discards a dump under 1 KiB, prunes after `RETENTION_DAYS` (14). `infra/vps/cortege-backup.timer` is `OnCalendar=*-*-* 03:17:00`, `RandomizedDelaySec=10min`, `Persistent=true`, `WantedBy=timers.target`. `cortege-backup.service` is `Type=oneshot`, `User=ubuntu`, `ExecStart=/home/ubuntu/cortege/infra/vps/backup-postgres.sh`, with the same `REPO_DIR`/`ENV_FILE` convention as the deploy service. `infra/vps/restore-postgres.sh` (100755) always creates a new database, refuses an existing name, bounds the name to `^[A-Za-z_][A-Za-z0-9_]*$` and reports table and `surveys` counts. `infra/vps/README.md` has the Backups section and a retitled disaster-recovery section that references the script. The restore was performed and recorded: `20-02-SUMMARY.md` records a 24 200-byte dump of a migrated dev database restored into `ibp_restore_rehearsal` with 8 tables, the survey and user rows and all `schema_migrations` rows intact, plus the guard rails (existing target refused, injection-shaped name refused, unreachable service leaves no partial file, 20-day-old dump pruned). I did not re-run the rehearsal (it needs Docker Compose and a seeded database), so this rests on the SUMMARY plus my reading of the scripts. The rehearsal output is narrative only: `evidence/` holds the EXPLAIN files, not a backup log. Whether the timer is installed on the VPS is not recorded anywhere (human item 1), and neither is a restore against the production container (human item 2). The off-VPS copy is a documented gap, not part of the criterion (see Anti-Patterns). |
| 3 | A fresh database and production reach the same schema version through one documented path, and a failed migration leaves the schema unchanged | VERIFIED | `api/migrations/README.md` documents the single path (`npm run migrate:api` to `node api/scripts/migrate.js`, sorted `NNN_*.sql`, `schema_migrations`, advisory lock) and the `BEGIN` / `INSERT INTO schema_migrations` / `COMMIT` with `ROLLBACK` contract. `api/scripts/migrate.js` still takes `pg_advisory_lock` (re-verified by `migrate-lock.e2e-spec.ts` in 01.7, unchanged). Migrations now run 001 to 019 (`017_association_only_visibility`, `018_factor_a_genus_list`, `019_no_submission_deadline` were added after the phase), all through the same runner, so the documented path survived later growth. The README's "001 to 016" sentence describes the state at rehearsal time and is now only historical. The deliberately broken migration run is recorded in `20-03-SUMMARY.md` (non-zero exit, `to_regclass('public.test_atomicity_marker')` NULL, `schema_migrations` unchanged, clean retry). I did not repeat it. |
| 4 | `api/src/users/email.service.ts` and the vestigial `SMTP_*` variables are gone from the repo, `api/.env.example` and the deployment env | VERIFIED | `api/src/users/` holds `dtos`, `users.controller.ts`, `users.module.ts`, `users.service.ts` only. `grep -rnE "SMT[P]_\|EmailServic[e]" api/src` returns nothing, and the same pattern over `infra`, `.github` and `api/test` finds only the obsolete-variable list in `check-env.sh`, one README note about it and the guarding specs (`check-env-parity.spec.ts`, `env.schema.spec.ts`). A direct read of `api/.env.example` and `infra/vps/env.example` was blocked by the sandbox in this session, so those two files rest on `20-05-dead-code-verification.md` (grep recorded 2026-09-27) plus `check-env.sh` listing every `SMTP_*` name as obsolete and `api/test/env.schema.spec.ts` asserting that a leftover `SMTP_*` line is ignored as an unknown key (the schema defines none). |
| 5 | A lint rule rejects interpolating values into SQL strings; `survey_events(actor_id)` is indexed and the three redundant indexes are dropped, confirmed by `EXPLAIN` | VERIFIED | Rule: `api/eslint-local-rules/sql-no-unsafe-interpolation.js`, loaded by `--rulesdir eslint-local-rules` in `api/package.json` (`lint` script) and enabled as `"sql-no-unsafe-interpolation": "error"` in `api/.eslintrc.json`. Positive control run here on a scratch file: a template literal `SELECT ... WHERE name = '${name}' ORDER BY id` is reported ("Interpolating this into SQL text bypasses parameterized queries..."), exit 1, while the `$1` bound twin on the next function is clean. `npx eslint --rulesdir eslint-local-rules "src/**/*.ts" "test/**/*.ts"` in `api/` exits 0. The only suppressions are three scoped `eslint-disable`/`enable` pairs in test helpers (`attachments-reports-transactions.e2e-spec.ts:77`, `migration-016-ibp-method-version.e2e-spec.ts:56`, `e2e-fault-injection.ts:57`), for identifiers Postgres cannot bind. Indexes: `api/migrations/015_public_indexes_centroid_columns.sql:25` creates `idx_survey_events_actor_id` and lines 31 to 33 drop `idx_users_auth0_sub`, `idx_surveys_parcel_id` and `idx_survey_parcels_survey_id`, each with its reason. Evidence: `evidence/explain-output.txt` shows `Index Scan using users_auth0_sub_key` for the auth lookup, `Bitmap Index Scan on idx_survey_events_actor_id` in the account-deletion update, `idx_surveys_user_status` for the user-scoped queries, `idx_surveys_parcel_year_version` for the parcel lookup and `Index Only Scan using survey_parcels_pkey` for the survey_id lookup. The few `Seq Scan` lines are on `attachments` (0 rows) and on `users` inside an anti-join over 5 001 users, not on a column the dropped indexes covered. |

**Score:** 5/5 truths verified in the repository.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docs/technical/adr-004-hosting-and-infrastructure-v1.md` | Accepted ADR | VERIFIED | Linked from `docs/README.md` |
| `infra/vps/backup-postgres.sh` | Unattended dump, size guard, retention | VERIFIED | Executable, syntax clean, no TODO markers |
| `infra/vps/restore-postgres.sh` | Restore into a new database only | VERIFIED | Executable, name validation, existence refusal |
| `infra/vps/cortege-backup.service`, `cortege-backup.timer` | Daily schedule | VERIFIED | Match the `cortege-deploy.*` pattern; `systemd-analyze` is not available here, so unit syntax was read, not machine-checked |
| `infra/vps/README.md` Backups and disaster-recovery sections | Install, run-once, rehearsal, restore | VERIFIED | Stops and restarts both timers during a disaster restore |
| `api/migrations/README.md` | One path, atomicity contract | VERIFIED | Written 2026-09-27 |
| `api/eslint-local-rules/sql-no-unsafe-interpolation.js` | Local lint rule | VERIFIED | Fires on the positive control, wired in lint script and config |
| `.planning/phases/20-durable-backend/evidence/` | `explain-output.txt`, `explain-queries.sql`, `seed-explain-data.sql` | VERIFIED | All three present |
| `20-05-dead-code-verification.md` | Basis for the dead-code checkbox | VERIFIED | Matches what I re-checked in `api/src` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `cortege-backup.timer` | `cortege-backup.service` | same unit basename | WIRED | No `Unit=` needed |
| `cortege-backup.service` | `backup-postgres.sh` | `ExecStart` plus `REPO_DIR`/`ENV_FILE`/`BACKUP_DIR` | WIRED | Script defaults `COMPOSE_FILE` to `$REPO_DIR/infra/docker-compose.vps.yml`, which exists |
| `backup-postgres.sh` | live database | `compose exec postgres printenv POSTGRES_USER/POSTGRES_DB` | WIRED | Service name `postgres` matches `infra/docker-compose.vps.yml:11` |
| `api/package.json` lint | local rule | `--rulesdir eslint-local-rules` | WIRED | Also reached by root `npm run lint` through workspaces |
| `.eslintrc.json` | rule | `"sql-no-unsafe-interpolation": "error"` | WIRED | Confirmed by running it |
| `update-stack.sh` / migrate runner | `api/migrations/*.sql` | `scripts/migrate.js` | WIRED | Same path for fresh and production databases |

### Data-Flow Trace (Level 4)

Not applicable: infrastructure, documentation and lint work, with no component rendering dynamic data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Shell scripts parse | `bash -n infra/vps/backup-postgres.sh && bash -n infra/vps/restore-postgres.sh` | syntax ok | PASS |
| Scripts executable in git | `git ls-files -s infra/vps/*.sh` | all 100755 | PASS |
| Lint rule fires on unsafe SQL | `npx eslint --no-eslintrc --rulesdir eslint-local-rules --rule '{"sql-no-unsafe-interpolation":"error"}' <scratch file>` | 1 error on the interpolated query, none on the `$1` query, exit 1 | PASS |
| API lint clean with the rule on | `npx eslint --rulesdir eslint-local-rules "src/**/*.ts" "test/**/*.ts"` (in `api/`) | exit 0 | PASS |
| No email service or `SMTP` use in API source | `grep -rnE "SMT[P]_\|EmailServic[e]" api/src` | no output | PASS |
| Backup and restore rehearsal | not re-run (needs Docker Compose and a seeded database) | relies on `20-02-SUMMARY.md` | SKIP |
| Failed-migration atomicity | not re-run (needs a scratch database) | relies on `20-03-SUMMARY.md` | SKIP |

### Probe Execution

No probes declared; `scripts/*/tests/probe-*.sh` does not exist. Step 7c: SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REQ-INF-hosting-adr | 11-01 | Ratify the running VPS stack | SATISFIED | Truth 1 |
| REQ-INF-backups | 11-02 | Scheduled backup plus a recorded restore | SATISFIED in the repo; production install open | Truth 2, human items 1 and 2 |
| REQ-INF-migrations | 11-03 | One path, no half-applied migration | SATISFIED | Truth 3 |
| REQ-INF-deadcode | 11-05 note | No email service, no `SMTP_*` | SATISFIED | Truth 4 |
| REQ-QA-sql-injection | 11-04 | Lint rule against SQL interpolation | SATISFIED | Truth 5 |
| REQ-QA-indexes | 11-04 | Index added, three dropped, EXPLAIN | SATISFIED | Truth 5 |

No orphaned requirements: the six IDs in ROADMAP Phase 11 are the six claimed by the plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `infra/vps/README.md` (Backups) | ~137 to 143 | Dumps land on the same disk as the database; no off-VPS copy | Warning | Protects against a bad migration, bad deploy or careless `DELETE`, not against loss of the VPS or its disk. Documented as a known gap and a follow-up, deliberately outside the criterion. Worth a backlog item before the association relies on this data |
| `api/migrations/README.md` | verification paragraph | Says migrations 001 to 016 and "17th row" | Info | Describes the state at rehearsal time; migrations now reach 019. No behavior impact |
| `.planning/phases/20-durable-backend/` | n/a | Restore proof is narrative in SUMMARY files, with no raw log artifact | Info | Credible and detailed, but not independently checkable from the repo |
| `.planning/PROJECT.md:52` | 52 | `- [ ] PostgreSQL out of PoC status: reliable backups and reliable migrations` is still unchecked | Info | Bookkeeping; consistent with the two open production checks |

No `TBD`, `FIXME`, `XXX`, `TODO` or `HACK` in the files this phase added (`infra/vps/*.sh`, `cortege-backup.*`, the lint rule, the migrations README, ADR-004).

### Human Verification Required

#### 1. Backup timer installed and firing on the VPS

**Test:** Follow `infra/vps/README.md` "Backups": copy the units, `daemon-reload`, `enable --now cortege-backup.timer`, run `sudo systemctl start cortege-backup.service` once, then `ls -lh /home/ubuntu/backups/postgres/` and `systemctl list-timers cortege-backup.timer`.
**Expected:** A dump file exists after the manual run, and the next run is scheduled for about 03:17 UTC. A second dump appears the next day on its own.
**Why human:** No record anywhere that this was done; the build session had no production access by design.

#### 2. Restore rehearsal against the production Postgres container

**Test:** `infra/vps/restore-postgres.sh /home/ubuntu/backups/postgres/<dump>`, read the printed counts, drop the throwaway database with the printed command.
**Expected:** `restore OK` and a `surveys` count equal to the live table.
**Why human:** Only the owner can reach the VPS. The recorded rehearsal used the dev Compose stack, with the same scripts.

### Gaps Summary

There are no code gaps. All five roadmap success criteria hold in the repository as of the current branch: ADR-004 is accepted and consistent with the infra files, the backup and restore scripts, units and README exist and are wired to the real compose service, the migration path is documented and has since carried three more migrations through the same runner, the dead email code is gone from the API source, and the SQL-interpolation rule is live (I watched it reject a bad query and pass the API tree) with migration 015 and the EXPLAIN evidence covering the index half.

The status is `human_needed` rather than `passed` for one reason: the criterion's first half, "runs unattended", is a property of the VPS, and nothing on record shows the timer was installed there or that a restore ran against the production container. Both are two short commands for the owner. The lack of an off-VPS backup copy is a documented warning, not a gap against the stated criteria.

---

_Verified: 2026-10-06_
_Verifier: Claude (gsd-verifier)_

## Update 2026-10-10

The two production checks (backup timer installed and one real dump; one restore into a throwaway database) are D-10 and D-11 of `docs/user-tests/device-checks.md`, with the exact commands. Only the owner has server access, so they were owner-only (run and closed the same day, see below). The server moves to the association's own account in Phase 38, which repeats both checks on the new server.

**Closed 2026-10-10:** the owner ran both checks on the production server. The backup timer is installed (next run Sun 2026-10-11 03:24 UTC, last run 2026-10-10 03:20) and a dump exists for every night since 2026-09-27. The dump of 2026-10-10 restored into a throwaway database with "restore OK", 8 tables and 1025 surveys against 1030 live (5 created since the dump); the throwaway database was dropped. The phase status is now `passed`. Both checks are repeated on the new server in Phase 38. The restore script's printed `dropdb` hint now includes the secrets file, which the owner had to add by hand.
