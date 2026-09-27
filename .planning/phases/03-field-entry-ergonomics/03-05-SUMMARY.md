---
phase: 03-field-entry-ergonomics
batch: 5
title: Fixed CTA bar, progress ring/gauge, visible autosave, CTA rename
status: complete
---

# Batch 5 — FLOW-05/FLOW-06/FLOW-07

## What changed

- `mobile/src/ui/FactorProgressRing.tsx`: an SVG progress ring (`react-native-svg`, already a
  dependency) that morphs into a check mark once a factor is complete, tri-state via
  `brandFieldState`. Wired into `FactorTile` (`FactorsList.tsx`), replacing the static Ionicons
  status glyph.
- `mobile/src/ui/IbpTotalGauge.tsx`: a 10-segment gauge (one bar per factor, colored by that
  factor's state) plus the score total, reusing the existing `fr.surveyForm.factors.scoreLabel`/
  `scoreTotal` catalogue text rather than duplicating it. Rendered in `SurveyFormScreen` right after
  `StepRail`, unconditionally — visible on the identity and parcels steps too, not only once the
  factors step is reached (FLOW-06's "visible from the first screen").
- `mobile/src/screens/survey-form/FixedActionBar.tsx`: replaces `FormActions` (deleted, along with
  its now-dead styles). Fixed to the bottom of `SurveyFormScreen`, outside the scrolling content,
  carrying the primary CTA and — when given an `autosaveStatus` — the visible autosave line
  ("Enregistré · 14:32", "Enregistrement…", or "Échec de l'enregistrement" in terracotta).
- `mobile/src/hooks/useEditingDraft.ts`: a new `autosaveStatus` state (`idle`/`saving`/`saved`/
  `error` + `savedAt`), set at the start and end of the debounced autosave, reset to idle when a
  create or edit session opens.
- **Narrow context, not the shared one**: `autosaveStatus` changes twice per autosave cycle
  (saving, then saved). Putting it on the existing `SurveyFormContext` would re-render every screen
  that reads that context (factor detail, parcel selection) on every autosave, undoing phase 01.9's
  targeted-re-render work. It gets its own `mobile/src/state/autosave-status-context.ts`, the same
  pattern as `nearby-parcels-context.ts` (CLAUDE.md already documents that precedent for exactly
  this reason). Verified with the phase 01.9 render-count harness
  (`mobile/src/state/render-counts.test.tsx`): only `surveyForm`'s count changes in the
  `formKeystrokeAutosave` scenario (1 → 3, the two legitimate extra renders of the one screen that
  actually shows the indicator); `factorDetail` and `parcelSelection` are unaffected.
- CTA rename (FLOW-07): "Enregistrer le brouillon" / "Enregistrer les modifications" → "Terminer la
  saisie" / "Terminer les modifications". Not renamed to "Vérifier et soumettre" as the audit's
  illustrative copy suggested — this button still only writes the local draft (submission is a
  separate, later action on the survey detail screen, out of this phase), and claiming otherwise
  would misrepresent what it does. Recorded as a scope decision in `03-CONTEXT.md`.
- `mobile/src/hooks/useSurveyForm.ts`'s `markSubmitAttempted` (added batch 3, unused until now) is
  called from `SurveyFormScreen.handlePersistSurvey`, so a factor left both untouched and invalid
  shows its error once the surveyor tries to finish, per FLOW-02's "or submission is attempted".

## Verification

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — all green
(102 suites / 1327 tests). New tests: `FactorProgressRing.test.tsx`, `IbpTotalGauge.test.tsx`,
`FixedActionBar.test.tsx`, and a new `useEditingDraft.autosaveStatus (FLOW-07)` describe block in
`useEditingDraft.autosave.test.ts`.
