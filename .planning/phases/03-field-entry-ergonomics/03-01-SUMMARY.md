---
phase: 03-field-entry-ergonomics
batch: 1
title: Design-token slice + decimal comma fix
status: complete
---

# Batch 1 — tokens + BUG-04

## What changed

- `mobile/src/app/brand-tokens.ts`: added `brandSpacing4` (the 4-grid: xxs 2, xs 4, sm 8, smd 12,
  md 16, lg 24, xl 32, xxl 48 — additive, `brandSpacing` aliases untouched), `brandFieldState`
  (empty/error/complete tri-state colors for FLOW-02), `brandInteraction` (pressedScale 0.97,
  pressedOpacity 0.9, disabledOpacity 0.4, hitTarget.min 44), `brandMapTokens` (FLOW-09 parcel
  selected/studied/neutral stroke+fill colors, on-brand and readable in sunlight).
- `mobile/src/app/number-utils.ts`: `parseFiniteNumberInput` now normalizes a decimal comma to a
  dot before parsing (BUG-04/FLOW-03) — the single choke point every numeric field goes through.
- `mobile/src/hooks/useSurveyForm.ts`: `numberError`/`oneOfError` now reuse
  `parseFiniteNumberInput` instead of a second, divergent `Number(value)` parse path, so the
  displayed error and the payload builder agree on what's valid.
- Tests: `number-utils.test.ts` gained comma-acceptance cases; `useSurveyForm.test.ts`'s
  "numberError branches" describe block now switches its `parseFiniteNumberInput` mock to the real
  implementation (it was stubbed to always return `null`, which the block's tests relied on
  `numberError` NOT depending on — true before this batch, false after) and gained a comma-specific
  case.

## Why B stays out of the slider variant (recorded here, also in 03-CONTEXT.md)

Confirmed while reading `packages/ibp-domain/src/rules/common.ts` and
`mobile/src/app/constants.ts`'s `DEFAULT_SURVEY_FORM`: factor B has had no percent field since
phase 01.8 moved native-cover capture to factor A. The slider variant (batch 2) applies to G only.

## Verification

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — all green
(93 suites / 1273 tests).
