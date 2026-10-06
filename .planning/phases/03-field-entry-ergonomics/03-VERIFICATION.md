---
phase: 03-field-entry-ergonomics
verified: 2026-10-06T20:00:00Z
status: passed
score: 7/7 must-haves verified (3 through rewritten criteria)
behavior_unverified: 0
overrides_applied: 1
re_verification: false
overrides:
  - truth: "Criteria 4, 5 and 6 as first written (progress ring and total gauge in the 2x5 grid, visible autosave line, nearby parcels sheet)"
    reason: "Superseded by the new-survey wizard (OA-25, OA-40, OA-98). ROADMAP criteria rewritten by the owner on 2026-10-07; no code change."
    accepted_by: owner
    accepted_at: "2026-10-07"
---

# Phase 3: Field-Entry Ergonomics Verification Report

> **Update 2026-10-07:** the owner rewrote criteria 4, 5 and 6 in `ROADMAP.md` to match the wizard that replaced the original form (see `overrides` above). The findings below describe the code as verified on 2026-10-06; the orphaned `IbpTotalGauge`, `FactorTile`, autosave context and `fr.nearbyParcelsSheet` catalogue module remain as dead code, left untouched by decision.

**Phase Goal:** Scoring a factor is a tap, not a typed number: a survey drops from about 80-90 interactions to about 35-45, with no keyboard for 80% of them.
**Verified:** 2026-10-06, branch `claude/roadmap-seeds-16a6af` (after Phase 12.1)
**Status:** gaps_found (the goal itself holds; three literal criteria were removed or left orphaned by later redesigns)
**Re-verification:** No, initial verification. Phase 3 had no PLAN.md files and `03-VALIDATION.md` is a self-report, so I checked every criterion against the current code. The code has changed heavily since 2026-09-27: the new-survey wizard (OA-25, commit `626cb81`) deleted `SurveyFormScreen`, `FixedActionBar` and `NearbyParcelsSheet`; the pager was rebuilt as a Liquid Glass letter strip (OA-98); the survey summary got its own finish bar (OA-40). I found no document in `.planning/` recording the owner's decision to drop the autosave line, the gauge or the nearby sheet (grep for the three names finds only Phase 3 and 12 summaries and the charter spec), so I report them as gaps, not as accepted deviations.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 0 | Token slice (spacing 4-grid, empty/error/complete colors, interaction states) lives in `brand-tokens.ts`; each new pattern documented in the charter in the same PR | VERIFIED | `app/brand-tokens.ts`: `brandSpacing4` (176), `brandInteraction` (339), `brandMapTokens` (349). `brandFieldState` moved to `theme.ts` (`makeFieldState`) in Phase 12 dark mode, referenced from the brand-tokens comment at 304-305, and consumed by `ui/FactorInputShell.tsx`. Charter section 11 exists (`docs/design/charte-graphique-etats-sauvages-spec.md:136`). Warning: sections 11.4 (FixedActionBar), 11.5 (IbpTotalGauge, ring in the 2x5 grid) and 11.6 (NearbyParcelsSheet) now describe deleted or orphaned components. |
| 1 | `FactorInput` in four variants (counter C/D/E, segmented H, chips B/I/J, slider G) replacing numeric keyboards | VERIFIED, with recorded scope deviations | `ui/FactorCounterInput.tsx`, `FactorSegmentedInput.tsx`, `FactorChipsInput.tsx`, `FactorSliderInput.tsx` (plus `FactorInputShell`), all dispatched by the `FIELD_VARIANTS` table in `screens/FactorDetailScreen.tsx:36-49`. Numeric keyboards remain for F, the `surface_ha` fields of C/D/E, A's second field, and the counter's tap-to-edit input (`FactorCounterInput.tsx:133`), per `03-CONTEXT.md` (A and F stay numeric, B is chips not slider). Factor A's first field is now a genus list (Phase 5/6). Component tests pass (below). |
| 2 | Error only after the field is left or a submission is attempted; empty, error, complete are distinct non-alarming states | VERIFIED | `useSurveyForm.ts` touched set and `markSubmitAttempted`; numeric `AppField` gates `error={field.touched ? field.error : null}` (`FactorDetailScreen.tsx:225`); `computeFactorProgress` requires `touched`. `useSurveyForm`, `FactorsList`, `ui/Factor*` suites pass. |
| 3 | Horizontal pager A to J with fixed footer control; a next-incomplete shortcut exists | VERIFIED (satisfied differently now) | `screens/survey-form/FactorPager.tsx` (horizontal pager) with a floating footer: `FactorLetterStrip` (A to J, each letter shows its factor state, tap or slide to jump) and a round next/"Terminer" button; hosted by `navigation/routes/FactorDetailRoute.tsx`. The dedicated footer shortcut button of batch 4 is gone and `findNextIncompleteFactorIndex` is now test-only. The shortcut exists in another form: the summary finish bar (`survey-detail/FinishBar.tsx`, `resolveFinishCta`) opens the next factor still to score ("Continuer la notation"). `FactorPager.test.tsx` and `factor-pager.test.ts` pass. |
| 4 | Fixed bottom action bar with the primary CTA; 2x5 grid ring that morphs into a check mark; segmented total gauge visible from the first screen | PARTIAL (FAILED for the ring-in-grid and gauge halves) | CTA half: `FinishBar` (summary) and the `FactorPager` bottom bar. Ring half: `FactorProgressRing` is used in `survey-list/SurveyRow.tsx:124,131` (a survey-level ring), and in `survey-form/FactorsList.tsx` `FactorTile`, which no screen renders. Gauge half: `ui/IbpTotalGauge.tsx` has no importer except its own test. See gap 2. |
| 5 | Decimal comma accepted in every remaining numeric entry; autosave visible | PARTIAL | Comma: VERIFIED. `app/number-utils.ts:7` normalises `,` to `.` in `parseFiniteNumberInput`, the shared choke point (`number-utils.test.ts`, `useSurveyForm.test.ts` pass). Autosave visible: FAILED, see gap 1. |
| 6 | Parcel map selected/studied/free colors on-brand and sunlight-readable; "Parcels near you" native sheet | PARTIAL | Colors: VERIFIED. `brandMapTokens` drives the MapLibre parcel layer (`map/maplibre/parcel-features.ts:2`, `ParcelMap.tsx`), the selection legend (`SurveyParcelSelectionScreen.tsx:47-49`) and the Explorer legend. `ParcelOverlayPolygons` no longer exists (the map was replaced by MapLibre). Sheet: FAILED, see gap 3. |

