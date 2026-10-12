---
phase: 27-quick-survey-additions-inserted-v1
plan: 10
subsystem: mobile-ui
tags: [doubt-flag, factor-note, score-page, community-survey, factor-annotations, accessibility]
requires:
  - phase: 27-02
    provides: "readFactorAnnotations, FactorAnnotations and CommunitySurveyDetail.factor_annotations"
  - phase: 27-03
    provides: "fr.surveyDetail.factors.doubtBadge/noteMore/noteLess (+ A11y) and a11y.openFactor/factorReadOnly"
provides:
  - "attachFactorAnnotations(entries, annotations): pure, non-mutating"
  - "DisplayedFactorResult.doubt / note and LocalDraftSummary.annotations, for drafts, submitted and community surveys"
  - "FactorNote: note clamped to 2 lines (draft row) or 3 lines with in-place Lire la suite / Réduire (read-only row)"
  - "Douteux status chip and note on FactorsList rows, with testIDs factor-doubt-badge-{A..J}, factor-note-{A..J}"
affects: [27-14, 27-16, 27-19]
tech-stack:
  added: []
  patterns: ["annotations attached to displayed factor entries after scoring, so a scorer never sees them (D-14)", "Reanimated LinearTransition with ReduceMotion.System for an in-place fold"]
key-files:
  created:
    - mobile/src/app/factor-annotations.ts
    - mobile/src/app/factor-annotations.test.ts
    - mobile/src/screens/survey-detail/FactorNote.tsx
    - mobile/src/screens/survey-detail/useSurveyDetailData.test.tsx
  modified:
    - mobile/src/screens/survey-detail/useLocalDraftSummary.ts
    - mobile/src/screens/survey-detail/useLocalDraftSummary.test.tsx
    - mobile/src/screens/survey-detail/useSurveyDetailData.ts
    - mobile/src/screens/survey-detail/FactorsList.tsx
    - mobile/src/screens/survey-detail/FactorsList.test.tsx
    - mobile/src/screens/survey-detail/score.styles.ts
    - mobile/src/screens/community-survey/view-model.ts
    - mobile/src/screens/community-survey/view-model.test.ts
key-decisions:
  - "D-13, D-14: the chip and the note sit in the row's text column; points, badge letter and tone are untouched, and tests compare them with and without a doubt"
  - "Submitted surveys read the server annotations (detail.factors), and fall back to the local payload's when the server has none"
  - "The chip is wrapped in a plain View with accessible={false} and the testID, because the status chip primitive takes no accessibility props"
requirements-completed: []
duration: 40 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 10: Doubt chip and factor note on score and community rows Summary

Every factor row of the score page (draft and submitted) and of the community survey now shows a "Douteux" chip and the factor's note when the observer set them, through one data shape and one row component, with no change to points, badge or tone.

## What was built

- `app/factor-annotations.ts`: `attachFactorAnnotations(entries, annotations)` adds `doubt: true` and/or `note` only on annotated factors, returns new entries and never mutates its input. 100 % covered.
- `useLocalDraftSummary.ts`: `DisplayedFactorResult` gains `doubt?` and `note?`; `LocalDraftSummary` gains `annotations` (empty in `EMPTY_SUMMARY`), read with `readFactorAnnotations(draft.factors)` and attached after the retained scores are computed, so scoring never sees them.
- `useSurveyDetailData.ts`: the canonical entries of a submitted survey get the annotations of `detail.factors`, else the local payload's.
- `community-survey/view-model.ts`: `toFactorEntries` attaches `readFactorAnnotations({ annotations: detail.factor_annotations })`. `CommunitySurveyScreen` already feeds `FactorsList` from it, so no screen change was needed.
- `FactorNote.tsx`: 13 pt regular note in `textSecondary`; 2 lines on a row that opens the factor, 3 lines on a read-only row, then a "Lire la suite" / "Réduire" link (accent, 44 pt minimum height, catalogue accessibility labels, `expanded` state) shown only once `onTextLayout` has reported more than 3 lines. Folds in place under `LinearTransition.duration(base).reduceMotion(ReduceMotion.System)`.
- `FactorsList.tsx`: warning status chip "Douteux" 4 pt under the title (left aligned), `FactorNote` below; row label is `a11y.openFactor` on a draft and `a11y.factorReadOnly` on a read-only row, both with the `douteux` / `avec une note` flags. A row with neither renders the same elements and the same label as before. File is 131 lines.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 3870382f | feat(27-10): carry factor doubt and note in one displayed shape |
| 2 | 0f66273f | feat(27-10): show the Douteux chip and the factor note on score rows |

