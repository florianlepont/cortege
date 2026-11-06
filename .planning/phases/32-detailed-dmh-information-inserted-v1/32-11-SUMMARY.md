---
phase: 32-detailed-dmh-information-inserted-v1
plan: 11
subsystem: mobile-factor-f-list
tags: [dmh, factor-f, list, stepper, accessibility, offline-first]
requires: ["32-03", "32-06", "32-10"]
provides:
  - fr.factorDetail.dmhList (entry, forms, badge, sectionA11y, summaries, treesCaption, lockedUntick, a11y)
  - countFromText (shared count parser)
  - AppCollapsibleSection optional testID and accessibilityLabel
  - DmhGroupRow (memo) and DmhGroupList, type DmhListCounting
  - createDmhListStyles(theme)
  - DMH_STEPPER_SIZE = 48 with the O-32-1 comment
affects: [32-12, 32-14]
key-files:
  created:
    - mobile/src/screens/factor-detail/count-from-text.ts
    - mobile/src/screens/factor-detail/count-from-text.test.ts
    - mobile/src/ui/AppCollapsibleSection.test.tsx
    - mobile/src/screens/factor-detail/dmh-group-list.styles.ts
    - mobile/src/screens/factor-detail/DmhGroupRow.tsx
    - mobile/src/screens/factor-detail/DmhGroupRow.test.tsx
    - mobile/src/screens/factor-detail/DmhGroupList.tsx
    - mobile/src/screens/factor-detail/DmhGroupList.test.tsx
  modified:
    - mobile/src/i18n/fr/factor-detail.ts
    - mobile/src/ui/AppCollapsibleSection.tsx
    - mobile/src/ui/DmhCounterStepper.tsx
    - mobile/src/ui/DmhCounterStepper.test.tsx
decisions:
  - "O-32-1: 48 pt kept (decided at plan 32-09). DMH_STEPPER_SIZE stays 48; its comment now names the decision, and the row's + reads the same constant."
  - "The sections hold the rows in a glass AppCard with padding 0 inside AppCollapsibleSection's own padded body, as the UI-SPEC says (body = one glass card)."
metrics:
  tasks: 3
  completed: 2026-10-27
status: complete
---

# Phase 32 Plan 11: The F group list (rows, sections, ordering at mount) Summary

The factor F group list of 32-UI-SPEC S1 exists as prop-driven components: `DmhGroupRow` (memoised check zone, separate info glyph, "+" or stepper, locked untick caption) and `DmhGroupList` (heading, guide entry, summary line, seven form sections ordered once at mount), fully tested; they are not mounted in the F page yet (plan 32-14).

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | dmhList strings, countFromText, AppCollapsibleSection testID and label | 4f5976d1 |
| 2 | DmhGroupRow, styles, DMH_STEPPER_SIZE comment (O-32-1) | 1409f473 |
| 3 | DmhGroupList, entry row label | db8db3f8 |

## What was built

- `fr.factorDetail.dmhList`: strings verbatim from section 8.1 of the validated spec (entry, seven short form titles, badge, sectionA11y with the singular, summaries, `treesCaption`, `lockedUntick`, `a11y.*`). The 32-03 stepper strings are unchanged (the gate changed none).
- `countFromText`: same rules as the old counter path (NaN for empty, round, clamp at 0). `DmhCountFields` keeps its own copy until 32-14.
- `AppCollapsibleSection`: optional `testID` and `accessibilityLabel` on the header; default label unchanged, `SettingsScreen` untouched and passing. It had no test of its own; one was added.
- `DmhGroupRow`: `React.memo`. Capped mode: tick only. Full mode: unticked row has "+" (`dmh-add-{code}`, `DMH_STEPPER_SIZE` square, ticks and counts 1 through `onAdd`); ticked or counted row has the stepper on line 2 (fade in, `LinearTransition`, `ReduceMotion.System`). Untick rule O-32-3: a counted ticked group shows `lockedUntick` for 4 s (live region, `announceForAccessibility` on iOS), changes nothing, timer cleared on unmount and restarted on a second tap. Haptic `feedback.selection()` on a tick toggle and the first "+", none on the stepper. The info glyph is its own 44 pt target, never toggles and stays enabled when read-only. Check zone is a `checkbox` with `, n arbres` when counted in full mode and the locked hint.
- `DmhGroupList`: sections from `useState(() => orderDmhRows(...))`, computed once. Ticks go through `withSelectionToggled("F", ...)` (option order kept), counts through `DmhListCounting` (`onBump`, `onSetCount`, NaN for an emptied field). Handlers are `useLatestCallback`, so memoised rows keep identical props across selection changes. The guide entry (`dmh-guide-entry`) calls `onOpenDmhGuide()` with no argument, a row info glyph calls it with the code; both work read-only.

## Verification

- `npm --workspace mobile run test:unit -- src/screens/factor-detail src/__checks__ src/i18n src/ui`: 84 suites, 897 tests passed (includes the gates: motion, icons, dash, abbreviations, structure with no unused style key and the 400-line cap).
- `npm --workspace mobile run typecheck`: clean.
- `npx eslint` on `src/screens/factor-detail`, `AppCollapsibleSection.tsx`, `DmhCounterStepper.tsx`, `i18n/fr/factor-detail.ts`: clean.
- `npx prettier --check` on every touched file: clean.
- No hex or `rgba(` in the row, list or styles files; no U+2014 in any touched file; `DmhGroupList.tsx` 172 lines, `DmhGroupRow.tsx` 187 lines; `grep -c "useState(() => orderDmhRows"` prints 1; `grep -c "settles 48 or 56"` prints 0.
- The `console.error` "react-test-renderer is deprecated" noise in the run comes from `OfflineMapPrompt.test.tsx` (not touched here).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] A spoken label for the guide entry needed a catalogue string**
- **Found during:** Task 3
- **Issue:** the entry row's accessibility label was a template of two catalogue strings in JSX; the D-06 literal gate (`structure.test.ts`) refuses it.
- **Fix:** added `dmhList.entry.label` ("Guide des dendromicrohabitats. Reconnaître chaque groupe, sans réseau.") to the catalogue.
- **Files modified:** `mobile/src/i18n/fr/factor-detail.ts`, `DmhGroupList.tsx`
- **Commit:** db8db3f8

### Other notes

- To keep each commit green under the unused-style-key gate, Task 2 committed the styles file with the row keys only and Task 3 added the list keys (heading, helper, entry*, summary, sections, sectionCard, separator).
- The method-version label test of the plan's idea (`dmh_06` worded differently in v3.0) does not apply here: `selectionLabel("F", ...)` returns the same label in both versions; the test checks the list uses `selectionLabel` of the survey method.

## Owner decisions applied

- O-32-1: 48 (DMH_STEPPER_SIZE unchanged, comment: "O-32-1: 48 pt, validated by the owner at plan 32-09 on 2026-10-27"); the "+" and the stepper buttons share the constant.
- O-32-2 (short form names on the list), O-32-3 (locked untick), O-32-4 (all sections open when nothing is ticked, else only those with a tick), O-32-11 (summary line shown), O-32-12 (ticked or counted first, then IBP order): applied as written in the validated spec. No "PHASE REPLAN NEEDED".

## Known Stubs

None. The components are intentionally not mounted in the F page yet; plan 32-14 does that.

## Self-Check: PASSED

- Created files exist (checked by the test and lint runs above) and commits 4f5976d1, 1409f473, db8db3f8 are in the branch history.
