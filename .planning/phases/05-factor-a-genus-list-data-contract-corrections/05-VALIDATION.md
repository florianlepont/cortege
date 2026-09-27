---
phase: 05
slug: factor-a-genus-list-data-contract-corrections
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-27
---

# Phase 5 — Validation Strategy

> Per-phase validation contract. Plan 05-01 produces all the evidence below; this phase has one
> plan, run directly (no separate orchestrator/executor split), matching the discipline of small
> phases like Phase 3's batches.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + ts-jest in `packages/ibp-domain` (new genus cases), API unit and E2E (`api/test/*.e2e-spec.ts`, Supertest, PostgreSQL 16, `*_test` databases only), mobile (parity adapter test only — no UI touched this phase) |
| **Config files** | Unchanged from phase 01.8: `packages/ibp-domain/jest.config.js`, `api/jest.unit.config.js`, `api/jest.config.js`, `mobile/jest.unit.config.js` |
| **Quick run command** | `npm --workspace @cortege/ibp-domain run test -- genus evaluate parity`; `npm --workspace api run test:e2e -- "migration-017|surveys-factor-a-genus-list"` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`, then `npm run test:e2e` (local mode; PostgreSQL 16, role `ibp`/`ibp`) |
| **Migration proof** | `POSTGRES_DB=<empty> node api/scripts/migrate.js` (empty database); hand-seeded scratch database with legacy bare-count/direct-score/no-factors rows, migrated with the same runner (existing-data proof) |
| **Estimated runtime** | Package < 5 s; API unit ~90 s; full E2E (local mode) ~30 s; mobile unit ~45 s |

---

## Sampling Rate

- **Model identifiers:** none in code, this file or PR body.
- **After every task:** the task's own `<automated>` command (05-01-PLAN.md).
- **Before closing the phase:** full local gate (lint, typecheck, unit with coverage, format,
  E2E local mode) plus the two hand-verified migration checks (empty DB, existing-data DB).

---

## Criterion → Command Map

| Criterion | Behavior | Test Type | Automated Command | Status |
|---|---|---|---|---|
| 1. data-contract-v1.md redefines Factor A | Genus list documented, no species entity, no photo/suggestion storage | doc read + grep | `grep -n "genera" docs/technical/data-contract-v1.md` | ✅ green |
| 2. api-contract-v1.md documents the shape | Genus-list payload, validation, standard error codes, no recognition endpoint | doc read + grep | `grep -n "factor_a_genus_invalid" docs/technical/api-contract-v1.md` | ✅ green |
| 3. Migration applies cleanly, empty + existing data | 017 adds no column, one CHECK constraint, additive | E2E + manual psql | `migration-017-factor-a-genus-list.e2e-spec.ts`; hand-seeded scratch DB (see Summary) | ✅ green |
| 4. Scoring derives from the package; adapters delegate; parity + matrix v1 pass | New genus cases in `IBP_PARITY_CASES`, run through both adapters unchanged | unit | `npm --workspace @cortege/ibp-domain run test:coverage`; `npm --workspace api run test:unit -- ibp-parity`; `npm --workspace mobile run test:unit -- ibp-parity` | ✅ green, 100% package coverage |
| 5. Sync round-trip, no duplication | Same payload replayed twice via `/v1/sync`; 1 survey row, 1 event row | E2E | `surveys-factor-a-genus-list.e2e-spec.ts` | ✅ green |
| 6. ibp-form-spec.md §4/§10.1 corrected | `parcel_ids[]`; shipped status enum, `submitted_at`/`deleted_at`, no `deleted`/`published_at` | doc read + grep | `grep -n "parcel_ids\[\]" docs/specs/ibp-form-spec.md`; `grep -n '"deleted"' docs/specs/ibp-form-spec.md` → 0 as a status value | ✅ green |

---

## Per-Task Verification Map

| Task | Requirement | Test Type | Automated Command | Status |
|---|---|---|---|---|
| 1: genus.ts, contract type | REQ-ML-contracts | unit | `npm --workspace @cortege/ibp-domain run test -- genus` | ✅ green |
| 2: derive count, both versions | REQ-ML-contracts | unit | `npm --workspace @cortege/ibp-domain run test:coverage` | ✅ green |
| 3: migration + E2E round-trip | REQ-ML-contracts | E2E | `npm --workspace api run test:e2e` (full suite) | ✅ green (35 suites, 221 passed, 3 skipped MinIO-only) |
| 4: contracts + form-spec + roadmap | REQ-ML-contracts, REQ-DOC-form-spec | full gate | `npm run lint && npm run typecheck && npm run test:unit && npm run format:check` | ✅ green |

---

## Wave 0 Requirements

- [x] `packages/ibp-domain/src/genus.ts` + `genus.test.ts` — criterion 4 (new)
- [x] `packages/ibp-domain/src/contract/factor-a.ts` — criteria 1, 4 (new)
- [x] `api/migrations/017_factor_a_genus_list.sql` — criterion 3 (new)
- [x] `api/test/migration-017-factor-a-genus-list.e2e-spec.ts` — criterion 3 (new)
- [x] `api/test/surveys-factor-a-genus-list.e2e-spec.ts` — criterion 5 (new)

---

## Manual-Only Verifications

None. This phase is contracts, migration and package work with no UI and no mobile-device
behaviour to check; every criterion is proven by an automated command or a doc grep.

---

## Local gate

Run on 2026-09-27 in this session, on PostgreSQL 16 (`pg_ctlcluster 16 main`), role `ibp`/`ibp`,
database `ibp_p5_test` (E2E) plus two throwaway scratch databases for the manual migration proof
(dropped after use).

| # | Command | Result |
|---|---------|--------|
| 1 | `npm run lint` | exit 0, 0 errors/warnings (mobile, api, `@cortege/ibp-domain`) |
| 2 | `npm run typecheck` | exit 0 (package, mobile, api build) |
| 3 | `npm run format:check` | clean after one `npm run format` pass (3 files reflowed, no logic change) |
| 4 | `npm --workspace @cortege/ibp-domain run test:coverage` | 9 suites, 230/230 passed; 100/100/100/100 |
| 5 | `npm --workspace api run test:unit -- ibp-parity` | 72/72 passed |
| 6 | `npm --workspace mobile run test:unit -- ibp-parity` | 84/84 passed |
| 7 | `npm run test:unit` (root, all workspaces) | package 230, api and mobile suites all green (1346 mobile tests alone) |
| 8 | `node api/scripts/migrate.js` against a fresh empty database | 001-017 applied, "Migrations are up to date." |
| 9 | Manual psql proof against a hand-seeded "existing data" database (legacy bare-count row, direct-numeric-A row, no-factors row) | all three rows unchanged after 017; valid genus-list insert succeeds; malformed `genera` (string/number/object) rejected with `23514` |
| 10 | `npm run test:e2e` (local mode) | 35 suites, 221 passed, 3 skipped (MinIO-only cases) |

Nothing was left red. The only fix made along the way (migration-016's "last migration" assertion)
is recorded in the Summary and was verified green immediately after.
