---
phase: 11
slug: durable-backend
status: complete
created: 2026-09-27
---

# Phase 11 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29 + ts-jest (API unit specs, `packages/ibp-domain` unit specs, mobile unit specs); Jest + Supertest E2E against PostgreSQL 16 |
| **Local DB** | `pg_ctlcluster 16 main start`, role `ibp`/`ibp`, databases `ibp` (dev, migrated) and `ibp_test` (E2E, dropped/re-migrated by `globalSetup`) |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`, plus `npm run test:e2e` for the migration- and index-adjacent surface |
| **Phase-specific verification** | Not a Jest suite: a real local backup+restore rehearsal (Plan 02), a real deliberately-broken-migration run (Plan 03), and real `EXPLAIN (ANALYZE, BUFFERS)` output against a seeded database (Plan 04). All recorded in each plan's SUMMARY.md and, for Plan 04, in `evidence/`. |

## Requirement → Evidence Map

| Requirement | Plan | Evidence |
|---|---|---|
| REQ-INF-hosting-adr | 01 | `docs/technical/adr-004-hosting-and-infrastructure-v1.md` (Accepted), corrected presentation doc, docs index link |
| REQ-INF-backups | 02 | `infra/vps/backup-postgres.sh` + `restore-postgres.sh` + systemd units; local rehearsal recorded in 20-02-SUMMARY.md (backup → restore → full data/schema fidelity confirmed by direct query) |
| REQ-INF-migrations | 03 | `api/migrations/README.md`; deliberately-broken-migration run recorded in 20-03-SUMMARY.md (non-zero exit, no partial DDL, no phantom `schema_migrations` row, clean retry after fix) |
| REQ-INF-deadcode | 05 (verification note) | Already satisfied since phase 01.9; verified and recorded, no new work |
| REQ-QA-sql-injection | 04 | `api/eslint-local-rules/sql-no-unsafe-interpolation.js`; `npm run lint` clean across all workspaces; positive-control fixture confirmed the rule fires |
| REQ-QA-indexes | 04 | Index/drop already done by migration 015 (phase 01.7); `evidence/explain-output.txt` proves every affected query is served without the three dropped indexes and that `idx_survey_events_actor_id` is used |

## Full Gate Results (this session, after all four plans)

```
$ npm run lint
✔ mobile, api (with the new sql-no-unsafe-interpolation rule), ibp-domain — all clean

$ npm run typecheck
✔ ibp-domain tsc --noEmit, mobile tsc --noEmit, api tsc -p tsconfig.build.json — all clean

$ npm run format:check
✔ All matched files use Prettier code style

$ npm run test:unit
✔ @cortege/ibp-domain: 8 suites, 210 tests passed
✔ cortege-api: 32 suites, 745 tests passed
✔ cortege-mobile: 93 suites, 1271 tests passed

$ npm run test:e2e
✔ 33 suites, 207 passed / 3 skipped (pre-existing MinIO-mode conditional skips,
  unrelated to this phase's changes), 0 failed
```

All four gates run against this session's local PostgreSQL 16 (native cluster, `ibp_test`
database, dropped and re-migrated by `globalSetup` as usual). Migration- and lint-adjacent E2E
coverage (`migration-016-ibp-method-version.e2e-spec.ts`, `migrate-lock.e2e-spec.ts`, the existing
`migration-015-public-indexes.e2e-spec.ts` from phase 01.7) is included in this full E2E run,
confirming the ESLint-directive edits in three test files changed no behavior.

## What this phase deliberately did not touch

- The production VPS, its database, or its running systemd units — per the task's explicit
  guardrail, every backup/restore/migration proof in this phase ran against a local scratch
  database or the local dev Docker Compose stack.
- `api/migrations/*.sql` — no new migration was needed (015 already covers the index work).
- `api/src/users/email.service.ts` / `SMTP_*` — already gone since phase 01.9.
