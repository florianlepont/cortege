---
phase: 05-factor-a-genus-list-data-contract-corrections
verified: 2026-10-06T21:50:00Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 5: Factor A Genus List & Data-Contract Corrections Verification Report

**Phase Goal:** Factor A records the observed native genera as a list rather than a bare count, through contracts written down before any UI exists; surveys already recorded keep their scores; and the two stale spec sections that contradict shipped behaviour are corrected.
**Verified:** 2026-10-06T21:50:00Z
**Status:** passed (no code gap, no owner-only check; one documentation warning that comes from a later phase)
**Re-verification:** No, initial verification

I checked each criterion against the code on the current branch (`0fb6d2f`), not against 05-01-SUMMARY.md. Phase 6 and OA-41 (migration 019) changed things around this phase; where a criterion is met in a changed form I say so.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `data-contract-v1.md` defines Factor A as a list of observed native genera from the closed CNPF regional list, with the count derived, replacing `native_genus_count`. No species entity; neither the recognition photo (D-13) nor the acceptance or correction of a suggestion (D-14) is stored. | ✓ VERIFIED | `docs/technical/data-contract-v1.md` lines 85-96: `factors.A.genera` is an array of codes from the 34-class list; the count "is derived from the list ... never sent or stored separately"; "No species entity" (D-01); "Not stored: the recognition photograph (D-13) and whether the ecologist accepted or corrected a suggestion (D-14)"; the legacy `native_genus_count` is kept for old surveys. The code agrees: no species field anywhere in `packages/ibp-domain/src/contract/`, and `FactorAGenusInput` carries only `genera`, `native_cover_percent`, `native_cover_below_50`. Phase 6 added nothing that stores a photo or an outcome (truth 3 of that phase). |
| 2 | `api-contract-v1.md` documents the genus-list shape under `/v1`, validated against the CNPF list, with standard error codes. No recognition endpoint exists. | ✓ VERIFIED | `api-contract-v1.md`: the error table row for `factor_a_genus_invalid` (blocking; non-array value or an entry not in the 34 classes; fixed message) at line 576; the Factor A section (lines 598-626) with the `genera` shape, cas gating, "No recognition endpoint ... inference runs on-device", "No species-level data", the legacy fallback and the `/v1/sync` round trip, plus an example payload. The code agrees: `grep -rin "genus\|genera" api/src` finds nothing, because `IbpRulesService` is a pass-through to `evaluateIbp` and the API has no recognition route. |
| 3 | A migration introduces the genus list and states what happens to surveys already recorded as a bare count (score unchanged); `npm run migrate:api` applies cleanly on an empty database and on a copy of existing data. | ✓ VERIFIED (migration re-read here; clean-apply evidence is the E2E spec and CI, see note) | `api/migrations/018_factor_a_genus_list.sql` is 018 (017 belongs to Phase 2, 019 to OA-41). It adds no column; it adds `chk_surveys_factor_a_genera_is_array` (`factors -> 'A' -> 'genera' IS NULL OR jsonb_typeof(...) = 'array'`) as `NOT VALID` then `VALIDATE`, guarded by an existence check so a second run is a no-op. The header states in plain words that a bare count cannot be decomposed into named genera and that existing `factors` values are not touched, backfilled or reinterpreted. `api/test/migration-018-factor-a-genus-list.e2e-spec.ts` seeds a legacy bare-count row, a direct numeric-A row and a no-factors row in a scratch schema before applying 018 and asserts they are byte-for-byte unchanged, that the constraint exists and is validated, that a genus-list, a bare count and no A are accepted, that a string, number or object `genera` is rejected with `23514`, and that a second run is a no-op. Note: I could not run this spec myself. The local Postgres role `ibp` has no `CREATEDB` right and no `*_test` database exists, and I did not want to run migrations against the dev database. Evidence instead: the spec is present and reads as above, and the CI job "E2E tests - API" is green on `main` for the merge of PR #235 (run 37520380121, after migration 019 was added), which runs the full suite including this spec. |
| 4 | Factor A scoring derives from the genus list in `packages/ibp-domain`, to which `IbpRulesService` and `mobile/src/app/ibp-scoring.ts` delegate; the CNPF list is one of the package's allowed sets and the genus-list shape is one of its sync contract types. The parity fixture and the 17 reference cases of `ibp-validation-matrix-v1.md` still pass. | ✓ VERIFIED | `packages/ibp-domain/src/genus.ts`: `CNPF_FACTOR_A_MAIN_GENERA` (29) plus `CNPF_FACTOR_A_SUPPLEMENTARY_GENERA` (5) = 34 codes; `allowedFactorAGenusCodes(cas)` returns the supplementary five only for cas 2 and 4; Ficus is not a code; Juniperus and Pistacia decisions are documented in the file. `rules/common.ts` `readFactorAGenusCount` deduplicates, filters to the allowed set, returns `invalid` for an unlisted code and falls back to `native_genus_count` when `genera` is absent; both rule versions call it. `contract/factor-a.ts` exports `FactorAGenusInput` and `FactorALegacyCountInput`, re-exported from `contract/index.ts` and `src/index.ts`. The two adapters contain no factor-A rule code (read: `api/src/surveys/ibp-rules.service.ts` is 10 lines of delegation; `mobile/src/app/ibp-scoring.ts` imports `computeRetainedScores` and friends). Ran here: `npm --workspace @cortege/ibp-domain run test` 9 suites, 230 tests pass; `npm --workspace api run test:unit -- ibp-parity` 72 pass; `npx jest src/app/ibp-parity.test.ts` in `mobile/` 84 pass. The 17 matrix v1 cases: every v1 case ID except those that v1 only lists in its "moves under v3.2" section is present in `IBP_PARITY_CASES` (the six IDs my script flagged, MAT-A-03/04/05, MAT-G-02/03, MAT-H-02, are the v3.2-new cases, present as `@v3.2` entries). The new genus cases MAT-A-09 to MAT-A-11 for v3.0 and v3.2 are in the fixture and in `ibp-validation-matrix-v2.md`. |
| 5 | The genus list survives a round-trip through `POST /surveys/sync`: an E2E test replays the same payload twice and nothing is duplicated. | ✓ VERIFIED | `api/test/surveys-factor-a-genus-list.e2e-spec.ts`: the test "round-trips the genus list through POST /v1/sync, replayed twice, without duplication" sends the same payload twice, expects `synced` and `score_points` 2 both times, then reads back `factors.A.genera` equal to the three codes, exactly 1 `survey_events` row and exactly 1 `surveys` row. The file also covers deduplication plus cas exclusion, the blocking `factor_a_genus_invalid` (fatal through `/v1/sync`, specific message through `POST /surveys`) and the legacy bare count. CI evidence as in truth 3. Phase 6 depends on this test for its own criterion 5. |
| 6 | `docs/specs/ibp-form-spec.md` section 4 states that a survey may reference one or many parcels (`parcel_ids[]`), and section 10.1 lists the shipped status enum `draft | submitted | synced | error | expired` with `submitted_at` and `deleted_at`, no `deleted` value, no `published_at`. | ✓ VERIFIED (as written; now stale on `expired`, see warning) | Section 4 (line 57): "A survey may reference one or many French cadastral parcels (`parcel_ids[]`) ...", `parcel_id` kept as a nullable compatibility field. Section 10.1 (lines 520-524) lists the five-value enum, `submitted_at?`, `deleted_at?` with "no `published_at` field exists" and "no `deleted` value". A later change made the `expired` part obsolete: OA-41 (2026-10-05) removed the deadline, and migration 019 now restricts `status` to `draft, submitted, synced, error` and drops `expires_at`; `data-contract-v1.md` line 50 was updated, `ibp-form-spec.md` section 10.1 was not. That is a Phase 12.1 follow-up, not a Phase 5 defect. |

