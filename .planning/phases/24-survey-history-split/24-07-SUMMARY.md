---
phase: 24-survey-history-split
plan: 07
subsystem: mobile-survey-detail
tags: [typescript, react-native, survey-summary, parcel-history]
requires:
  - phase: 24-survey-history-split
    provides: plan 24-02 (useParcelSurveyHistory refreshKey, AppGroupedList multiline), plan 24-04 (historyRowState, buildEntriesFromOwn), plan 24-05 (catalogue keys)
provides:
  - toHistoryRow, HistoryRowDisplay (shared with the community page, plan 24-11)
  - useHistoryRow hook
  - Summary third row "Historique de la parcelle" with derived value, spoken label and conditional press
affects: [24-11, 24-12]
tech-stack:
  added: []
  patterns: ["catalogue mapping of a pure row state in screens/survey-detail, fed by a thin hook"]
key-files:
  created:
    - mobile/src/screens/survey-detail/history-row.ts
    - mobile/src/screens/survey-detail/history-row.test.ts
    - mobile/src/screens/survey-detail/useHistoryRow.ts
    - mobile/src/screens/survey-detail/useHistoryRow.test.ts
  modified:
    - mobile/src/screens/SurveyDetailScreen.tsx
    - mobile/src/screens/SurveyDetailScreen.test.tsx
    - mobile/src/i18n/fr/survey-detail.ts
key-decisions:
  - "No parcel: onPress is undefined (not disabled), because AppGroupedList draws a chevron whenever onPress is set (UI-SPEC correction 5)"
  - "A loading row (or a null access token while online) shows no value and speaks the label alone"
  - "The survey status is the refresh key, so the value updates after Terminer"
requirements-completed: []
status: complete
duration: 15min
completed: 2026-10-09
---

# Phase 24 Plan 07: Historique de la parcelle summary row

The survey summary's third row now reads "Historique de la parcelle" and shows the first-to-latest total ("21 → 34"), "Premier relevé", "1 relevé" / "n relevés", "Indisponible" (offline or error), nothing while loading, or "Aucune parcelle" (no chevron, no press). The row speaks "Historique de la parcelle. de 21 à 34 sur 50". REQ-C-history-split is deliberately left unchecked in REQUIREMENTS.md (the owner closes it after the phone check in plan 24-12).

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Row display mapping and the useHistoryRow hook | 0c8213a1 |
| 2 | The summary row "Historique de la parcelle" | 354376cb |

## What changed

- `history-row.ts`: `toHistoryRow(state)` maps the seven states of `HistoryRowState` to `{ value, accessibilityLabel, pressable }` from `fr.surveyDetail.rows` and `a11y`. Only the range speaks differently from what it shows.
- `useHistoryRow.ts`: `useIsOffline()` + `useParcelSurveyHistory(apiUrl, accessToken, parcelId, isOffline, refreshKey)`, entries from `buildEntriesFromOwn` (memoised), `historyRowState` with `loading: history.loading || accessToken === null` and `offline: history.offline || isOffline`.
- `SurveyDetailScreen.tsx` (331 lines): calls `useHistoryRow` with the first parcel id, the selected survey id and its status; the `history` row gets `multiline: true`, the value, the spoken label and `onPress: historyRow.pressable ? onOpenHistory : undefined`. Doc comment updated. Still three rows; no journal row (D-02).
- `i18n/fr/survey-detail.ts`: the old row value key ("Voir les étapes") removed, no reader left.

## Verification (actually run)

- `npx jest --config jest.unit.config.js src/screens/survey-detail/history-row.test.ts src/screens/survey-detail/useHistoryRow.test.ts`: 2 suites, 16 tests pass.
- `npx jest ... src/screens/SurveyDetailScreen.test.tsx src/i18n src/__checks__`: 9 suites, 126 tests pass (motion, dash, structure gates included).
- `npm run test:coverage:mobile`: 261 suites, 3273 tests pass.
- `npm run lint`, `npm run typecheck`: no errors. `npm run format:check`: only the git-ignored `.claude/settings.local.json` warns (known, ignored).
- Greps: `historyEmpty` has no match under `mobile/src`; `historyRow.pressable ? onOpenHistory : undefined` and `multiline: true` present; screen is 331 lines.
- Not run: `npm run test:unit` as a whole (the API suite `check-env-parity.spec.ts` fails on main too, unrelated), API e2e (no `api/.env.test`), phone check (plan 24-12).

## Deviations from Plan

None. The implementation and its tests for Task 1 were written together rather than strictly red first; the tests were run green on the first pass.

## Known Stubs

None.

## Threat Flags

None. No new network surface: the row reuses the existing history GET, skipped offline and without a token (T-24-12).

## Self-Check: PASSED

All four created files exist; commits 0c8213a1 and 354376cb are in the log.
