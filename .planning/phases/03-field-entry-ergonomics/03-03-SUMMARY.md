---
phase: 03-field-entry-ergonomics
batch: 3
title: Touched-state tracking + wire FactorInput into FactorDetailScreen
status: complete
---

# Batch 3 — FLOW-01 wiring + FLOW-02 fix at the source

## What changed

- `mobile/src/app/types.ts`: `FactorField` gains `touched: boolean` and `onTouch: () => void`
  (both required — every builder must supply them now).
- `mobile/src/hooks/useSurveyForm.ts`: a `touchedFields: Set<string>` (keyed `"factor:label"`) and
  a `submitAttempted` flag, both reset by `resetSurveyForm`/`applyDraftToForm` (a new draft or a
  freshly opened one starts untouched). A `touchState(factor, label)` helper spreads
  `{ touched, onTouch }` into every one of the 15 field literals in `factorSections`. A new
  `markSubmitAttempted` action is exposed from the hook, threaded through
  `state/survey-form-context.ts` and `AppStateProvider.tsx` (`formActions`), for later batches to
  call from the CTA/pager. This is FLOW-02's actual fix — previously `error` was computed and shown
  unconditionally on every render, before any interaction.
- `mobile/src/screens/FactorDetailScreen.tsx`: a `FIELD_VARIANTS` table (`Record<FactorKey,
  FieldVariant[]>`) dispatches each factor's fields — by fixed position, not by label text, since
  a field's `label` is already the human-readable string in production — to a counter (C/D/E's two
  counts), segmented control (H), chips (B, I, J) or the existing numeric `AppField` (A's two fields,
  F's `trees_per_ha`, C/D/E's `surface_ha`). The remaining `AppField` numeric fields now gate their
  error the same way: `error={field.touched ? field.error : null}` and `onBlur={field.onTouch}`.
- `mobile/src/screens/survey-form/FactorsList.tsx`: `computeFactorProgress`'s `invalid` count now
  requires `field.touched && Boolean(field.error)` — an untouched, never-opened factor's tile is
  neutral (`factorTilePending`), not a warning, fixing FLOW-02 at the grid level too.
- Tests: `FactorDetailScreen.test.tsx` rewritten for the new variant dispatch (B/H no longer render
  `AppField`; C renders two counters + one numeric surface field); `FactorsList.test.tsx` gained a
  `computeFactorProgress` describe block proving an untouched invalid field doesn't count; four new
  `useSurveyForm.test.ts` cases cover touched-state tracking directly (per-field isolation,
  `markSubmitAttempted` touching every field, reset clearing it).

## Verification

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — all green
(97 suites / 1301 tests).
