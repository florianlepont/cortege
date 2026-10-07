---
phase: 14-factor-a-genus-list-data-contract-corrections
plan: 01
subsystem: ibp-domain, api, docs
tags: [ibp, factor-a, genus-list, migration, contracts, adr-002, adr-003]
requires: []
provides:
  - "Factor A genus list (`factors.A.genera`) in packages/ibp-domain, scored under both method versions"
  - "genus.ts: the closed CNPF regional list (34 classes), cas-gated allowed sets"
  - "FactorAGenusInput / FactorALegacyCountInput sync contract types"
  - "Migration 018 (chk_surveys_factor_a_genera_is_array)"
  - "E2E proof of the /v1/sync round-trip and the migration on existing data"
  - "data-contract-v1.md / api-contract-v1.md / ibp-validation-matrix-v2.md updated; ibp-form-spec.md §4/§10.1 corrected"
affects: [06-genus-recognition-for-factor-a]
tech-stack:
  added: []
  patterns:
    - "readFactorAGenusCount: one choke point for Factor A's count, genus list or legacy bare number, shared by both rule versions"
    - "FactorOutcome's invalid variant carries an optional code/message for a scorer-specific blocking issue"
key-files:
  created:
    - packages/ibp-domain/src/genus.ts
    - packages/ibp-domain/src/genus.test.ts
    - packages/ibp-domain/src/contract/factor-a.ts
    - api/migrations/018_factor_a_genus_list.sql
    - api/test/migration-018-factor-a-genus-list.e2e-spec.ts
    - api/test/surveys-factor-a-genus-list.e2e-spec.ts
  modified:
    - packages/ibp-domain/src/contract/index.ts
    - packages/ibp-domain/src/index.ts
    - packages/ibp-domain/src/rules/common.ts
    - packages/ibp-domain/src/rules/v3-0.ts
    - packages/ibp-domain/src/rules/v3-2.ts
    - packages/ibp-domain/src/evaluate.ts
    - packages/ibp-domain/src/evaluate.test.ts
    - packages/ibp-domain/src/parity/cases.ts
    - api/test/migration-016-ibp-method-version.e2e-spec.ts
    - mobile/src/app/types.ts
    - docs/technical/data-contract-v1.md
    - docs/technical/api-contract-v1.md
    - docs/technical/ibp-validation-matrix-v2.md
    - docs/specs/ibp-form-spec.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
decisions:
  - "Ficus excluded entirely (not a valid code); Juniperus in the main list unconditionally, no coastal gate (D-01: genus-level only, cannot distinguish which of the 3 species); Pistacia counted as a supplementary genus per p.3 (\"the CNPF answer\" resolving the Table 2 ambiguity) — all recorded in 14-CONTEXT.md decisions"
  - "IbpRulesService and mobile/src/app/ibp-scoring.ts needed zero changes: both were already thin pass-through adapters (phase 01.8), so the new capability flows through them with no re-implementation"
  - "Migration 018 adds no column: the genus list lives in the existing factors JSONB, verified with psql that jsonb -> 'genera' on a scalar or a bare-count object returns NULL, never an error, before writing the CHECK constraint"
  - "The sync-path error surface (POST /v1/sync always maps a blocking IBP issue to a generic http_422, never a specific code) is pre-existing, unchanged architecture — the E2E spec tests the specific factor_a_genus_invalid code and message through the direct POST /surveys endpoint instead, matching the existing convention in surveys-submit.e2e-spec.ts"
metrics:
  duration: "~2.5h"
  completed: 2026-09-27
  tasks: 4
  files: 22
---

# Phase 5 Plan 01: Factor A genus list, contracts and migration Summary

Factor A now records the observed native genera as a list (`factors.A.genera`), validated against
the closed 34-class CNPF regional list, with the score-relevant count derived from it. Surveys
already recorded as a bare `native_genus_count` keep scoring exactly as before — nothing is
recomputed or decomposed. The rule lives once, in `packages/ibp-domain`; the API and mobile
adapters needed no change at all, since both were already pass-through wrappers from phase 01.8.
Migration 018 adds one structural CHECK constraint and no column. `docs/technical/data-contract-v1.md`,
`api-contract-v1.md` and `ibp-validation-matrix-v2.md` document the new shape; `ibp-form-spec.md`
§4 and §10.1 (and the other stale `deleted`-status mentions found alongside them) are corrected.

## Tasks

| Task | Name | Files |
|---|---|---|
| 1 | Genus list, allowed sets, contract type | genus.ts, genus.test.ts, contract/factor-a.ts, barrels |
| 2 | Derive Factor A's count, both rule versions | rules/common.ts, v3-0.ts, v3-2.ts, evaluate.ts, parity/cases.ts |
| 3 | Migration 018, E2E round-trip proof | 018_factor_a_genus_list.sql, 2 new E2E specs, migration-016 fix |
| 4 | Contracts, form-spec corrections, roadmap | data-contract-v1.md, api-contract-v1.md, matrix v2, ibp-form-spec.md, types.ts, ROADMAP/REQUIREMENTS |

## Genus list: codes and CH-12 decisions

`packages/ibp-domain/src/genus.ts` matches ADR-002's own 34-class label set exactly, so Phase 6's
classifier output and this contract share one vocabulary:

