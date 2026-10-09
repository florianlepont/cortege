---
phase: 24-survey-history-split
plan: 09
subsystem: mobile-survey-detail
tags: [typescript, react-native, parcel-history, glass-card, survey-row]
requires:
  - phase: 24-survey-history-split
    provides: plan 24-04 (DeltaCardState, HistoryListRow, listRows, deltaCardState), plan 24-05 (fr.parcelHistory.page.deltas and page.list)
provides:
  - FactorDeltasCard (glass card, ten factor rows with bar and signed change, display only)
  - HistoryList (glass SurveyRowFrame rows with ScoreRing, own and community variants, current row marked)
affects: [24-10, 24-12]
tech-stack:
  added: []
  patterns: ["presentational components fed by the pure model: no derivation in the views, texts only from the catalogue"]
key-files:
  created:
    - mobile/src/screens/survey-detail/FactorDeltasCard.tsx
    - mobile/src/screens/survey-detail/FactorDeltasCard.test.tsx
    - mobile/src/screens/survey-detail/HistoryList.tsx
    - mobile/src/screens/survey-detail/HistoryList.test.tsx
  modified: []
key-decisions:
  - "Delta rows are plain Views (accessible, one label each) with no press handler and no animation, so the history page keeps one animated hero layer (the curve)"
  - "The current history row is a SurveyRowFrame with selected, disabled, accessibilityRole text and no onPress or testID; other rows are role button with testID parcel-history-row-<surveyId>"
  - "Community author comes from entry.author, trimmed, with fr.communitySurvey.unknownAuthor for null or blank"
requirements-completed: []
status: complete
duration: 25min
completed: 2026-10-09
---

# Phase 24 Plan 09: Factor deltas card and survey list Summary

The two lower blocks of the parcel history page are built as presentational components fed by the plan 24-04 model: `FactorDeltasCard` (ten per-factor changes since the survey just before) and `HistoryList` (the parcel's surveys, newest first, current one marked "Ce relevé"). Neither is mounted yet; the page assembly is plan 24-10. REQ-C-history-split is deliberately left unchecked (the owner closes it after the phone check in plan 24-12).

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | FactorDeltasCard | 9054a5cf |
| 2 | HistoryList (own and community variants) | 758b614c |

## What changed

- `FactorDeltasCard.tsx` (126 lines): props `{ state }` (the `card` kind of `DeltaCardState`). `AppCard variant="glass" padding={16}`; title `page.deltas.title(titleYear)` (Sora-SemiBold 16, `textPrimary`); total line `page.deltas.total(total)` (Jost 13, `textSecondary`, 4 below). Ten rows in the order of the state, each 32 high with a gap of 12: letter column 20, bar track (flex 1, height 8, radius 4, `visual.score.track`), fill width `factorRatio(points) * 100%` in `visual.factorBar[factorTone(points)].base` (no fill for 0 points or a missing factor), delta text (right aligned, minWidth 40, `maxFontSizeMultiplier` = `brandFontScaleCaps.button`). Delta colour: `onSurface.success` above 0, `onSurface.danger` below 0, `textSecondary` for "=" and "n.d.". Each row is `accessible` with `page.deltas.row({ letter, points, max: MAX_FACTOR_POINTS, delta })`, testID `factor-delta-<letter>`. No Pressable, no animation.
- `HistoryList.tsx` (123 lines): props `{ rows, variant, onOpenSurvey }`. Section header `page.list.title(rows.length)` (Sora-SemiBold 13, `textSecondary`), one `useListEntrance()` call, one `ListEntranceRow` per row around a `SurveyRowFrame` with a `ScoreRing` (`score` = total, `index`, `animationKey` = `surveyId:total`). Own title `fr.parcelHistory.entry(... isLatest: false)`, community title `fr.communitySurvey.history.row` with the author fallback. Status line in order: `page.list.method(label)` when present, `t.total`, `t.delta.total(d)` or `t.delta.unavailable`, then for the current row the `AppChoiceChip variant="status" tone="success"` "Ce relevé". Current row: `selected`, `disabled`, role text, label `page.list.openCurrent`, no press. Other rows: role button, label `page.list.open`, testID `parcel-history-row-<surveyId>`, `onPress` calls `onOpenSurvey(surveyId)`.

## Verification actually run

| Check | Result |
|-------|--------|
| `cd mobile && npx jest --config jest.unit.config.js src/screens/survey-detail/FactorDeltasCard.test.tsx src/__checks__/structure.test.ts src/__checks__/layers.test.ts` | 3 suites, 30 tests passed |
| `cd mobile && npx jest --config jest.unit.config.js src/screens/survey-detail/HistoryList.test.tsx src/screens/survey-detail/FactorDeltasCard.test.tsx src/__checks__` | 8 suites, 100 tests passed |
| `npm run test:coverage:mobile` | 265 suites, 3336 tests passed; `FactorDeltasCard.tsx` and `HistoryList.tsx` 100/100/100/100 |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run format:check` | only the warning on the git-ignored `.claude/settings.local.json`; `prettier --write` on the four new files left them clean |
| `npm run test:unit` | exit 1: ibp-domain 9 suites / 230 tests passed; API 36 of 37 suites passed, the only failing suite is `test/check-env-parity.spec.ts` (34 tests, pre-existing, environment related, also fails on main, unrelated to this phase). The script stops after the API failure, so the mobile suite was run through `test:coverage:mobile` (line above) |
| Task 1 greps (`factorTone(`, `onSurface.success`, `onSurface.danger`, `variant="glass"`) | all present; quoted hex or `rgba(` count in `FactorDeltasCard.tsx`: 0 |
| Task 2 greps (`<SurveyRowFrame`, `variant="status"`, `useListEntrance()`, `parcel-history-row-`) | all present |

### Not run

- API e2e: not applicable (mobile-only plan; `api/.env.test` does not exist locally in any case).
- No simulator, iOS device or Android check: neither component is mounted by any screen yet (plan 24-10). Tests use `react-test-renderer` with a mocked `react-native`, `ScoreRing`, `AppChoiceChip`, `ListEntranceRow` and `useListEntrance`, so contrast, real layout at 375 pt, Dynamic Type and the wave on press are unchecked until the phone check in plan 24-12. The jest contrast pairs for `onSurface.success` and `onSurface.danger` on the glass fill (UI-SPEC) belong to a later plan and were not added here.

## Deviations from Plan

None. The plan's rules 1 to 3 did not apply. TDD ordering: per task the test file and the component were written in the same pass and committed together (one `feat` commit per task), not as separate `test(...)` and `feat(...)` commits. During Task 2 the first test run failed two cases because my fixture used the string "v3.2" instead of the package tag `V32`; this was a fixture error, fixed in the test only.

## Known Stubs

None.

## Threat Flags

None. T-24-14 and T-24-15 are accepted as planned: rows pass the survey id from the model to `onOpenSurvey` only, and author names are rendered as plain `Text`, trimmed, with the `unknownAuthor` fallback (tested with a null and a blank author).

## Self-Check: PASSED

Commits `9054a5cf` and `758b614c` exist; the four files of `files_modified` exist.
