---
phase: 30-route-choice-assistant-inserted-v1
plan: 06
subsystem: ibp-domain
tags: [uncapped-entry, factor-details, parity, ibp-domain, matrix-v2]
requires: [30-02, 30-03]
provides:
  - "factor-details.ts: B_STRATUM_CODES, DMH_GROUP_CODES, UNCAPPED_DETAIL_KEYS, STRATUM_MIN_COVER_PERCENT (20), DMH_GROUP_DENSITY_CAP_PER_HA (2), strataCountFromCover, dmhDensityPerHa, readStrataCover, readDmhCounts, with types BStratumCode, DmhGroupCode, StrataCover, DmhCounts, DmhDensity"
  - "Parity cases MAT-B-UNC-01..03 and MAT-F-UNC-01..02 in both methods (16 case entries) run by the package, the API adapter and the mobile adapter"
  - "Matrix v2 section 'Phase 30: deplafonne detail keys' with the five case rows"
affects: [30-12, 30-19]
key-files:
  created:
    - packages/ibp-domain/src/factor-details.ts
    - packages/ibp-domain/src/factor-details.test.ts
  modified:
    - packages/ibp-domain/src/index.ts
    - packages/ibp-domain/src/parity/cases.ts
    - packages/ibp-domain/src/parity.test.ts
    - docs/technical/ibp-validation-matrix-v2.md
decisions:
  - "No scorer changed (packages/ibp-domain/src/rules untouched): the detail keys are never read, the scored keys strata_count and trees_per_ha stay the only score inputs (U-O10)"
  - "The F detail key is dmh_counts (object keyed dmh_01 to dmh_15), never the dmh_group_counts array the F scorer reads"
  - "dmhDensityPerHa and strataCountFromCover do not round; a surface that is not a finite number above zero gives null"
metrics:
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 06: Detail inputs of the releve deplafonne Summary

The shared package now owns the codes, the readers and the two derivation helpers of the detail inputs of a releve deplafonne (spec section 7), and parity cases prove, in the package, the API adapter and the mobile adapter, that these keys never change a score or a validation result.

## What was built

- `packages/ibp-domain/src/factor-details.ts`
  - Code lists `B_STRATUM_CODES` (the five strata the current B input stores) and `DMH_GROUP_CODES` (`dmh_01` to `dmh_15`, equal to the options of `mobile/src/i18n/fr/factor-input.ts`), `UNCAPPED_DETAIL_KEYS` = `{ B: ["strata_cover"], F: ["dmh_counts", "surface_ha"] }`.
  - `STRATUM_MIN_COVER_PERCENT` (20, S p. 20) and `DMH_GROUP_DENSITY_CAP_PER_HA` (2, M p. 9 and p. 17).
  - `strataCountFromCover` (19 does not count, 20 does), `dmhDensityPerHa` (`{ trees_per_ha, capped_groups }`, no rounding, null for a surface of 0, negative or not finite), `readStrataCover` (known codes, finite values 0 to 100) and `readDmhCounts` (known codes, whole numbers of 0 or more), both null for a non-object or no valid entry.
  - Exported from `packages/ibp-domain/src/index.ts` right after the route re-export.
- `packages/ibp-domain/src/parity/cases.ts`: `UNCAPPED_DETAIL_CASES` added to `IBP_PARITY_CASES`. Expected values worked out by hand from the matrix thresholds.
  - MAT-B-UNC-01 (3 strata with cover: B = 2), MAT-B-UNC-02 (cover would count 4, `strata_count` 2: B = 1), MAT-F-UNC-01 (2.5 trees per hectare with counts and surface: F = 1), each in draft and in submit inside the MAT-SUBMIT-02 set (totals 17 / 7 / 24, 16 / 7 / 23 and 13 / 7 / 20), under v3.0 and v3.2.
  - MAT-B-UNC-03 and MAT-F-UNC-02 (detail key without its scored key): not scored, `ok=false`, `factor_invalid_raw`, draft, both methods.
- `docs/technical/ibp-validation-matrix-v2.md`: new section with the five rows, in the same commit as the cases.

## Verification

- `npm run test:coverage:domain` equivalent (`npm --workspace @cortege/ibp-domain run test:coverage`): 468 tests pass, 100 % statements, branches, functions and lines; `factor-details.ts` at 100 %.
- API adapter `api/test/ibp-parity.spec.ts`: 94 tests pass, 16 of them the new UNC cases. Mobile adapter `mobile/src/app/ibp-parity.test.ts`: 106 tests pass, 16 of them the new UNC cases. Neither runner file changed.
- `npm run lint` and `npm run typecheck` exit 0. `npm run format:check` flags only `.claude/settings.local.json`, which is not part of this plan.
- `git diff` on `packages/ibp-domain/src/rules`: empty. `mobile/src/hooks/useSurveySync.ts` untouched. `.planning/STATE.md`, `ROADMAP.md` and `REQUIREMENTS.md` not edited.
- TDD gates: `test(30-06)` commit 2b1211ea (RED, module missing) then `feat(30-06)` commit 6e0517b8 (GREEN) for the helpers. The parity cases are regression proofs of unchanged behaviour (no scorer changes), so they pass at once by design; there is no RED for them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The parity runner's matrix-id pattern rejected the mandated ids**
- **Found during:** Task 2
- **Issue:** `packages/ibp-domain/src/parity.test.ts` asserts `matrixId` matches `/^MAT-[A-Z]+-\d{2}(@v3.0|@v3.2|@both)?$/`. The plan's ids `MAT-B-UNC-01` have a second letter group and failed the "has unique ids, each tied to a matrix case id" test. The plan's acceptance criterion says `parity.test.ts` stays unchanged, which conflicts with its own ids.
- **Fix:** widened the pattern by one optional group, `/^MAT-[A-Z]+(-[A-Z]+)?-\d{2}(...)?$/`. No assertion on any case changed. The API and mobile runner files are unchanged.
- **Files modified:** `packages/ibp-domain/src/parity.test.ts`
- **Commit:** b29264b2

**2. Draft-only cases for the two unreadable-input cases**
- MAT-B-UNC-03 and MAT-F-UNC-02 run in draft only. In submit the unreadable factor would add further issue codes (required-factor codes) that the plan does not specify and that would add no proof; the draft cases already show the detail key alone is unreadable input.

No rule from the validated spec was changed.

## Threat model

T-30-12 (a detail key inflating a score) is mitigated: MAT-B-UNC-02 proves the cover is not read. T-30-13 (large detail objects) is mitigated: the readers keep only the 5 or 15 known codes.

## Known Stubs

None.

## Self-Check: PASSED

- Files present: `packages/ibp-domain/src/factor-details.ts`, `packages/ibp-domain/src/factor-details.test.ts`.
- Commits present: 2b1211ea, 6e0517b8, b29264b2.
