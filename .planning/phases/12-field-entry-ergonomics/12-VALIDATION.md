---
phase: 12-field-entry-ergonomics
status: complete
created: 2026-09-27
---

# Phase 3 — Validation

Executed directly in one session, batch by batch (see `12-CONTEXT.md`); no separate
orchestrator/executor plan files. `npm run lint && npm run typecheck && npm run test:unit &&
npm run format:check` ran after every batch and is green at the end of each — see each
`03-0N-SUMMARY.md`'s own Verification section for the exact suite/test counts at that point.

## Test infrastructure

Mobile: Jest 29 + ts-jest, `@testing-library/react-native` for hooks, `react-test-renderer` +
hand-mocked `react-native` for UI components (existing repo convention, `IbpScoreBadge.test.tsx`/
`FactorsList.test.tsx` as the reference pattern). `npm --workspace mobile run test:unit -- <path>`
for a targeted run.

## Success criteria → evidence

| # | Criterion | Evidence |
|---|-----------|----------|
| 0 | Token slice in `brand-tokens.ts`; every new pattern documented in the charter spec in the same PR | `brandSpacing4`/`brandFieldState`/`brandInteraction`/`brandMapTokens` (batch 1); charter spec §11 (batch 7), same PR (#169) as the components |
| 1 | `FactorInput` in four variants, replacing `keyboardType="numeric"` per the assigned factors | `FactorCounterInput`/`FactorSegmentedInput`/`FactorChipsInput`/`FactorSliderInput` (batch 2), wired into `FactorDetailScreen`'s `FIELD_VARIANTS` table (batch 3); each has its own test file |
| 2 | Error only after touch or submission attempt; three distinct, non-alarming states | `useSurveyForm` touched-state tracking + `markSubmitAttempted` (batch 3); `FactorInputShell.resolveFactorInputState`; `FactorsList.computeFactorProgress`'s `invalid` now requires `touched`; `useSurveyForm.test.ts` "touched-state tracking (FLOW-02)" and `FactorsList.test.tsx` "computeFactorProgress" describe blocks |
| 3 | Horizontal pager A→J, fixed footer control, next-incomplete shortcut | `FactorPager.tsx` + `factor-pager.ts` (batch 4); `FactorPager.test.tsx`, `factor-pager.test.ts` |
| 4 | Fixed bottom CTA; per-factor progress ring → check mark; segmented total gauge from the first screen | `FixedActionBar.tsx`, `FactorProgressRing.tsx`, `IbpTotalGauge.tsx` (batch 5), the last rendered unconditionally in `SurveyFormScreen` (all three wizard steps); each has its own test file |
| 5 | Decimal comma accepted everywhere remaining; autosave visible | `number-utils.ts`/`useSurveyForm.ts` comma fix (batch 1, `number-utils.test.ts` + `useSurveyForm.test.ts` comma cases); `useEditingDraft.autosaveStatus` + `FixedActionBar`'s autosave line + narrow `autosave-status-context.ts` (batch 5); `useEditingDraft.autosave.test.ts` "autosaveStatus (FLOW-07)" block; render-count harness re-pinned with a documented, bounded justification |
| 6 | Map colors on-brand/sunlight-readable; "Parcels near you" sheet | `ParcelOverlayPolygons.tsx` on `brandMapTokens` + `ParcelOverlayPolygons.test.tsx`; `NearbyParcelsSheet.tsx` + its test (batch 6) |

## Scope decisions requiring judgment (recorded in `12-CONTEXT.md`, repeated here for visibility)

- Factor A stays numeric (deferred to Phase 5's genus-list rebuild); Factor F stays numeric (no
  natural discrete variant for a continuous rate, no assigned variant in the criteria text).
- Factor B is chips (strata tiers), not slider — B has had no percent field since phase 01.8 moved
  native-cover capture to factor A; the slider applies to G, the one remaining percent field.
- I/J chip labels are illustrative field categories (the domain only stores a derived count; the
  CNPF taxonomy PDF isn't redistributed in this repo).
- The factors-step CTA is not renamed to "Vérifier et soumettre" — it still only writes the local
  draft; renamed to "Terminer la saisie"/"Terminer les modifications" instead, paired with the
  visible autosave line, matching what the criterion actually requires (stop implying a manual save
  is needed) without misrepresenting a submit step that doesn't exist in this phase.

## Regression check

The phase 01.9 render-count harness (`mobile/src/state/render-counts.test.tsx`, D-02) is still
green. One number changed deliberately: `formKeystrokeAutosave.surveyForm` 1 → 3, because the new
visible-autosave feature inherently needs two extra renders of the one screen that shows it
(saving, then saved). This is isolated via a narrow context (`autosave-status-context.ts`, same
pattern as phase 01.9's `nearby-parcels-context.ts`) — every other scenario and every other screen's
count is unchanged, confirmed by the harness itself.

## Not done in this phase (explicitly out of scope, see `12-CONTEXT.md`)

FLOW-08 (surface_ha entered once instead of three times), FLOW-11 (delete the dead
`ParcelMapModal`), FLOW-12 (help-sheet copy/typography), and FLOW-10's locate-button/offline-notice
sub-points — none are in this phase's success criteria.
