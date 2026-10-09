---
phase: 24-survey-history-split
plan: 05
subsystem: mobile-i18n
tags: [typescript, i18n, catalogue, parcel-history]
requires:
  - phase: 24-survey-history-split
    provides: plan 24-03, header title surveyJournal and menu texts
provides:
  - fr.parcelHistory.page.* (subtitle, states, trend, deltas, list texts)
  - fr.parcelHistory.entry harmonised to "version N"
  - fr.surveyDetail.rows.history* and a11y.historyRow / historyRange
  - fr.navigation.headers.surveyHistory and communityHistory ("Historique de la parcelle")
affects: [24-07, 24-08, 24-09, 24-10, 24-11]
tech-stack:
  added: []
  patterns: ["catalogue-first: every text of a wave-3 screen exists, branch tested, before the screens use it"]
key-files:
  created:
    - mobile/src/i18n/fr/parcel-history.test.ts
  modified:
    - mobile/src/i18n/fr/parcel-history.ts
    - mobile/src/i18n/fr/survey-detail.ts
    - mobile/src/i18n/fr/navigation.ts
    - mobile/src/i18n/catalogue.test.ts
    - mobile/src/screens/survey-detail/HistorySection.test.tsx
key-decisions:
  - "Trend title split into string-only functions (titleStrong, titleAccent, newMethodStrong, newMethodAccent) so catalogue.test.ts keeps its 'every function returns a string' rule"
  - "Entry says 'version N' (capitalised 'Version N' when it is the first part), never 'vN', so it cannot be read as a method"
  - "The arrow of historyValue is written as the JavaScript escape u2192; the phone check in 24-12 verifies the glyph, fallback is a one-line change to ' à '"
  - "Old keys rows.historyEmpty and the versionHistory block kept: they lose their consumers in 24-07 and 24-10"
requirements-completed: []
status: complete
duration: 15min
completed: 2026-10-09
---

# Phase 24 Plan 05: Parcel history catalogue Summary

All French texts of the parcel history (page, summary row, header titles) are now in the typed catalogue as plain string values or string functions, with branch tests, ready for the wave-3 screens. REQ-C-history-split is deliberately left unchecked (the owner closes it after the phone check in plan 24-12).

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Parcel history page texts and the harmonised entry | 90ebb0a7 |
| 2 | Summary row texts and header titles | ae39609f |

## What changed

- `fr.parcelHistory.page`: `subtitle`, `first`, `noParcel`, `offline`, `reload`; `trend` (`titleStrong`, `titleAccent`, `newMethodStrong`, `newMethodAccent`, `newMethodUnknown`, `mixed`, `unknownYear`, `a11y`, `a11yMixed`); `deltas` (`title`, `total`, `value`, `none`, `row`, `differentMethod`); `list` (`title`, `current`, `method`, `open`, `openCurrent`). Totals use `IBP_MAX.total`.
- `fr.parcelHistory.entry`: "2025 · version 1 · Dernier relevé", "Version 1", "2025", "Relevé". The three wording tests moved from `HistorySection.test.tsx` to `parcel-history.test.ts`; the glass card test stayed.
- `fr.surveyDetail.rows`: `history` is "Historique de la parcelle"; new `historyValue` ("21 → 34"), `historyCount`, `historyFirst`, `historyUnavailable`, `historyNoParcel`. `a11y.historyRow` and `a11y.historyRange` ("de 21 à 34 sur 50").
- `fr.navigation.headers`: `surveyHistory` changed, `communityHistory` added.
- `catalogue.test.ts`: `LIST_ARGUMENTS["parcelHistory.page.trend.a11y"]`.

## Verification (real runs)

- `cd mobile && npx jest --config jest.unit.config.js src/i18n src/__checks__/catalogue-dash.test.ts src/screens/survey-detail/HistorySection.test.tsx src/screens/public-map` (task 1): 17 suites, 165 tests passed.
- `cd mobile && npx jest --config jest.unit.config.js src/i18n src/__checks__/catalogue-dash.test.ts src/navigation/navigation.test.tsx` (task 2): 4 suites, 75 tests passed.
- Full mobile unit suite: 259 suites, 3252 tests passed.
- `npm run lint`: no error or warning. `npm run typecheck`: no error.
- `npm run format:check`: only warns on the git-ignored `.claude/settings.local.json` (known, ignored).
- Acceptance greps: all satisfied (`"parcelHistory.page.trend.a11y"` in catalogue.test.ts; `titleStrong`, `differentMethod`, `openCurrent`, `version ${version}` in parcel-history.ts; 14 `test(` in parcel-history.test.ts; `u2192`, `historyRange`, `historyNoParcel` in survey-detail.ts; both header titles in navigation.ts).
- API e2e was not run (`api/.env.test` does not exist locally); this plan touches no API code.

## Deviations from Plan

None - plan executed as written. The `version ${version}` literal was kept in a nested ternary so the plan's grep acceptance criterion matches the source.

## Known Stubs

None. The new catalogue keys have no screen consumer yet by design (plans 24-07 to 24-11).

## Threat Flags

None. T-24-10 is mitigated: the new functions take counts, years, totals, letters and display names only, and the `catalogue.test.ts` ID probe runs over all of them.

## Self-Check: PASSED

- FOUND: mobile/src/i18n/fr/parcel-history.test.ts
- FOUND commits 90ebb0a7 and ae39609f
