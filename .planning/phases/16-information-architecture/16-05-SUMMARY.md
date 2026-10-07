# Batch 5 — Survey detail: one score, plus IbpFactorBars (DET-01)

`origin/main` merged first (fast-forward, no conflicts) to pick up Phase 8 (offline map) and
Phase 10 (survey export/ownership), per the cross-phase coordination note — Phase 10 added
`DetailActions.tsx`'s PDF export and `useLocalDraftSummary.ts`'s `parcel_ids`/
`observation_year`/`version_number` fields, in the same files this batch touches but a different
region (the "Actions" card at the bottom vs. the score display above it); no overlap.

## What shipped

- `DetailHeader.tsx` is unchanged: it was already the one hero display (total with its /50
  denominator, plus the peuplement/contexte sub-score pills) — the audit's "shown three times" was
  this hero plus `FactorsSection`'s own copy of the same total and the same two sub-score pills.
- `FactorsSection.tsx`: the duplicate `scoreHeroCard` (total) and `SubScorePills` removed;
  `IbpFactorBars` added above the editable factor tiles, fed by each factor's retained points.
- `useLocalDraftSummary.ts`: `DisplayedFactorResult` gains `score_points: number | null`, populated
  from the local draft's retained score (`retained[factorCode]?.score`). The canonical detail
  already carried the equivalent field (`FactorCanonical.score_points`) — only the local-draft path
  was missing it.
- Dead i18n keys (`factors.ibpTotal`/`standTotal`/`contextTotal`) and dead styles
  (`scoreHeroCard`/`Label`/`Value`/`Meta`, `factorTotalsRow`/`Pill`/`Text`) removed.

## Test notes

`FactorsSection.test.tsx`'s "totals" describe block (which asserted the now-removed total/pills)
replaced with assertions on the rendered bars; `survey-pdf-export.test.ts`'s `DisplayedFactorResult`
fixtures (added by Phase 10, sharing the same type) updated for the new required field.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` and
`npm run test:coverage:mobile` — green, after the merge and again after this batch's changes.
