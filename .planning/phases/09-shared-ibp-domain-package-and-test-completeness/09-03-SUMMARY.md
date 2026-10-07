---
phase: 09-shared-ibp-domain-package-and-test-completeness
plan: 03
subsystem: api-e2e-tests
tags: [e2e, test-infra, randomUUID, ibp-fixtures, bug-2]
requires: []
provides:
  - "api/test/helpers/surveys-e2e.ts: createE2eApp, loginTestUser, uniqueId, uniqueCoordSeed, getNextVersionNumber, resolveParcel, validDirectFactors"
  - "Feature-split survey E2E files (submit, visibility, public-map-items, attachments, parcel-history, slimmed idempotency)"
  - "E2E fixtures valid under the BUG-2 fix (no direct G/H = 1)"
affects: [01.8-04, 01.8-06, 01.8-09, 01.8-16]
tech-stack:
  added: []
  patterns: ["shared E2E helper module under api/test/helpers (not matched by testMatch)", "randomUUID-derived ids and coordinate seeds"]
key-files:
  created:
    - api/test/helpers/surveys-e2e.ts
    - api/test/surveys-submit.e2e-spec.ts
    - api/test/surveys-visibility.e2e-spec.ts
    - api/test/public-map-items.e2e-spec.ts
    - api/test/surveys-attachments.e2e-spec.ts
    - api/test/parcel-history.e2e-spec.ts
  modified:
    - api/test/surveys-idempotency.e2e-spec.ts
    - api/test/epic-e-search-reports.e2e-spec.ts
    - api/test/surveys-transactions.e2e-spec.ts
    - api/test/surveys-same-version.e2e-spec.ts
    - api/test/sync-installed-app-compat.e2e-spec.ts
decisions:
  - "The split files use the shared validDirectFactors (A-F = 1, G = 2, H = 2, I = J = 2: 8/6/14); the expired-submit test, which had G = 1, H = 2, now uses it too"
  - "uniqueCoordSeed() replaces the parcel-status runSeed; the test keeps its own `% 80000 / 10000000` scaling"
  - "The parcel-history test keeps its inline parcel resolve because it also asserts commune_code"
metrics:
  duration: "~45 min"
  completed: 2026-09-26
  tasks: 2
  files: 12
---

# Phase 01.8 Plan 03: E2E split by feature, randomUUID ids, G/H fixtures to 2 Summary

The 1 626-line `surveys-idempotency.e2e-spec.ts` is split into five feature files plus a slimmed replay/sync file, all driven by a shared helper whose ids, emails and coordinate seeds come from `randomUUID()`. Every direct G = 1 / H = 1 fixture in the E2E suite now sends 2, so the suite is already valid under the BUG-2 fix.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Shared helper and the split into six files with randomUUID ids | b7ff481 (+ 5bae121, comment wording for the gate grep) |
| 2 | Direct G/H fixtures to 2; full E2E in local and MinIO modes | 84a4910 |

## Split (criterion 5, D-12 as amended): 21 tests in 6 files

| File | Tests | Content (old line numbers) |
|------|-------|----------------------------|
| `surveys-submit.e2e-spec.ts` | 7 | l. 93, 128, 174, 233, 299, 868, 935 |
| `surveys-visibility.e2e-spec.ts` | 2 | l. 368, 457 |
| `public-map-items.e2e-spec.ts` | 2 | l. 528, 780 |
| `surveys-attachments.e2e-spec.ts` | 2 | l. 991, 1293 |
| `parcel-history.e2e-spec.ts` | 1 | l. 675 |
| `surveys-idempotency.e2e-spec.ts` (slimmed, 1 626 → 435 lines) | 7 | l. 48, 1109, 1169, 1236, 1404, 1469, 1551 |