**Score:** 6/6 truths verified (0 behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/ibp-domain/src/genus.ts` and `genus.test.ts` | Closed CNPF list, cas-gated allowed sets | ✓ VERIFIED | 34 codes; test passes |
| `packages/ibp-domain/src/contract/factor-a.ts` | Wire types | ✓ VERIFIED | Exported from the package entry |
| `packages/ibp-domain/src/rules/common.ts` (`readFactorAGenusCount`) | One choke point for the count | ✓ VERIFIED | Used by both rule versions |
| `packages/ibp-domain/src/parity/cases.ts` | Genus parity cases | ✓ VERIFIED | MAT-A-09 to 11 for both versions; runs through api and mobile adapters |
| `api/migrations/018_factor_a_genus_list.sql` | Shape guard, no column, idempotent | ✓ VERIFIED | Read in full |
| `api/test/migration-018-factor-a-genus-list.e2e-spec.ts` | Empty and existing-data proof | ✓ VERIFIED (not run locally) | Present; green in CI on main |
| `api/test/surveys-factor-a-genus-list.e2e-spec.ts` | Round-trip, replay, error surface | ✓ VERIFIED (not run locally) | Present; green in CI on main |
| `docs/technical/data-contract-v1.md`, `api-contract-v1.md`, `ibp-validation-matrix-v2.md`, `docs/specs/ibp-form-spec.md` | Contracts and corrections | ✓ VERIFIED | Truths 1, 2, 4, 6 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `IbpRulesService` | `evaluateIbp` (package) | direct call | WIRED | No factor-A code in the adapter |
| `mobile/src/app/ibp-scoring.ts` | `computeRetainedScores` (package) | direct call | WIRED | Same |
| `scoreFactorAV30` and `scoreFactorAV32` | `readFactorAGenusCount` | call | WIRED | Invalid genus becomes blocking `factor_a_genus_invalid` |
| `POST /v1/sync` | survey upsert, factors JSONB, `evaluateIbp` | existing sync path | WIRED | Round trip asserted in the E2E spec |
| `chk_surveys_factor_a_genera_is_array` | `surveys.factors` | migration 018 | WIRED | Rejects non-array `genera` with `23514` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `factor_results.A.score_points` in sync response | derived genus count | `readFactorAGenusCount` over the submitted `genera` | Yes (E2E asserts 2 for three distinct genera) | ✓ FLOWING |
| Reopened survey | `factors.A.genera` | stored JSONB read back by `GET`/sync | Yes (E2E reads the stored list) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Package rules, 100% coverage suite | `npm --workspace @cortege/ibp-domain run test` | 9 suites, 230 tests passed | ✓ PASS |
| API adapter parity | `npm --workspace api run test:unit -- ibp-parity` | 72 passed | ✓ PASS |
| Mobile adapter parity | `npx jest -c jest.unit.config.js src/app/ibp-parity.test.ts` in `mobile/` | 84 passed | ✓ PASS |
| E2E specs for migration 018 and the genus round trip | not run (no test database creatable by the local role) | n/a | ? SKIP, covered by CI run 37520380121 (E2E - API: success) |

### Probe Execution

No probes declared; `scripts/*/tests/probe-*.sh` does not exist. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REQ-ML-contracts | 05-01 | Genus-list data and API contracts, migration, package rules | ✓ SATISFIED | Truths 1 to 5 |
| REQ-DOC-form-spec | 05-01 | Form spec sections 4 and 10.1 corrected | ✓ SATISFIED | Truth 6 |

No orphaned requirement for Phase 5 in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `docs/specs/ibp-form-spec.md` | 520 | Status enum still lists `expired` | ⚠️ Warning | Contradicts migration 019 and `data-contract-v1.md`; caused by OA-41, outside this phase; update the spec when the 12.x docs pass is done |
| `mobile/assets/models/README.md` | provenance section | Says the manifest labels are "same 34 codes, same order" as `CNPF_FACTOR_A_GENUS_CODES` | ℹ️ Info | Same codes but not the same order (`Pinus` before `Picea` in the model, `Picea` before `Pinus` in `genus.ts`). Harmless because the classifier maps by manifest index and `validateManifest` checks the set, not the order |
| `packages/ibp-domain/src/genus.ts` | comments | Names ADR-003 CH-12 decisions in code comments | ℹ️ Info | Intended; the decisions are also in 05-CONTEXT.md |

A grep for `TBD|FIXME|XXX` over the phase's package, migration and test files finds nothing.

### Human Verification Required

None. This phase is contracts, migration and package work; every criterion is checkable by reading code and docs or by tests. The one thing I did not run myself (the two E2E specs) is covered by CI on `main`.

### Gaps Summary

No gaps. All six criteria hold on the current branch. The genus list lives once, in `@cortege/ibp-domain`, and both adapters stay pass-through. Migration 018 is additive and idempotent, and its legacy-data guarantee is tested against seeded legacy rows. The `/v1/sync` replay produces one survey and one event. Phase 6 (the genus UI and recognition) now writes into exactly this contract and its E2E proof is inherited from here.

The only open item is documentation drift introduced afterwards by OA-41: `ibp-form-spec.md` section 10.1 still lists the `expired` status that migration 019 removed.

---

_Verified: 2026-10-06T21:50:00Z_
_Verifier: Claude (gsd-verifier)_
