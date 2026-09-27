---
phase: 03-field-entry-ergonomics
batch: 2
title: FactorInput primitives (counter, segmented, chips, slider)
status: complete
---

# Batch 2 — the four FactorInput variants

## What changed

New files under `mobile/src/ui/`:

- `FactorInputShell.tsx`: shared tri-state shell (`resolveFactorInputState`) every variant renders
  inside — empty/error/complete borders, icon and label color from `brandFieldState` (batch 1).
  Error text only renders when the caller passes `state === "error"`, which every variant computes
  as `touched && Boolean(error)` — this is where FLOW-02's "never on first open" rule actually lives.
- `FactorCounterInput.tsx` (FLOW-01, C/D/E): 56pt −/+ buttons, long-press acceleration (a ref-backed
  counter loop, not closures over stale props), and a tap-to-edit fallback (the number itself opens
  a comma-accepting `TextInput`) for values a tap count would be tedious for.
- `FactorSegmentedInput.tsx` (FLOW-01, H — 0/2/5 only, BUG-2): a `radiogroup`/`radio` row, generic
  `options: {value,label}[]` so it isn't hardcoded to H.
- `FactorChipsInput.tsx` (FLOW-01, B/I/J, kept generic per the phase's instruction to reuse it for
  Phase 5's factor-A genus list): checkable chips over `AppChoiceChip`, with a derived count. The
  component owns its own selection state, initialized once from the incoming count (first N options
  pre-checked) since the domain package only ever reads the count
  (`packages/ibp-domain/src/rules/common.ts` `scoreFactorIJ`/`scoreFactorB`), never which option was
  checked — documented in the component's own doc comment, not just here.
- `FactorSliderInput.tsx` (FLOW-01, G, 5% steps): a track with drag+tap (View responder props, no
  `PanResponder` object, no new native dependency) plus explicit ±5% buttons and
  `accessibilityRole="adjustable"` with increment/decrement actions, since a field survey (gloves,
  sunlight) can't rely on fine drag gestures alone.
- `mobile/src/i18n/fr/factor-input.ts` (`fr.factorInput`): a11y copy for all four variants, plus the
  option lists — 5 strata tiers (B), the illustrative aquatic/rocky habitat categories (I/J, see
  03-CONTEXT.md for why these aren't the verbatim CNPF taxonomy), and H's recent/partial/ancient
  labels. Wired into `mobile/src/i18n/fr/index.ts` as `fr.factorInput`; `catalogue.test.ts`'s
  hardcoded top-level key list updated to include it.

Every component has its own `*.test.tsx` (react-test-renderer + minimal `react-native` mock,
following `IbpScoreBadge.test.tsx`'s pattern), covering: the empty state never showing an error,
touched-gated error display, the interaction that produces a value change, and touch marking.

None of the four variants are wired into `FactorDetailScreen` yet — that's batch 3, along with the
touched-state plumbing in `useSurveyForm`/`FactorField` these components' `touched`/`onTouch` props
need a real caller for.

## Verification

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — all green
(97 suites / 1292 tests, +19 new tests across the four component specs).
