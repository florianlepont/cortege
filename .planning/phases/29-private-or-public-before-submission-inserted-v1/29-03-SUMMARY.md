---
phase: 29-private-or-public-before-submission-inserted-v1
plan: 03
subsystem: ui
tags: [react-native, i18n, accessibility, radio-group, visibility]
status: complete

requires:
  - phase: 29-private-or-public-before-submission-inserted-v1
    provides: plan 29-02 storage (visibility stored on the draft, shared by default, frozen after submit)
provides:
  - fr.surveyFinish catalogue module (17 keys) and fr.surveyDetail.visibility / a11y.visibilityLine
  - app/visibility-display.ts, the only UI reader of the wire value "public"
  - ui/RadioCard (extracted from CasPicker) and ui/VisibilityPicker (radio group)
  - screens/survey-detail/visibility-line.ts and the SummaryHeader visibilityLine prop
affects: [29-07 finish sheet, 29-08 summary wiring, 29-10 device gate]

tech-stack:
  added: []
  patterns:
    - "One mapper from the wire value to catalogue keys and glyphs (visibility-display.ts)"
    - "RadioCard shared by CasPicker and VisibilityPicker"

key-files:
  created:
    - mobile/src/i18n/fr/survey-finish.ts
    - mobile/src/i18n/fr/catalogue-additions-29.test.ts
    - mobile/src/app/visibility-display.ts
    - mobile/src/app/visibility-display.test.ts
    - mobile/src/ui/RadioCard.tsx
    - mobile/src/ui/RadioCard.test.tsx
    - mobile/src/ui/VisibilityPicker.tsx
    - mobile/src/ui/VisibilityPicker.test.tsx
    - mobile/src/screens/survey-detail/visibility-line.ts
    - mobile/src/screens/survey-detail/visibility-line.test.ts
  modified:
    - mobile/src/i18n/fr/survey-detail.ts
    - mobile/src/i18n/fr/index.ts
    - mobile/src/i18n/catalogue.test.ts
    - mobile/src/ui/CasPicker.tsx
    - mobile/src/app/visual-tokens.test.ts
    - mobile/src/screens/survey-detail/SummaryHeader.tsx
    - mobile/src/screens/survey-detail/SummaryHeader.test.tsx

key-decisions:
  - "surveyFinish.cancel and .close reference commonFr.actions (common.ts has no imports, so no cycle); confirm stays a literal pinned equal to surveyDetail.cta.finish by a test"
  - "The visibility line uses marginTop -4 so its visual gap under the status line is 4 (the title block already spaces children by 8)"
  - "An unknown visibility value fails closed to private in visibilityKey"

patterns-established:
  - "Spoken phrase of the visibility line: visible text with its trailing parenthesis removed by a regex and first letter lower-cased, no French literal in code"

requirements-completed: [REQ-C-privacy-choice]

coverage:
  - id: D1
    description: "Finish sheet and summary-line strings exist exactly as the UI-SPEC says, never say public, no U+2014"
    requirement: REQ-C-privacy-choice
    verification:
      - kind: unit
        ref: "mobile/src/i18n/fr/catalogue-additions-29.test.ts"
        status: pass
    human_judgment: true
    rationale: "The owner validates the wording at the device gate (29-10)"
  - id: D2
    description: "Wire value to catalogue key, label, caption and glyph mapper"
    requirement: REQ-C-privacy-choice
    verification:
      - kind: unit
        ref: "mobile/src/app/visibility-display.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "RadioCard extracted from CasPicker (CasPicker test unchanged) and VisibilityPicker radio group with selection haptic on change only, contrast pairs in both schemes"
    requirement: REQ-C-privacy-choice
    verification:
      - kind: unit
        ref: "mobile/src/ui/RadioCard.test.tsx, VisibilityPicker.test.tsx, CasPicker.test.tsx, app/visual-tokens.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Read-only visibility line resolver and SummaryHeader prop"
    requirement: REQ-C-privacy-choice
    verification:
      - kind: unit
        ref: "mobile/src/screens/survey-detail/visibility-line.test.ts, SummaryHeader.test.tsx"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-10-13
---

# Phase 29 Plan 03: Visibility UI building blocks Summary

**Catalogue, wire-value mapper, shared RadioCard, VisibilityPicker radio group and a read-only visibility line on the summary header, with no navigation yet.**

## Performance

- **Tasks:** 3/3
- **Files:** 10 created, 7 modified

## Accomplishments

- `fr.surveyFinish` (17 keys) and the five summary-line keys, pinned by `catalogue-additions-29.test.ts`, which also forbids the word "public" and U+2014 in every phase string.
- `app/visibility-display.ts`: `visibilityKey`, `visibilityLabel`, `visibilityCaption`, `visibilityIcon`, the only UI-layer reader of `"public"`; glyphs are `people-outline` and `lock-closed-outline`, never a globe.
- `RadioCard` extracted from `CasPicker` (`CasPicker.test.tsx` untouched and green), with an optional decorative glyph and a `disabled` state that does not dim.
- `VisibilityPicker`: radio group, shared first then private, `visibility-option-shared` and `visibility-option-private` test ids, selection haptic only on a change of value, locked when disabled.
- Contrast pairs for the radio cards added to `visual-tokens.test.ts` (both schemes, all passing without any token change).
- `resolveVisibilityLine` and `SummaryHeader.visibilityLine` (testID `summary-visibility-line`, one `accessible` element, role `text`, no handler); `SummaryHeader.tsx` is 184 lines. `SurveyDetailScreen` is untouched (plan 29-08 passes the prop).

## Task Commits

1. Task 1, catalogue and mapper: `66c26299`
2. Task 2, RadioCard and VisibilityPicker: `d0f0cc31`
3. Task 3, visibility line: `f2941583`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Registered the new catalogue section in the section-list test**
- **Found during:** Task 1
- **Issue:** `mobile/src/i18n/catalogue.test.ts` pins the exact list of `fr` sections, so adding `surveyFinish` failed it.
- **Fix:** added `"surveyFinish"` to the expected list.
- **Files modified:** `mobile/src/i18n/catalogue.test.ts`
- **Commit:** `66c26299`

**2. [Plan intent] Visibility line spacing**
- The plan says margin top `brandSpacing4.xs`; the title block already has a gap of 8, which would give 12 while UI-SPEC asks for 4. The line uses `marginTop: -brandSpacing4.xs` so the visual gap is 4.

**3. [Minor] Unused style removed from CasPicker**
- `title` style moved into `RadioCard`; the now-unused key was dropped from `CasPicker` (unused style keys are a gate).

Otherwise the plan executed as written. Tests were written in the same step as the code rather than strictly before it.

## Known Stubs

None. The `visibilityLine` prop is intentionally unused until plan 29-08 passes it from `SurveyDetailScreen`.

## Verification

- Full mobile unit suite: 405 suites, 5921 tests pass (includes `__checks__` gates and contrast tests).
- `npm run lint`, `npm run typecheck` exit 0; `prettier --check` clean on the changed files.

## Self-Check: PASSED

All created files exist; commits `66c26299`, `d0f0cc31`, `f2941583` are in the log.
