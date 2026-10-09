---
phase: 24-survey-history-split
plan: 10
subsystem: mobile-survey-detail
tags: [typescript, react-native, parcel-history, navigation, cleanup]
requires:
  - phase: 24-survey-history-split
    provides: plan 24-02 (useParcelSurveyHistory with reload and refreshKey), 24-04 (buildParcelHistory, buildEntriesFromOwn), 24-05 (fr.parcelHistory.page), 24-06/24-07 (summary row, journal route), 24-08 (TrendCard), 24-09 (FactorDeltasCard, HistoryList)
provides:
  - ParcelHistoryView (presentational page body, own and community variants, shared with plan 24-11)
  - SurveyHistoryScreen rewritten as "Historique de la parcelle" with the full state matrix and pull to refresh
  - SurveyHistoryRoute with onOpenSurvey -> navigation.push("communitySurvey")
  - HistorySection and its orphans removed
affects: [24-11, 24-12]
tech-stack:
  added: []
  patterns: ["page shell owns fetching and states, a presentational view owns the loaded body", "entrance indices count the blocks shown (no gap)"]
key-files:
  created:
    - mobile/src/screens/survey-detail/ParcelHistoryView.tsx
    - mobile/src/screens/survey-detail/ParcelHistoryView.test.tsx
  modified:
    - mobile/src/screens/SurveyHistoryScreen.tsx
    - mobile/src/screens/SurveyHistoryScreen.test.tsx
    - mobile/src/navigation/routes/SurveyHistoryRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/screens/survey-detail/screen-props.ts
    - mobile/src/screens/survey-detail/summary.styles.ts
    - mobile/src/i18n/fr/survey-detail.ts
    - mobile/src/i18n/fr/parcel-history.ts
    - docs/design/component-inventory-phase-23.md
  deleted:
    - mobile/src/screens/survey-detail/HistorySection.tsx
    - mobile/src/screens/survey-detail/HistorySection.test.tsx
key-decisions:
  - "The community variant never renders the delta block; ParcelHistoryView checks the variant itself, so the community page (24-11) only passes entries built by buildEntriesFromCommunity"
  - "The skeleton state also covers a missing access token (online), so a token that has not arrived yet never reads as 'first survey of this parcel'"
requirements-completed: []
status: complete
duration: 40min
completed: 2026-10-09
---

# Phase 24 Plan 10: Parcel history page Summary

