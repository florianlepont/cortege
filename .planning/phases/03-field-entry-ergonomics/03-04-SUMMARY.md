---
phase: 03-field-entry-ergonomics
batch: 4
title: Horizontal factor pager with fixed footer control
status: complete
---

# Batch 4 — FLOW-04

## What changed

- `mobile/src/screens/survey-form/factor-pager.ts`: `findNextIncompleteFactorIndex`, a pure
  forward-searching, wrap-around helper (its own test file) — the "next incomplete factor" shortcut.
- `mobile/src/screens/survey-form/FactorPager.tsx`: a horizontal `ScrollView` (`pagingEnabled`, no
  new native dependency) hosting all ten factors, with a fixed footer: per-factor tone dots (jump to
  any factor), prev/next chevrons, a "Facteur N/10" position label, and the next-incomplete shortcut
  button (disabled once nothing else needs attention). Only the active page mounts a real
  `FactorDetailScreen` — the other nine are empty same-width `ScrollView`s, so ten factors' worth of
  hint-panel state and validation don't all run at once for something the surveyor never sees.
- `mobile/src/navigation/routes/FactorDetailRoute.tsx`: now renders `FactorPager` instead of a bare
  `FactorDetailScreen` in a `ScrollView`. Route params are unchanged (`{ factor }` still selects the
  initial page), so no navigation-type changes were needed.
- `mobile/src/navigation/styles.ts`: dropped `mainScroll`/`content`, the two style keys that route
  used and nothing else did (caught by the D-04 unused-style-key structure gate).
- Test fixes for the wider blast radius: `routes.test.tsx`'s minimal `react-native` mock needed
  `Platform.select` (used by `app/constants.ts`, now reachable through `FactorPager`) and
  `Pressable`/`Text` (the pager's footer chrome), and its `factorSections`/`factorRetainedScores`
  fixtures needed real entries for all ten factors, not just the one factor under test, since
  `FactorPager` computes progress across every factor to drive the footer dots.

## Verification

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — all green
(99 suites / 1312 tests).