**Score:** 4/7 truths verified (criteria 0, 1, 2, 3). Criteria 4, 5, 6 are each half delivered. `behavior_unverified: 0`: no truth rests on a runtime ordering invariant that I left untested.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `mobile/src/ui/FactorCounterInput.tsx`, `FactorSegmentedInput.tsx`, `FactorChipsInput.tsx`, `FactorSliderInput.tsx`, `FactorInputShell.tsx` | Four variants plus tri-state shell | VERIFIED | Wired through `FactorDetailScreen` |
| `mobile/src/screens/survey-form/FactorPager.tsx`, `factor-pager.ts`, `FactorLetterStrip.tsx` | Pager and footer | VERIFIED | Wired through `FactorDetailRoute` |
| `mobile/src/app/number-utils.ts` | Comma parsing | VERIFIED | Used by `useSurveyForm` |
| `mobile/src/app/brand-tokens.ts` slice | Tokens | VERIFIED | See truth 0 |
| `mobile/src/ui/FactorProgressRing.tsx` | Ring that morphs to a check | WIRED, but not where the criterion put it | Only `SurveyRow` renders it |
| `mobile/src/ui/IbpTotalGauge.tsx` | Total gauge | ORPHANED | No importer |
| `mobile/src/screens/survey-form/FixedActionBar.tsx` | Fixed CTA bar with autosave line | MISSING | Deleted in `626cb81` |
| `mobile/src/screens/survey-form/NearbyParcelsSheet.tsx` | Nearby parcels sheet | MISSING | Deleted in `626cb81` |
| `mobile/src/state/autosave-status-context.ts` | Narrow autosave context | ORPHANED | Provider mounted, no consumer |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| `FactorDetailRoute` | `FactorPager` | WIRED | Passes `factorSections`, `factorRetainedScores`, `onFinish` |
| `FactorPager` | `FactorDetailScreen` pages, `FactorLetterStrip` | WIRED | Active page mounts the real screen |
| `FactorDetailScreen` | four `FactorInput` variants | WIRED | `FIELD_VARIANTS` |
| `useSurveyForm` touched state | `FactorField.touched/onTouch` | WIRED | Gates every error display |
| `useEditingDraft.autosaveStatus` | any rendered text | NOT_WIRED | Published, never read by a screen |
| `IbpTotalGauge` | any screen | NOT_WIRED | |
| `useNearbyParcelsState` | parcel selection | NOT_WIRED | Only Home reads it |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| `FactorPager` total chip | running total | `computeIbpTotalsFromRetainedScores(factorRetainedScores)` | Yes | FLOWING |
| `FactorLetterStrip` | per-factor state | `computeFactorProgress(factorSections)` | Yes | FLOWING |
| `AutosaveStatusProvider` | `autosaveStatus` | `useEditingDraft` | Yes, but unread | DISCONNECTED (consumer) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 3 components and hooks | `jest -c mobile/jest.unit.config.js` on `ui/Factor*`, `ui/IbpTotalGauge`, `screens/survey-form`, `FactorDetailScreen`, `number-utils`, `useSurveyForm`, `useEditingDraft`, `state/render-counts` | 16 suites, 179 tests pass | PASS |

