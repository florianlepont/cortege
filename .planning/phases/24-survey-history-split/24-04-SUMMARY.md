---
phase: 24-survey-history-split
plan: 04
subsystem: mobile-domain-logic
tags: [typescript, pure-functions, ibp-domain, parcel-history, svg-geometry]
requires:
  - phase: 24-survey-history-split
    provides: plan 24-01, ibp_method_version on both history payloads
provides:
  - app/trend-geometry.ts (yDomain, buildTrend, pathLength, curve constants and types)
  - app/parcel-history.ts (entries, method keys, trend title data, summary row state, delta card state, list rows, buildParcelHistory)
  - mobile/test/parcel-history-fixtures.ts (V30, V32, factorResults, ownItem, communityItem, entry)
affects: [24-survey-history-split]
tech-stack:
  added: []
  patterns: ["pure model + presentational view: every number of the parcel history is computed outside React, colour and catalogue"]
key-files:
  created:
    - mobile/src/app/trend-geometry.ts
    - mobile/src/app/trend-geometry.test.ts
    - mobile/src/app/parcel-history.ts
    - mobile/src/app/parcel-history.test.ts
    - mobile/test/parcel-history-fixtures.ts
  modified: []
key-decisions:
  - "Delta base is the survey immediately before the current one in the parcel order, not the last other survey (corrects the old HistorySection rule)"
  - "Window divergence kept on purpose and pinned by a test: trend title and curve use the latest 8 surveys, the summary row range uses all of them"
  - "A history item whose scores are not three finite numbers keeps total 0 and loses its scores, so a delta can never be NaN and the delta card hides"
  - "A missing ibp_method_version (older server) inherits its neighbour's method; resolveMethodVersion is never called with undefined"
requirements-completed: []
status: complete
duration: 25min
completed: 2026-10-09
---

# Phase 24 Plan 04: Parcel history model and curve geometry Summary

Two pure modules now hold every number of the parcel history: `trend-geometry.ts` (curve domain, points, solid runs cut at each method change, dashed links) and `parcel-history.ts` (entries from own and community history, method keys, trend title data, summary row state, per-factor delta card state, list rows). No view uses them yet; plans 24-05 onwards build on them.

REQ-C-history-split is deliberately left unchecked (the owner closes it after the phone check in plan 24-12).

## Accomplishments

- `trend-geometry.ts`: `yDomain` (padded by 5, at least 20 wide, within 0..50, empty gives 0..50), `buildTrend` (x spread by survey order between 24 and width - 24, y from 96 to 32, one segment per run of two or more points, a link between runs, width 0 or below gives nothing), `pathLength`, and the six layout constants (128, 24, 32, 96, 120, 12). No colour, no React.
- `parcel-history.ts` (11 exported functions): `buildEntriesFromOwn`, `buildEntriesFromCommunity`, `methodKeys`, `methodShortLabel`, `trailingRunStart`, `drawnWindow`, `trendSummary`, `historyRowState`, `deltaCardState`, `listRows`, `buildParcelHistory`, plus `DRAWN_POINTS = 8` and the types `HistoryEntry`, `MethodShortLabel`, `TrendSummary`, `HistoryRowState`, `DeltaCardState`, `HistoryListRow`, `ParcelHistoryModel`. Imports only the package, `ibp-scoring`, `types` and `trend-geometry`.
- Method comparison goes through `resolveMethodVersion` (null, "" and the v3.0 tag are one method, an unknown tag is its own "unsupported" key), deltas through `computeFactorDeltas` and `computeIbpTotalDelta`. No IBP rule is re-implemented.
- Fixtures for the later view tests (plans 24-07 to 24-11) in `mobile/test/parcel-history-fixtures.ts`.

## Task Commits

1. Task 1 (TDD): `2eeca625` feat(24-04): pure curve geometry for the parcel history
2. Task 2 (TDD): `7d9a4888` feat(24-04): parcel history model and shared fixtures

TDD note: for both tasks the test file was written first and run against the missing module (suite failed to compile, so RED was "module not found", not individual failing assertions); the implementation was then written in one pass and the suites passed on the first run. RED and GREEN were committed together per task, not as separate `test(...)` and `feat(...)` commits.

## Verification actually run

| Check | Result |
|-------|--------|
| `cd mobile && npx jest --config jest.unit.config.js src/app/trend-geometry.test.ts` | pass, 27 tests |
| `cd mobile && npx jest --config jest.unit.config.js src/app/parcel-history.test.ts src/app/trend-geometry.test.ts` | pass, 2 suites, 107 tests |
| `cd mobile && npx tsc --noEmit` | exit 0 |
| `npm run test:coverage:mobile` | exit 0, 258 suites, 3238 tests; `parcel-history.ts` and `trend-geometry.ts` 100/100/100/100 |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run format:check` | exit 1 only because of the warning on git-ignored `.claude/settings.local.json`; no file of this plan is flagged |
| Acceptance greps (`export function yDomain/buildTrend/pathLength`, `export type TrendInputPoint`, `resolveMethodVersion(`, `computeFactorDeltas(`, `computeIbpTotalDelta(`) | all present |
| `grep -cE '"#[0-9A-Fa-f]{3,8}"\|rgba\('` on `trend-geometry.ts` | 0 |
| `grep -cE 'from "\.\./(screens\|i18n\|ui)"'` on `parcel-history.ts` | 0 |
| `grep -c "export function"` on `parcel-history.ts` | 11 (required at least 9) |

### Not run

- `npm run test:unit` as a whole was not run separately; the mobile suite ran in full through `test:coverage:mobile` (258 suites). The API and `ibp-domain` workspaces were not touched and were not re-run.
- API e2e: not applicable (mobile-only plan; `api/.env.test` does not exist locally in any case).
- No device or simulator check: nothing renders these modules yet.

## Deviations from Plan

**[Rule 2 - Missing critical functionality] `buildEntriesFromOwn` drops scores that are not three finite numbers.** The plan coerces the total to 0 but keeps `scores` as received; `computeIbpTotalDelta` would then return NaN for a malformed history item. Scores are kept only when all three values are finite numbers, otherwise `scores` is undefined and the delta card hides (T-24-08 intent). Tested with NaN, a string and a missing `scores`. Commit `7d9a4888`.

**`TrendPoint.total` is the clamped total, not the raw input.** Same T-24-08 reason: the value label text is drawn from the point, so the point carries the 0..50 clamped value. Commit `2eeca625`.

## Known Stubs

None.

## Threat Flags

None. T-24-08 (malformed totals reaching SVG attributes) is mitigated and tested (NaN, Infinity, -5, 80, a string all give finite coordinates and a 0..50 total); T-24-09 (unknown method tag) is mitigated and tested (an unsupported tag is its own key, never equal to v3.0, so the delta card shows "different method" and the curve is cut).

## Self-Check: PASSED

Commits `2eeca625` and `7d9a4888` exist; all five files of `files_modified` exist.