Test names and assertions are unchanged. Login blocks became `loginTestUser`, `${Date.now()}` suffixes became `uniqueId(...)`, `Date.now() % 90000` and the l. 781 `runSeed` became `uniqueCoordSeed()`, and parcel-resolve blocks that only read `parcel_id` became `resolveParcel`. The only `Date.now()` left in the six files and the helper is the expiry value `new Date(Date.now() - 60_000)`. `helpers/surveys-e2e.ts` contains `randomUUID` 6 times, is outside `testMatch` (`**/*.e2e-spec.ts`), and is linted and typechecked (`test/**/*.ts`).

## G/H = 1 fixture sites changed (Pitfall 5)

| File | Sites | Old → new | Expected totals |
|------|-------|-----------|-----------------|
| `surveys-submit.e2e-spec.ts` | missing-parcel (G1,H1), expired (G1,H2), valid submit (G1,H1), read-only PATCH (G1,H1) | → `validDirectFactors` (G2,H2) | valid submit: `ibp_peuplement_gestion` 7 → 8, `ibp_contexte` 5 → 6, `ibp_total` 12 → 14. The other three assert no score |
| `surveys-visibility.e2e-spec.ts` | PATCH visibility, sync visibility_update (G1,H1 each) | → `validDirectFactors` | no score assertion |
| `public-map-items.e2e-spec.ts` | 2 local `validFactors` (G1,H1) | → `validDirectFactors` | map item only checks `typeof ibp_total === "number"` |
| `parcel-history.e2e-spec.ts` | 1 local `validFactors` (G1,H1) | → `validDirectFactors` | no score assertion |
| `epic-e-search-reports.e2e-spec.ts` | 3 objects (l. 83-84, 202-203, 371-372) | G 1 → 2, H 1 → 2 | no score assertion |
| `surveys-transactions.e2e-spec.ts` | 1 object (l. 26-27) | G 1 → 2, H 1 → 2 | no score assertion |
| `surveys-same-version.e2e-spec.ts` | l. 311 one-line `validFactors` | G 1 → 2, H 1 → 2 | no score assertion |
| `sync-installed-app-compat.e2e-spec.ts` | 1 object (l. 28-29) | G 1 → 2, H 1 → 2 | compares against the server's own `scores`, no literal |

No test asserts a rejected G/H = 1 value and no `selected_class: "S1"` for G or H existed. No other factor value changed. `grep -nE '"?[GH]"?: *1\b|class_score: *1\b' api/test/*.e2e-spec.ts` is empty.

## Verification

| Check | Before | After |
|-------|--------|-------|
| Full E2E, local mode (`ibp_p18_03_test`, ACCESS_TOKEN_SECRET unset, under `flock`) | 25 suites; 177 passed, 3 skipped, 180 total | 30 suites; 177 passed, 3 skipped, 180 total |
| Six split files only (Task 1, before the G/H change) | — | 6 suites, 21 passed |
| Full E2E, MinIO mode (container `p18-03-minio`, pinned `pgsty/minio@sha256:b6bfe723…e602372`, port 19703, ci.yml e2e-minio env) | — | 30 suites; 179 passed, 1 skipped (the `itLocal` case), 180 total. The container was then removed |
| `npm run lint` | — | exit 0 |
| `npm run typecheck` | — | exit 0 |
| `npm --workspace api run test:unit` | — | 29 suites, 638 passed (coverage thresholds met) |
| `npm run format:check` | — | all files pass |
| Gate greps (G/H = 1; `Date.now()` except the expiry) | — | both empty |

## Deviations from Plan

**1. [Rule 1 - Bug] The gate grep matched a comment in the helper.** The first version of the helper's header comment contained the literal text `Date.now()`, which the plan's `Date.now()` gate grep caught. I reworded the comment in commit 5bae121. It is a comment-only change.

Otherwise the plan was executed as written. MinIO mode ran locally (Docker was available), so nothing is left to CI only.

## Known Stubs

None.

## Self-Check: PASSED

- All six spec files and `api/test/helpers/surveys-e2e.ts` exist
- Commits b7ff481, 84a4910 and 5bae121 are in `git log`
