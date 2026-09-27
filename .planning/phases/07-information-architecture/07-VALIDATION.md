---
phase: 07-information-architecture
status: complete
completed: 2026-09-27
---

# Phase 7 — Information Architecture: Validation

All 5 ROADMAP success criteria met, across 6 batches (see `07-CONTEXT.md` and `07-0N-SUMMARY.md`).

1. **Home becomes a dashboard; Mes Relevés becomes a pure list; the duplicated draft cards merge
   into one `SurveyProgressCard`.** Home: resume hero (HOME-02), actionable alerts, a single
   `SurveyProgressCard` (batch 3). Mes Relevés: title, search, filters, a "+" in the header; the
   create and "à faire" cards removed (batch 4). `SurveyProgressCard` replaces `DraftCard` (Home's
   old carousel) and `ContinueDraftCard` (the list's old "à faire" widget) with one component
   (batch 1), used only on Home now that the list is pure.
2. **`SyncStatusPill` (offline · N à envoyer · en cours · à jour) visible in the Home and Mes
   Relevés headers, not only in Settings; a blocked/conflicted survey never reads "Soumis" in
   green.** The pill ships in batch 1, wired to real `isOnline`/`isSyncing` state in batch 2, and
   placed in both headers in batches 3-4. The status-resolution function
   (`resolveSurveyUiStatus`/`resolveSurveySyncDisplay`) already carried the not-green-when-failed
   fix from Phase 2 and was not touched; this phase's own instance of the same pattern is Home's
   alert copy (SYNC-03: a blocked survey's alert no longer reads "Vérifiez votre connexion",
   batch 3) and the list row's status chip already routing through that same resolver (unchanged,
   confirmed still correct in batch 4).
3. **Survey detail shows one score with its denominator and a peuplement/contexte split
   (`IbpFactorBars`), instead of the same number repeated three times with no scale.** `DetailHeader`
   stays the single canonical display (already had the denominator and the split as sub-score
   pills); `FactorsSection`'s duplicate total and duplicate sub-score pills removed, replaced by
   `IbpFactorBars` (horizontal bars A-J, batch 5).
4. **The survey list row shows a score or progress ring; deletion follows the iOS swipe convention
   (destructive on the right) with a confirmation and an accessible alternative.** `RowIndicator`
   (an `IbpScoreBadge` or a completion/checkmark ring) and the swipe-right delete with an
   `accessibilityActions` rotor alternative, both batch 4. The confirmation was already there
   (`confirmDeleteSurvey`'s native `Alert`) — moving the swipe direction didn't need a second one.
5. **Compte is a grouped iOS-style list (Profile, Connection, Data, About, then Sign out) instead
   of a mix of inline forms, rows and pills.** `AppGroupedList` (batch 1) drives Connexion/
   Données/À propos, with Se déconnecter isolated in red; Profile (identity + editable fields)
   stays its own card above the list — see 07-CONTEXT.md's scope decision (batch 6).

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green at every
batch. `npm run test:coverage:mobile` (the actual `unit-mobile` CI gate, stricter than the plain
unit-test run: its per-directory coverage thresholds caught a handful of newly-added,
never-invoked branches/functions at every batch) also green at phase close — 126 suites, 1515
tests.

## Known gap

No iOS/Android simulator or display in this cloud session. Visual confidence for this phase comes
from following the audit's own recommendation text closely (component shapes, copy, iOS
conventions) and from lint/typecheck/tests as correctness (not appearance) gates, per `CLAUDE.md`'s
UI-testing guidance — stated rather than claimed as verified-in-app. A first on-device look at
this phase's result is still owed before it's considered field-ready.

## Deliberate scope decisions (see `07-CONTEXT.md` for full detail)

- `SyncStatusPill`'s tap target opens Settings, not a new bottom-detail-sheet (SYNC-02's
  recommendation names one; the criterion only requires visibility outside Settings).
- The list row's score is only shown when already cached (`surveyDetails`); no bulk pre-fetch was
  added.
- Compte's "Données" section is a single row to Settings, not an inlined copy of it.
- Several audit items in the same §3.2 table are **not** part of this phase's 5 success criteria
  and were left alone: LIST-04/LIST-05 (filter chips redesign, sticky date sections), LIST-06/07/08
  (stat-tile sizing, "+N autres" link, empty-state polish), DET-02/03/05 (segmented control header,
  rename affordance, history timeline), HOME-05/06/07 (nearby-parcel tap target, clickable avatar,
  "Ma saison" gamification). None block the 5 criteria above; they remain open audit items for a
  later finishing pass (the ROADMAP's Lot 5/Phase 12 is the natural home).