The passing `IbpTotalGauge` and autosave tests prove the units work, not that any screen shows them.

### Probe Execution

No probes declared or present. Step 7c skipped.

### Requirements Coverage

`REQUIREMENTS.md` has no IDs for this phase (ROADMAP: "none yet"). Success criteria are the contract; no orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `mobile/src/ui/IbpTotalGauge.tsx` + test | n/a | Orphaned component | Warning | Dead code, criterion 4 gauge not delivered |
| `mobile/src/screens/survey-form/FactorsList.tsx` | 43, 110 | `FactorTile` and `FactorsList` exported, never rendered | Warning | Dead code (only `computeFactorProgress` is used) |
| `mobile/src/screens/survey-form/factor-pager.ts` | 9 | `findNextIncompleteFactorIndex` used only by its test | Info | Dead code |
| `mobile/src/state/autosave-status-context.ts`, `AppStateProvider.tsx` | 444 | Provider with no consumer; render-count harness still pins the cost | Warning | Wasted renders for no UI |
| `mobile/src/i18n/fr/survey-form.ts`, `nearby-parcels-sheet.ts` | 151-160 | Unused catalogue sections | Info | Dead strings |
| `docs/design/charte-graphique-etats-sauvages-spec.md` | 171-195 | Sections 11.4 to 11.6 describe deleted components | Warning | Charter says the app does what it no longer does (violates criterion 0's own rule) |

No `TBD`, `FIXME` or `XXX` in the Phase 3 component files I opened.

### Human Verification Required

None added. The gaps are observable in code. Interaction counts (80 down to 40) and sunlight legibility were measured by the owner's phone passes, which I cannot see; I verified only that the mechanisms exist.

### Gaps Summary

The phase goal (tap-first factor entry, pager, deferred errors, decimal comma, on-brand map colors) holds on today's code and is better than the original, with the Phase 12.1 redesign. Three literal criteria did not survive it: the visible autosave line, the segmented total gauge and per-factor ring, and the "Parcels near you" sheet. These look like side effects of the OA-25 wizard rewrite, which deleted the two screens hosting them, rather than recorded decisions. If the owner confirms they are intentionally dropped, record overrides, for example:

```yaml
overrides:
  - must_have: "Autosave is visible (Enregistré · 14:32) instead of implied by a Save draft label"
    reason: "Superseded by the OA-25 wizard and OA-40 summary; draft is saved without a manual step"
    accepted_by: "owner"
    accepted_at: "<ISO timestamp>"
```

then delete the dead code and fix charter sections 11.4 to 11.6. Otherwise, plan the three restorations. Group: gaps 1 and 2 share one root cause (the survey form screen was deleted); gap 3 too.

---

_Verified: 2026-10-06_
_Verifier: Claude (gsd-verifier)_
