---
phase: 09-shared-ibp-domain-package-and-test-completeness
plan: 04
subsystem: ibp-domain
tags: [ibp, rules, v3.0, v3.2, parity, bands, method-version]
requires: [01.8-01]
provides:
  - "evaluateIbp (draft/submit, dispatch by method version), computeRetainedScores, computeTotals"
  - "v3.0 rules (BUG-1, BUG-2 fixed) and v3.2 rules (CH-1..CH-5) in packages/ibp-domain/src/rules/"
  - "region/stage (v3.0) and cas (v3.2) context models, casFromRegionStage (ADR-003 mapping)"
  - "evaluateSubmitReadiness per version, migrateDraftToV32 (CH-7)"
  - "IBP_MAX, standBand, contextBand, totalBand (/50 app convention), bandTone"
  - "IBP_PARITY_CASES, IBP_READINESS_CASES, IBP_MIGRATION_CASES (matrix v2, exported from the entry)"
affects: [01.8-06, 01.8-07, 01.8-08, 01.8-09, 01.8-10, 01.8-11, 01.8-12, 01.8-16, 01.9-32]
tech-stack:
  added: []
  patterns:
    - "One scorer per version (FactorScorer), shared readers/scales; evaluateIbp owns direct scores, allowed sets, issues"
    - "Factor outcome scored / incomplete / invalid; incomplete = factor_incomplete (draft, W) or factor_required (submit, B)"
    - "Parity cases: matrixId = matrix v2 id, id = matrixId + optional #variant"
key-files:
  created:
    - packages/ibp-domain/src/input.ts
    - packages/ibp-domain/src/context/region-stage.ts
    - packages/ibp-domain/src/context/cas.ts
    - packages/ibp-domain/src/context/context.test.ts
    - packages/ibp-domain/src/rules/scales.ts
    - packages/ibp-domain/src/rules/common.ts
    - packages/ibp-domain/src/rules/v3-0.ts
    - packages/ibp-domain/src/rules/v3-2.ts
    - packages/ibp-domain/src/rules/rules.test.ts
    - packages/ibp-domain/src/evaluate.ts
    - packages/ibp-domain/src/evaluate.test.ts
    - packages/ibp-domain/src/readiness.ts
    - packages/ibp-domain/src/migrate.ts
    - packages/ibp-domain/src/readiness-migrate.test.ts
    - packages/ibp-domain/src/bands.ts
    - packages/ibp-domain/src/bands.test.ts
    - packages/ibp-domain/src/parity/cases.ts
    - packages/ibp-domain/src/parity.test.ts
  modified:
    - packages/ibp-domain/src/index.ts
    - packages/ibp-domain/jest.config.js
    - docs/technical/ibp-validation-matrix-v2.md
decisions:
  - "Consistency warnings (consistency_a_b, consistency_e_f) fire only when both factors of the pair are scored; before, an absent factor counted as 0 (and a v3.2 A without cas would have warned on every draft)"
  - "An A object with a native cover but no genus count is incomplete (not invalid) in both versions, so migrateDraftToV32 can carry B's cover to a not-yet-entered A without making the draft blocking"
  - "A.native_cover_percent outside 0-100 or unreadable is factor_invalid_raw (both versions); B's legacy cover is read leniently as before"
  - "An invalid ibp_cas (not 1-4) counts as missing: A/G incomplete, ibp_cas_required at submit"
  - "Unsupported method version returns early: only ibp_method_version_unsupported, no scores, retained all null"
  - "Package coverage thresholds raised to the measured floor: 100/100/100/100"
metrics:
  duration: "~55 min"
  completed: 2026-09-26
  tasks: 3
  files: 21
---

# Phase 01.8 Plan 04: IBP rules once, both versions, one parity fixture Summary

The package now scores and validates IBP surveys under v3.0 (pre-01.8 rules with the cover cap moved to A and G/H limited to 0/2/5) and v3.2 (cas scales, A cover required, C/D and E sum rules). `evaluateIbp` picks the rule set from `ibp_method_version`. The package also holds the submit-readiness check, the v3.0 → v3.2 draft migration, the CNPF bands with a documented /50 band, and a 64-entry parity fixture that matches matrix v2. The fixture is green at 100 % package coverage.

## Tasks

| Task | Name | Commits | Files |
|---|---|---|---|
| 1 | Context models, scales, input parsing, bands | 913dc16 (RED), 6d6a0aa (GREEN) | input.ts, context/region-stage.ts, context/cas.ts, rules/scales.ts, bands.ts, tests, index.ts |
| 2 | v3.0 and v3.2 rule sets, evaluateIbp, readiness, migration | a1f4f5a (RED), 18fb572 (GREEN) | rules/common.ts, rules/v3-0.ts, rules/v3-2.ts, evaluate.ts, readiness.ts, migrate.ts, tests, index.ts |
| 3 | Parity fixture and coverage gate | b855e0c (RED), d0ea0f4 (GREEN) | parity/cases.ts, parity.test.ts, index.ts, jest.config.js, ibp-validation-matrix-v2.md |