- **Main list (29 taxa, 28 genera, count under every cas):** Abies, Acer, Alnus, Arbutus, Betula,
  Carpinus, Castanea, Celtis, Cupressus, Fagus, Fraxinus, Juglans, Juniperus, Larix, Malus, Ostrya,
  Picea, Pinus, Populus, Prunus, Pyrus, `Quercus_deciduae`, `Quercus_sempervirens`, Salix, Sorbus,
  Tamarix, Taxus, Tilia, Ulmus.
- **Supplementary genera (5, cas 2 and cas 4 only):** Ceratonia, Cercis, Olea, Phillyrea, Pistacia.
- **Ficus** is not a valid code (A-6: in Table 1 but not the p. 3 list; conservative reading).
- **Juniperus** has no coastal gate: the genus-level-only model (D-01) cannot distinguish
  *J. macrocarpa* / *J. phoenicea* (coastal-restricted) from *J. thurifera* (unrestricted), so
  gating the genus would sometimes exclude a genuinely countable inland stand.
- **Pistacia** counts as supplementary, following p. 3's explicit listing over Table 2's shrub
  note — the CNPF-answer resolution the ROADMAP refers to.

## Package: one choke point, two rule versions

`readFactorAGenusCount(raw, cas)` (`rules/common.ts`) replaces `readGenusCount`: given
`factors.A.genera`, it deduplicates, filters to `allowedFactorAGenusCodes(cas)` (silently excluding
an out-of-cas supplementary genus, not an error), and returns the derived count; given no `genera`
key it falls back to the legacy `native_genus_count`/`autochthonous_genus_count`/`count`. An entry
not on the CNPF list at all returns `"invalid"`, which both `scoreFactorAV30` and `scoreFactorAV32`
turn into the new `INVALID_GENUS` outcome — a blocking `factor_a_genus_invalid`, added to
`FactorOutcome`'s `invalid` variant via optional `code`/`message` fields (evaluate.ts's issue-push
now reads `outcome.code ?? "factor_invalid_raw"`).

v3.0 can use the genus-list shape too, not only v3.2 — the derivation is version-independent, only
the allowed cas-gated set differs (v3.0 has no cas, so it never counts the supplementary genera).

Ten new parity cases (`MAT-A-09@v3.0/v3.2`, `MAT-A-10@v3.0/v3.2`, `MAT-A-11@v3.0/v3.2`, plus
variants) exercise list decomposition, deduplication, the cas gate and the invalid-genus block,
mirrored into `ibp-validation-matrix-v2.md`. The API and mobile `ibp-parity` suites picked up every
new case automatically — no code change needed in `IbpRulesService` or `ibp-scoring.ts`, confirming
both are the pass-through adapters phase 01.8 built them to be.

## Migration 018

No column: the genus list lives inside the existing `factors` JSONB, exactly like the bare count
did before it. Verified directly with `psql` before trusting any test: `'5'::jsonb -> 'genera'`
and `'{"native_genus_count":5}'::jsonb -> 'genera'` both return `NULL`, never an error, so the new
CHECK constraint (`chk_surveys_factor_a_genera_is_array`: `genera` must be a JSON array when
present) never rejects an existing bare-count or direct-numeric-A row. Confirmed by hand against a
seeded "existing data" scratch database (a legacy bare-count row, a direct numeric-A row, a
no-factors row — all three insert and validate unchanged; a string/number/object `genera` is
rejected with `23514`) before writing the E2E spec that automates the same proof.

`migration-016-ibp-method-version.e2e-spec.ts`'s "recorded it after 015" assertion assumed 016 was
the last migration file; fixed to compare indices instead of the last array element, since it now
runs against a scratch schema where the real runner also applies 018.

## Sync round-trip (criterion 5)

`api/test/surveys-factor-a-genus-list.e2e-spec.ts`: `POST /v1/sync` with the same genus-list
payload (same `id`, same `sync_version`) sent twice returns `synced` both times, with the derived
`factor_results.A.score_points` unchanged on the replay; the database shows exactly one `surveys`
row and one `survey_events` row afterward. Also covers deduplication + cas exclusion, the blocking
`factor_a_genus_invalid` on both `/v1/sync` (generic `fatal_error`/`http_422`, the existing
architecture) and `POST /surveys` (specific message in the `422` body's `errors` array, matching
`surveys-submit.e2e-spec.ts`'s existing convention), and that the legacy `native_genus_count` shape
still scores unchanged through the same endpoint.

## Verification

- `npm --workspace @cortege/ibp-domain run test:coverage`: 9 suites, 230 tests, 100/100/100/100.
- `npm --workspace api run test:unit -- ibp-parity`: 72 tests green, new genus cases included with
  no adapter change.
- `npm --workspace mobile run test:unit -- ibp-parity`: 84 tests green, same.
- `npm run test:e2e` (local mode): 35 suites, 221 passed, 3 skipped (MinIO-only cases) — full
  suite, including both new migration-018 and factor-a-genus-list specs and the fixed migration-016
  spec.
- Migration verified twice: via `npm run migrate:api` on a fresh empty database, and by hand
  against a seeded "existing data" database (see above).
- `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`: all green
  (root, all three workspaces).
- The 17 `ibp-validation-matrix-v1.md` reference cases: unchanged expected values throughout, still
  represented and passing inside `IBP_PARITY_CASES`'s v3.0 section.

## Deviations from Plan

None outside the migration-016 assertion fix, already covered by the plan's own read-first note.