`surveyHistory` is now "Historique de la parcelle" only: title, subtitle, then one state block (no parcel, offline, error with a reload action, first-load skeleton) or the loaded `ParcelHistoryView` (first-survey notice or trend card, per-factor deltas or the "different method" notice, list of the parcel's surveys). The change log lives only on `surveyJournal`. The old `HistorySection` and everything only it used are removed. REQ-C-history-split is deliberately left unchecked (`- [ ]`); the owner closes it after the phone check in plan 24-12.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | ParcelHistoryView (shared page body) | c7bb449f |
| 2 | SurveyHistoryScreen and SurveyHistoryRoute rewritten | 7a4de79f |
| 3 | Remove the old history section and its orphans | d8b48371 |

## What changed

- `ParcelHistoryView.tsx` (59 lines): props `{ entries, variant, onOpenSurvey }`; `useMemo(() => buildParcelHistory(entries))`; each shown block is wrapped in `EntranceView` with a running index (0, 1, 2, no gap). First survey (`model.isFirst`): `AppNotice` info with `page.first`, then the list when there is a row. `TrendCard` when `trend.kind !== "none"`. Own variant only: `FactorDeltasCard` for `deltaCard.kind === "card"`, or `AppNotice` info with icon `git-compare-outline` and `page.deltas.differentMethod` for `"differentMethod"`. `HistoryList` when there is at least one row.
- `SurveyHistoryScreen.tsx` (133 lines): hook called with `(apiUrl, accessToken, parcelIds[0] ?? null, isOffline, selectedSurvey.status)`. State precedence: no parcel (info), offline from `useIsOffline` or the hook (warning), error (danger, action `page.reload` calls `history.reload`), first load (`loading` with no items, or `accessToken === null`: glass card, three `SkeletonRow`, `accessibilityLabel` `fr.parcelHistory.loading`, live region polite), loaded. `RefreshControl`: `refreshing = history.loading && items.length > 0`, `onRefresh = history.reload`, tint `theme.colors.forest`. No `EventsTab`, no events loading.
- `SurveyHistoryRoute.tsx`: reads session, access token and surveys; `onOpenSurvey` (`useLatestCallback`) calls `navigation.push("communitySurvey", { surveyId })`; renders nothing without a selected survey; still in `framedRoutes` and `largeTitleRoutes`.
- `screen-props.ts`: `SurveyHistoryScreenProps = SurveyDetailBaseProps & { onOpenSurvey }` (events props removed; `SurveyEventItem` import stays, still used by the detail and journal props).

## Removed (greps run before deleting, whole of mobile/src, mobile/test, docs)

| Removed | Readers found before deletion |
|---------|-------------------------------|
| `HistorySection.tsx`, `HistorySection.test.tsx` (`git rm`) | only each other and the old `SurveyHistoryScreen` (rewritten in Task 2); one doc mention in `docs/design/component-inventory-phase-23.md` (note updated: no raw RN `Text` import remains) |
| style keys `historyPanel`, `historyRow`, `historyRowTitle`, `historyRowMeta`, `historyDeltaRow`, `historyDeltaPill`, `historyDeltaPillText` in `summary.styles.ts` | only `HistorySection`. The unrelated `historyRow` hits are `useHistoryRow` in `SurveyDetailScreen`, `fr.surveyDetail.a11y.historyRow` and a local `historyRow` style in `CommunitySurveyScreen` (its own styles, left to plan 24-11) |
| unused imports of `summary.styles.ts` (`brandDefaultFontFamily`, `brandTypeScale`) | file kept with `actionPanel` and `discardLink` (read by `DetailActions`) |
| `fr.surveyDetail.versionHistory` block and its comment | only `HistorySection` and its test |
| `fr.parcelHistory.delta.stand`, `delta.context` | only `HistorySection` and its test; `delta.total`, `delta.unavailable`, `empty`, `openSurvey`, `a11y` kept (Explorer panel, history list) |

`grep -rq versionHistory mobile/src` exits 1; `grep -c "historyPanel\|historyDeltaPill" summary.styles.ts` prints 0.

## Verification actually run

| Check | Result |
|-------|--------|
| `npx jest ... ParcelHistoryView.test.tsx` | 8 tests passed |
| `npx jest ... SurveyHistoryScreen.test.tsx src/navigation src/state/render-counts.test.tsx` | 14 suites passed (13 screen tests included) |
| `npx jest ... src/__checks__ src/i18n src/screens/survey-detail` | 41 suites, 418 tests passed (structure gate: no orphaned style key, no file over 400 lines) |
| `npm run test:coverage:mobile` | exit 0, 266 suites, 3354 tests passed after Task 2 and again after Task 3; `ParcelHistoryView.tsx`, `SurveyHistoryScreen.tsx`, `SurveyHistoryRoute.tsx` 100/100/100/100; navigation floor holds |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run format:check` | only the warning on the git-ignored `.claude/settings.local.json` |
| `npm run test:unit` | exit 1: ibp-domain 9 suites / 230 tests passed; API 36 of 37 suites passed, the only failing suite is `test/check-env-parity.spec.ts` (34 tests, pre-existing, environment related, also fails on main, unrelated to this phase). The script stops after the API failure, so the mobile suite was run separately: `cd mobile && npx jest --config jest.unit.config.js` gave 265 suites, 3348 tests, all passed |
| Task 1/2 acceptance greps (`git-compare-outline`, `buildParcelHistory(`, `ParcelHistoryView`, `selectedSurvey.status`, `history.reload`, `push("communitySurvey"`, `onOpenSurvey: (surveyId: string) => void`; `EventsTab` count 0) | all as required |

### Not run

- API e2e: not applicable (mobile-only plan; `api/.env.test` does not exist locally anyway).
- No simulator, device or Android check. The page was only exercised through `react-test-renderer` with mocked `react-native`, `ParcelHistoryView`, hooks and `AppNotice`. Real layout at 375 pt, Dynamic Type, pull to refresh feel, the skeleton glass card, the trend reveal and tapping a list row to open `communitySurvey` are unverified until the phone check in plan 24-12. The community page route (`communitySurvey`) is not yet updated for the history list (plan 24-11).

## Deviations from Plan

None. Rules 1 to 3 did not apply. One small addition beyond the file list: the plan's `docs` grep found `docs/design/component-inventory-phase-23.md` naming `HistorySection`, so that one note was updated to avoid a stale claim. TDD ordering: per task the test file and the component were written in the same pass and committed together (one commit per task), not as separate `test(...)` and `feat(...)` commits; the first test run of Task 1 passed immediately, and one test of Task 2 failed on a test-side mistake (the mocked `ScrollView` does not draw its `refreshControl` prop; fixed in the test).

## Known Stubs

None.

## Known limitation

On the first render with a token and a parcel, the hook state is idle (not loading) until its effect runs, so the page can show the loaded view for one frame before the skeleton (the same behaviour as the summary row of 24-06, which was fed the same way). A hook-level `settled` flag would remove it; not done because the plan fixes the state conditions.

## Threat Flags

None. T-24-08 mitigated as planned (entries built by `buildEntriesFromOwn`, finite totals, `Array.isArray` in the hook); T-24-14, T-24-16 and T-24-SC accepted; no package installed.

## Self-Check: PASSED