## Public API (binding for 01.8-06/07/08/10/11)

All names match the plan's interfaces block, and all are exported from `src/index.ts`, with `export type` for types.
- **Context.** `RegionVersion`, `REGION_VERSIONS`, `VegetationStage`, `VEGETATION_STAGES_BY_REGION`, `DEFAULT_VEGETATION_STAGE_BY_REGION`, `normalizeRegion` (returns `RegionVersion | null`), `normalizeVegetationStageForRegion`, `usesSubalpineScale`. `IbpCas`, `IBP_CAS_VALUES`, `isIbpCas`, `usesCas3Scale`, `casFromRegionStage`.
- **Scales.** `ALLOWED_SCORES_BY_FACTOR`, `allowedScoresFor`, `isAllowedFactorScore`, `scoreGenusCount`, `scoreStrataCount`, `scoreTreeDensity`, `scoreFloweringPercent`, `scoreTypeCount`.
- **Evaluation.** `evaluateIbp(input, mode, now?)`, `computeRetainedScores(factors, ctx)`, `computeTotals(retained)`. Types: `IbpEvaluation`, `IbpEvaluationInput`, `IbpEvaluationMode`, `IbpSurveyContext`, `IbpValidationIssue` (its `factor` field is typed `FactorKey`), `FactorRetainedScore`.
- **Readiness and migration.** `evaluateSubmitReadiness(draft, now?)` with `SubmitReadiness` and `SubmitReadinessField`; `migrateDraftToV32`.
- **Bands.** `IBP_MAX`, `standBand`, `contextBand`, `totalBand`, `bandTone`, `StandBand`, `ContextBand`, `TotalBand`, `ScoreTone`.
- **Fixture.** `IBP_PARITY_CASES`, `IBP_READINESS_CASES`, `IBP_MIGRATION_CASES`, `IbpParityCase`, `IbpReadinessCase`, `IbpMigrationCase`.

`input.ts`, `rules/common.ts`, `rules/v3-0.ts` and `rules/v3-2.ts` stay internal.

Issue codes. Today's codes are kept, with the same messages. The allowed-set message is built from the set, so G and H now say "[0,2,5]". Three codes are new, for 01.9-32's French texts:

| Code | Blocking | When | Message |
|---|---|---|---|
| `ibp_method_version_unsupported` | yes, in both modes | the version is unknown | "ibp_method_version is not a supported IBP method version" |
| `ibp_cas_required` | yes | v3.2 submit without a valid cas | "ibp_cas is required and must be 1, 2, 3 or 4" |
| `factor_incomplete` | no | draft only | "factor X is incomplete: {ibp_cas \| native_cover \| native_genus_count} is required" |

## Parity fixture: case counts and ids

`IBP_PARITY_CASES` has **64 entries covering 52 matrix ids**. The gate compares `matrixId` with the ids in matrix v2. Where one matrix case runs several inputs, each input is a separate entry whose `id` adds a `#variant` suffix.

| Group | Matrix ids | Entries |
|---|---|---|
| v3.0 | 20 | 20 |
| Both versions | 2 | 6 |
| v3.2 | 28 | 34 |
| Dispatch | 2 | 4 |
| Readiness (`IBP_READINESS_CASES`) | R-1, R-2, R-3 | 4 (R-2 twice: untagged and v3.0 tag) |
| Migration (`IBP_MIGRATION_CASES`) | M-1 to M-4 | 4 |

