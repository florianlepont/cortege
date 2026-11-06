---
phase: 32
plan: 18a
subsystem: mobile-ui
tags: [redesign, f-group-list, grouped-list, stepper, contrast]
status: complete
requires: [32-REDESIGN-BRIEF.md section A, owner decisions of 2026-10-28]
provides: [AppGroupedContainer, AppCollapsibleSection grouped variant, SelectionCircle, visual.control.fill]
key-files:
  created:
    - mobile/src/ui/SelectionCircle.tsx
    - mobile/src/ui/SelectionCircle.test.tsx
  modified:
    - mobile/src/ui/AppGroupedList.tsx
    - mobile/src/ui/AppCollapsibleSection.tsx
    - mobile/src/ui/DmhCounterStepper.tsx
    - mobile/src/app/theme-visual.ts
    - mobile/src/app/visual-tokens.test.ts
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/factor-detail/DmhGroupList.tsx
    - mobile/src/screens/factor-detail/DmhGroupRow.tsx
    - mobile/src/screens/factor-detail/dmh-group-list.styles.ts
    - mobile/src/screens/factor-detail/renderFactorField.tsx
commits: [698ef976, d9e57778, adfc60eb]
---

# Phase 32 Plan 18a: F group list redesign (brief section A) Summary

The F group list now reads as an iOS inset grouped list: one container level straight on the canvas, grouped section headers, a selection circle, an info button in a readable ink and a single-capsule stepper. Stored payload, package, API, SQLite and parity are untouched.

## What changed

- **A-C1** `FactorDetailScreen` draws `DmhGroupList` after the input card (F only). `fieldVariantsFor("F")` keeps `companion: "F"`; `renderFactorField` no longer emits the list, the screen calls `renderDmhGroupList`. The card keeps `trees_per_ha`, the counting caption and, counted in full, the surface field, which now sits above the list (owner decision 7). The guide entry card and the per-section card are gone.
- **A-C2** `AppCollapsibleSection variant="grouped"` (default `"boxed"`, Settings unchanged): no border or clipping, Sora 13 title in `textSecondary`, the count as plain meta text, `chevron-forward-outline` 16 turning 0 to 90 degrees, 44 pt header, pressed opacity 0.6. `testID`, `accessibilityState.expanded`, `sectionA11y` and `defaultExpanded` (from `orderDmhRows`) kept.
- **A-C3** `ui/SelectionCircle.tsx`: 24 pt circle, 1.5 pt ring in `colors.inputBorder`, ticked fill `ctaPrimary` with an outline check in `onCtaPrimary`; the check settles 0.85 to 1 on `springs.snappy` with `ReduceMotion.System`, not at mount.
- **A-C4** Stepper and add glyphs use `semanticColors.ctaPrimary`; the info glyph uses `visual.accentText`. New pairs in `visual-tokens.test.ts` (both schemes), including assertions that the old pairs failed.
- **A-I1** `AppGroupedContainer` exported from `AppGroupedList.tsx` (glass card, radius 22, clipped, hairlines; `dividerInset` as a number or a function of the index). `AppGroupedList` itself uses it with its per-row icon inset, so Settings renders as before. F rows use inset 52.
- **A-I2** `DmhGroupRow`: check zone (circle 24, 12 gap, label in `heroBody`, wraps, never truncated) with a `surfaceSoft` pressed fill and no ripple, a 44 x 44 info button (glyph 22), the add control in full mode when unticked; line 2 ("Arbres" meta caption, count and capsule) indented 52. All testIDs kept.
- **A-I3** `DmhCounterStepper`: plain count (title3 Sora-SemiBold, min 44 x 48, tap opens the field, 2 pt underline while editing) then one 112 x 48 pill capsule in `visual.control.fill`, two 56 x 48 segments, a 1 x 24 divider, pressed half in `surfaceSoft`, disabled "-" dims the glyph only. `useHoldRepeat`, the adjustable accessibility element and the bounds are unchanged. `feedback.selection()` on each single press in of "-" or "+" (not on repeats, not on "-" at 0). The add control is a 48 pt target holding a 36 pt disc in the same fill.
- **A-I4** Heading keeps 17/22 Sora-SemiBold; the guide entry is a one-row `AppGroupedList` section (tile `book-outline`, title, `t.entry.caption` as the new NavRow `subtitle`, chevron), `testID="dmh-guide-entry"`.
- **B-I2 primitive** `NavRow` gains `subtitle?`, `labelLines?` (default 1, `multiline` still 2, `labelLines` wins) and `testID?`.
- **Token** `visual.control.fill` in `theme-visual.ts`: `textPrimary` at 7% in light, white at 10% in dark (owner approved).

## Deviations from the brief

1. **Summary line placement (A-I4).** The brief says put `dmh-summary` at the right end of the heading row, or under the helper if it wraps at 375 pt. Both headings ("Arbres par groupe de dendromicrohabitats", "Groupes de dendromicrohabitats observés (facultatif)") are far wider than a 375 pt row at 17 pt, so it would always wrap; I put it under the helper in the heading block (meta style) without measuring on a device.
2. **Guide entry** uses `AppGroupedList` with one section (the shared NavRow with the new `subtitle`), not a hand-built row inside `AppGroupedContainer`. Same look; row minimum height is the NavRow's 48 (two-line content makes it about 62), not 56.
3. **Section spacing** is 16 between sections as the brief says, plus the 44 pt header, so the page is slightly longer than before; not checked on a device.
4. The `extras` parameter of `renderFactorField` was removed (it had no remaining use); the list is built by the exported `renderDmhGroupList`.

## Verification

- `npm --workspace mobile run test:unit`: 477 suites, 7469 tests passed (includes the structure, motion, icons, catalogue-dash and abbreviations gates, and `dmh-entry-cost.test.tsx` with the same press counts: S1 tie 8, S2 26 against 29).
- `tsc --noEmit` for mobile: clean. ESLint on `src/screens`, `src/ui`, `src/app`: clean. Prettier on touched files: clean.

## Not seen on a device

I could not run the app. What the owner should check:

- Dark mode: ring, ticked circle, capsule fill (white 10%) and glyphs on the glass card.
- The info button and the add disc both fit beside a long label at 375 pt (label wraps instead of truncating).
- The capsule feels like one control; the pressed half and the stepper haptic tick on each single tap.
- Hairlines start under the label (inset 52); the pressed fill of the check zone reaches the container's left edge.
- The grouped section header (44 pt with sentence case) and the page length, with the summary under the helper.
- The surface field now sits above the list in the counting mode, next to trees per hectare.

## Notes for other work

- `FactorCounterInput` has the same contrast problems as the old stepper (`colors.forest` glyph, 1.97:1 in dark); not part of this task. `AbbreviationInfo` and `GlossaryInfo` use the moss accent too (brief A-C4 ticket).
- `32-UI-SPEC.md` still describes the old checkbox, stepper and list frames (Color table, S1.3); the spec sync listed in the brief is not done here.
- The drawing-plate contrast pairs are in `mobile/src/ui/DmhDrawing.contrast.test.ts` (plan 32-18c), not in `visual-tokens.test.ts`.

## Self-Check: PASSED

Commits 698ef976, d9e57778 and adfc60eb exist; created and modified files exist.
