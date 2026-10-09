---
phase: 24-survey-history-split
plan: 02
subsystem: mobile-ui
tags: [react-native, hooks, grouped-list, contrast]
requires:
  - phase: 24-survey-history-split
    provides: plan 01 wire field (independent, wave 1)
provides:
  - AppGroupedList nav row `multiline` flag (label up to 2 lines, value never shrinks)
  - useParcelSurveyHistory `reload()` and `refreshKey` (5th param), type ParcelSurveyHistoryResult
  - useCommunitySurvey `options.withPhotos` (4th param, default true)
  - jest contrast pair for success and danger text on the glass card over the canvas, both schemes
affects: [24-survey-history-split]
tech-stack:
  added: []
  patterns: ["boolean (not options object) as effect dependency", "attempt counter + stable reload via useCallback"]
key-files:
  created: []
  modified:
    - mobile/src/ui/AppGroupedList.tsx
    - mobile/src/ui/AppGroupedList.test.tsx
    - mobile/src/hooks/useParcelSurveyHistory.ts
    - mobile/src/hooks/useParcelSurveyHistory.test.ts
    - mobile/src/hooks/useCommunitySurvey.ts
    - mobile/src/hooks/useCommunitySurvey.test.ts
    - mobile/src/app/visual-tokens.test.ts
key-decisions:
  - "No token value changed: both delta-text pairs already reach 4.5:1 on the glass card over the canvas, so the new test only enforces it"
  - "useParcelSurveyHistory returns a fresh object each render (state spread + stable reload); reload identity is stable, which is what callers need"
requirements-completed: [REQ-C-history-split]
status: complete
duration: 15min
completed: 2026-10-09
---

# Phase 24 Plan 02: Building blocks for the history split Summary

Three existing mobile blocks extended so later Phase 24 plans only wire them: a two-line label on grouped-list rows, reload and refresh key on the parcel history hook, and a no-photos option on the community survey hook, plus the two delta-text contrast pairs. No screen changed.

## Accomplishments

- `AppGroupedListNavRow.multiline`: label `numberOfLines` 2 (else 1), value gets the new `valueFixed` style (`flexShrink: 0`); every other row is unchanged.
- `useParcelSurveyHistory(apiUrl, token, parcelId, isOffline = false, refreshKey = null)` now returns `{ ...state, reload }`. `reload` is stable (`useCallback`); `attempt` and `refreshKey` are effect dependencies. Items of the previous answer stay while it refetches. Offline, `reload()` re-runs the effect and lands on the offline state without fetching. Existing callers (`ParcelHistoryCard`, `HistorySection`) were not touched and their suites pass.
- `useCommunitySurvey(..., options = {})`: `withPhotos` derived as a boolean before the effect and used as the dependency, so an inline options object never reloads. With `withPhotos: false` the hook returns right after `setPhase("ready")`, no attachment request.
- `visual-tokens.test.ts`: new test "success and danger text on the glass card over the canvas (24 delta card)" in the per-scheme `contrast pairs` describe (runs for light and dark). It passed without any token change.

## Task Commits

1. Task 1 (TDD): `c4d35f61` feat(24-02): two-line label on grouped-list nav rows
2. Task 2 (TDD): `739516c7` feat(24-02): reload and refresh key on the parcel history hook
3. Task 3: `f9107839` feat(24-02): community survey without photos and delta-text contrast pairs

TDD notes: for tasks 1 and 2 the new tests were written first and failed (ts-jest type errors: `multiline` unknown, `reload` missing, 5 arguments) before the implementation. For task 3 the `withPhotos: false` test and the implementation were written in the same step, so a RED run was not recorded for it; the contrast test is a pure assertion that passes against unchanged tokens.

## Verification actually run

| Check | Result |
|-------|--------|
| `jest src/ui/AppGroupedList.test.tsx src/__checks__/structure.test.ts` | pass, 2 suites, 27 tests |
| `jest src/hooks/useParcelSurveyHistory.test.ts src/screens/public-map src/screens/survey-detail/HistorySection.test.tsx` | pass, 15 suites, 150 tests |
| `jest src/hooks/useCommunitySurvey.test.ts src/app/visual-tokens.test.ts` | pass, 2 suites, 157 tests |
| Whole mobile unit suite (`jest --config jest.unit.config.js` in `mobile/`) | pass, 255 suites, 3114 tests |
| `cd mobile && npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run format:check` | one warning only, `.claude/settings.local.json` (git-ignored local file, not part of this plan); all files of this plan are clean |
| Acceptance greps | `multiline?: boolean`, `row.multiline ? 2 : 1`, `valueFixed`, `export type ParcelSurveyHistoryResult`, `refreshKey`, `reload`, `withPhotos` all present; counts: multiline in AppGroupedList test 3 (>=2), `reload()` 6 (>=1), `refreshKey\|"submitted"` 6 (>=1), `withPhotos: false` 2 (>=1), `onSurface.success` 1 (baseline 0), `onSurface.danger` 4 (baseline 3, needs >=4) |

### Not run

- API e2e: not part of this plan (mobile-only changes); `api/.env.test` does not exist locally in any case.
- `npm run test:unit` for the API and `ibp-domain` workspaces was not re-run (no change there); only the mobile suite was run in full.

## Deviations from Plan

None. The plan was executed as written. Prettier reflowed the long value `Text` line in `AppGroupedList.tsx` onto multiple lines (formatting only).

## Known Stubs

None.

## Threat Flags

None. T-24-04 is kept: the `Array.isArray(payload.items)` guard and the request-id guard are untouched and `reload` goes through the same effect path.

## Self-Check: PASSED

Commits `c4d35f61`, `739516c7` and `f9107839` exist; all seven files in `files_modified` were changed.
