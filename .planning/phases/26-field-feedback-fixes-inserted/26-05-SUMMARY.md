---
phase: 26-field-feedback-fixes-inserted
plan: 05
subsystem: mobile-screens
tags: [parcel-selection, small-screens, layout-budget, compact-card]
status: complete

requires:
  - phase: 26-field-feedback-fixes-inserted
    provides: decision D-08 from CONTEXT, research "Small screens (D-08)"
provides:
  - screens/parcel-selection/layout-budget.ts: COMPACT_HEIGHT_THRESHOLD, PARCEL_CARD_COMPACT, MAP_CONTROLS_ROW, ParcelBudgetDevice, PARCEL_BUDGET_DEVICES, isCompactParcelCard, compactParcelCardHeight, parcelMapShare
  - screens/parcel-selection/ParcelSelectionCard.tsx: ParcelSelectionCard (full and compact), ParcelSelectionCardProps
  - fr.parcelSelection.compact.selectionRequired
affects: [26-10]

tech-stack:
  added: []
  patterns:
    - "Pure layout budget summing the constants the compact styles read, like Accueil's; the compact switch reads useWindowDimensions (height, fontScale), never the measured card height"

key-files:
  created:
    - mobile/src/screens/parcel-selection/layout-budget.ts
    - mobile/src/screens/parcel-selection/layout-budget.test.ts
    - mobile/src/screens/parcel-selection/ParcelSelectionCard.tsx
    - mobile/src/screens/parcel-selection/ParcelSelectionCard.test.tsx
  modified:
    - mobile/src/screens/SurveyParcelSelectionScreen.tsx
    - mobile/src/i18n/fr/parcel-selection.ts

key-decisions:
  - "Decision D-08: below a window height of 700 (divided by max(1, fontScale)) the card is compact: one-line headline title, one meta line of at most two lines carrying the selection requirement, padding 12, 50 pt button kept"
  - "On the iPhone SE 375 x 667 and the 360 x 640 dp Android the compact card (148 pt with two meta lines), its bottom inset and the 56 pt controls row leave 0.55 and 0.54 of the map area (asserted at least 0.5)"
  - "The danger notice and tap hint are dropped in compact mode; the requirement text is the meta line with an alert-circle-outline icon in the danger ink; the wizard button stays disabled without a parcel in both modes (T-26-12)"
  - "The screen's styles became a module-level StyleSheet since the card styles moved out and no theme value is left in them"

requirements-completed: [D-08]

metrics:
  duration: 25min
  tasks: 2
  files: 6
  completed: 2026-10-10
---

# Phase 26 Plan 05: Compact parcel-selection card Summary

**Parcel-selection card extracted to its own component with a compact variant below a 700 window height (font-scale adjusted), backed by a pure tested layout budget keeping at least half of the map on the smallest supported phones.**

## Performance

- **Tasks:** 2/2
- **Files:** 6 (4 created, 2 modified)
- Coverage run (`npm --workspace mobile run test:unit:coverage`): 323 suites, 4317 tests pass, floors hold; `screens/parcel-selection` at 100 % on all four columns.

## Accomplishments

- `layout-budget.ts`: threshold 700, compact constants read from brand tokens, device list (SE 667, Android 640 dp, iPhone 852), `isCompactParcelCard`, `compactParcelCardHeight` (130 / 148), `parcelMapShare`.
- `ParcelSelectionCard.tsx`: the full card moved unchanged; the compact variant uses `PARCEL_CARD_COMPACT` for padding, gap and line heights.
- `SurveyParcelSelectionScreen.tsx` drops from 392 to 347 lines (cap 400), computes `isCompactParcelCard(height, fontScale)` from `useWindowDimensions` and keeps the `onLayout` card height for placing the controls.

## Task Commits

1. Task 1: pure layout budget - `c805bc67`
2. Task 2: extract the card, compact variant, window switch - `7b79b109`

## Deviations from Plan

None in the delivered code. One process slip, fixed: an early scripted edit of `SurveyParcelSelectionScreen.tsx` was run against the main checkout (`/Users/florian/Projects/cortege`) instead of the worktree. The result was copied into the worktree and the main checkout's file was restored with `git checkout -- <that file>`; main's working tree is clean of it again (main's HEAD blob of the file was verified identical to the worktree's base, and it was the only tracked modification there).

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. T-26-12 mitigated: `disabled={saving || (wizard && !hasSelection)}` is shared by both modes and tested for both.

## Open Items

- Real heights and text wrapping are measured on the iPhone SE simulator and a 360 x 640 dp emulator in plan 26-10 (device list values are token arithmetic until then).

## Self-Check: PASSED

- Files exist: layout-budget.ts, layout-budget.test.ts, ParcelSelectionCard.tsx, ParcelSelectionCard.test.tsx
- Commits exist: c805bc67, 7b79b109
- lint, typecheck, format:check clean (only the untracked `.claude/settings.local.json` is reported by format:check)