## Verification

- Plan commands: task 1 and task 2 `npx jest -c jest.unit.config.js` subsets pass (including the motion, icons, catalogue-dash, abbreviations, layers, structure and fonts gates).
- `npm --workspace mobile run test:unit:coverage`: 336 suites, 4553 tests pass; `factor-annotations.ts` at 100 %, `FactorNote.tsx` 100 % lines.
- `npm --workspace mobile run lint`, `npm run typecheck` clean; `npm run format:check` reports only `.claude/settings.local.json` (a local file outside the plan).
- Docker not needed: no API or database part.

## Deviations from Plan

### Auto-fixed Issues

None needed for Rules 1 to 3. Small choices to record:

1. **Hook cases in their own test file.** `useSurveyDetailData` had no test file, so its cases went in a new `useSurveyDetailData.test.tsx` (the plan allowed `factor-annotations.test.ts` as the fallback); the `useLocalDraftSummary` cases went in its existing test file.
2. **Chip wrapper.** `AppChoiceChip variant="status"` accepts no accessibility props, so the chip sits in a `View` with `accessible={false}` and the `factor-doubt-badge-{code}` testID rather than widening the shared primitive. The wrapper style (`rowChip`) was added to `score.styles.ts` (not in the plan's file list).
3. **Test order.** The tests and the code of each task were written together and run once; no separate RED run was committed (the plan asks for no separate RED commit).

### Deferred Issues (out of scope)

None from the code. Two things to confirm on a device (plan 27-21 device checks):

- **Screen reader reach on read-only rows.** The row is one accessible element carrying the UI-SPEC label, so VoiceOver and TalkBack may not reach the "Lire la suite" link or read the note text inside it (iOS does not expose children of an accessible parent). The spec asks for exactly this structure; if the device check shows the link is unreachable, the fix is to make read-only rows with a note non-accessible as a whole so the children are read one by one.
- **`onTextLayout` with `numberOfLines`.** The link appears when `onTextLayout` reports more than 3 lines. React Native reports full lines on Android; iOS behaviour with a line clamp should be checked on the phone with a 300-character note.

## Known Stubs

None. The chip and the note are wired to real data in all three sources (local draft, submitted survey, community survey).

## Threat Flags

None. T-27-31: `readFactorAnnotations` filters the server value and the note is rendered as plain React Native `Text`. T-27-32: the chip is separate from points, badge and tone; tests assert points and badge style are equal with and without a doubt, and the data-shape tests assert points and class are equal with and without annotations. T-27-33: notes are clamped at 2 or 3 lines with in-place expand.

## Self-Check: PASSED

- Files present: `mobile/src/app/factor-annotations.ts`, `factor-annotations.test.ts`, `mobile/src/screens/survey-detail/FactorNote.tsx`, `useSurveyDetailData.test.tsx`
- Commits present in `git log`: 3870382f, 0f66273f
- Acceptance greps: `export function attachFactorAnnotations`, `doubt?: boolean` in `useLocalDraftSummary.ts`, `factor_annotations` in `view-model.ts`, `factor-doubt-badge-` and `factorReadOnly` in `FactorsList.tsx`, `export function FactorNote`; `FactorsList.tsx` is 131 lines