Every matrix id:
- **v3.0:** MAT-A-01@v3.0, MAT-A-02@v3.0, MAT-A-06@v3.0, MAT-B-01@v3.0, MAT-C-01@v3.0, MAT-C-02@v3.0, MAT-D-01@v3.0, MAT-E-01@v3.0, MAT-E-02@v3.0, MAT-F-01@v3.0, MAT-F-02@v3.0, MAT-G-01@v3.0, MAT-H-01@v3.0, MAT-I-01@v3.0, MAT-I-02@v3.0, MAT-J-01@v3.0, MAT-CONS-01@v3.0, MAT-CONS-02@v3.0, MAT-SUBMIT-01@v3.0, MAT-SUBMIT-02@v3.0.
- **Both versions:** MAT-G-03@both (#v3.0, #v3.2); MAT-H-02@both (#v3.0-direct, #v3.0-class-score, #v3.2-direct, #v3.2-class-score).
- **v3.2:**
  - A: MAT-A-01@v3.2, MAT-A-02@v3.2 (#cas-3, #cas-1), MAT-A-03@v3.2, MAT-A-04@v3.2, MAT-A-05@v3.2 (#cas-2-cas3-scale, #cas-2), MAT-A-07@v3.2, MAT-A-08@v3.2.
  - B to F: MAT-B-01@v3.2, MAT-C-01@v3.2, MAT-C-02@v3.2, MAT-C-03@v3.2, MAT-D-01@v3.2, MAT-E-01@v3.2, MAT-E-02@v3.2, MAT-F-01@v3.2, MAT-F-02@v3.2.
  - G to J: MAT-G-01@v3.2, MAT-G-02@v3.2 (#cas-3-0.5, #cas-3-6, #cas-1-6), MAT-H-01@v3.2, MAT-I-01@v3.2, MAT-I-02@v3.2, MAT-J-01@v3.2.
  - Consistency, cas and submit: MAT-CONS-01@v3.2, MAT-CONS-02@v3.2, MAT-CAS-01@v3.2 (#draft, #submit), MAT-CAS-02@v3.2 (#draft, #submit), MAT-SUBMIT-01@v3.2, MAT-SUBMIT-02@v3.2.
- **Dispatch:** MAT-VER-01 (#untagged, #v3.0, #v3.2); MAT-VER-02.

The parity test also checks:
- ids are unique, and each id is `matrixId` or `matrixId#…`;
- every factor A to J is scored from an object input in at least one v3.0 case and one v3.2 case;
- MAT-VER-01 runs untagged, with the v3.0 tag and with the v3.2 tag;
- every `@both` case runs under both versions;
- every `@v3.0` and `@v3.2` case resolves to its version.

## Verification

- `npm --workspace @cortege/ibp-domain run test:coverage`: 8 suites and 210 tests pass. Coverage is 100 % for statements, branches, functions and lines, on every file including `parity/cases.ts`.
- `npm run typecheck`: exit 0 for the package, mobile and the API build. Nothing outside the package imports the new modules yet.
- `npm run lint`: exit 0. `npm run format:check`: clean.
- `npm run test:unit`: 210 package tests, 647 API tests and 1050 mobile tests pass.
- `tsc -p tsconfig.build.json`, emitted to the scratchpad: `require()` of the built entry lists 64 parity cases, and `evaluateIbp` under v3.2 scores MAT-VER-01's C as 1.
- Acceptance greps: the three new codes appear 4 times in `evaluate.ts`; `totalBand` appears in `bands.ts`, whose doc comment says the band is an app convention for the owner to review; `MAT-VER-01` appears 6 times in `cases.ts`.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1, bug] Consistency warnings fired on factors that were absent or incomplete.**
   - **Found during:** Task 2.
   - **Issue:** the ported rule used `(A ?? 0) === 0`. Under v3.2, every draft without a cas and with B ≥ 2 would therefore warn "factor_a is very low". It would also have given MAT-B-01, MAT-F-01 and MAT-F-02 warnings that matrix v2 does not list.
   - **Fix:** the warnings now fire only when both factors of the pair are scored. They stay non-blocking, so replays are unaffected. Nothing in the api or mobile tests checks these codes.
   - **Files:** `evaluate.ts`, `evaluate.test.ts`.
   - **Commit:** 18fb572.
2. **[Rule 2, missing functionality] An A object with only a cover.** Such an A is incomplete, not invalid. Otherwise, switching a draft whose A is still empty would create a blocking `factor_invalid_raw`, and the server would refuse the draft.
   - **File:** `rules/v3-0.ts`, `rules/v3-2.ts`.
   - **Commit:** 18fb572.
3. **Extra internal module `rules/common.ts`.** It holds the shared types (`IbpSurveyContext` and `IbpValidationIssue`, both re-exported from `evaluate.ts`), the raw-input readers, and the B, F, H and I/J scorers used by both versions. This avoids a type cycle between the rules and `evaluate.ts`.
4. **Matrix v2 aligned with the fixture.** Plan 05 left these points open; the fixture is authoritative and the document now matches it:
   - The MAT-CAS-01 and MAT-CAS-02 drafts emit W `factor_incomplete`, as the plan's interfaces require; the matrix said "none".
   - MAT-C-03 now has concrete inputs: 9 BMm on 10 ha.
   - The `#variant` id rule is documented.
   - "Issues" is compared as a set, and "none" means no issue at all.
   - The Notes describe the consistency-warning rule and how A's cover is parsed.
   - The case ids and expected scores are unchanged.
   - Commit: d0ea0f4.
5. **Coverage thresholds.** They were raised from 95/90/95/95 to the measured 100/100/100/100, following the plan ("raise to the measured floor if higher").

**TDD gate compliance:** each task has a `test(...)` RED commit followed by a `feat(...)` GREEN commit. The Task 2 GREEN commit also corrects one wrong hand-computed test value: F with groups [3,1,-2] totals 3, which scores 2, not 1.

## Known Stubs

None.

## Threat Flags

None. The threat register is covered:
- **T-01.8-11:** a test checks that an unknown version is blocking.
- **T-01.8-12:** tests check the allowed sets, including G = 1, H = 1 and A = 3.
- **T-01.8-13:** the input is parsed only through `isRecord` and `asNumber`. Tests feed arrays, strings, NaN, booleans, null and numbers as factors or factor values, and nothing throws.

## Self-Check: PASSED

- FOUND: every created file listed above (`packages/ibp-domain/src/**`)
- FOUND commits: 913dc16, 6d6a0aa, a1f4f5a, 18fb572, b855e0c, d0ea0f4
