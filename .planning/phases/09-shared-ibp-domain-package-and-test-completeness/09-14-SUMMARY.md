---
phase: 09-shared-ibp-domain-package-and-test-completeness
plan: 14
subsystem: mobile-survey-detail
tags: [ibp-method-version, ibp-cas, survey-detail, bands, i18n, component-tests]
requires:
  - "01.8-10: surveys actions updateIbpCas / updateCas3Scale / switchToV32, fr.ibpMethod"
  - "01.8-11: ibpScoreTokens.colors keyed by ScoreTone"
provides:
  - "ScoringContextEditor (survey-detail): version display, v3.0 region/stage editor, switch to v3.2, v3.2 ibp_cas chips + cas-3 scale switch"
  - "resolveScoringContext(localMeta, detail, isSubmitted)"
  - "resolveSubScoreBands(stand, context) and HeroMetric.stand / .context (band label + tone)"
  - "Detail totals read 'n / 50', sub-scores '/ 35' and '/ 15', coloured by the CNPF bands"
affects: [01.8-15, 01.8-16]
tech-stack:
  added: []
  patterns:
    - "Sub-score colours: standBand/contextBand → bandTone → ibpScoreTokens.colors[tone]; no cut-offs in the app"
    - "Totals texts built by catalogue functions from IBP_MAX, never literals in components"
key-files:
  created:
    - mobile/src/screens/survey-detail/ScoringContextEditor.tsx
    - mobile/src/screens/survey-detail/ScoringContextEditor.test.tsx
    - mobile/src/screens/survey-detail/context-editor.styles.ts
    - mobile/src/screens/survey-detail/hero-state.test.ts
    - mobile/src/screens/survey-detail/FactorsSection.test.tsx
    - mobile/src/screens/survey-detail/DetailHeader.test.tsx
  modified:
    - mobile/src/screens/SurveyDetailScreen.tsx
    - mobile/src/screens/survey-detail/SummaryTab.tsx
    - mobile/src/screens/survey-detail/summary.styles.ts
    - mobile/src/screens/survey-detail/useLocalDraftSummary.ts
    - mobile/src/screens/survey-detail/hero-state.ts
    - mobile/src/screens/survey-detail/FactorsSection.tsx
    - mobile/src/screens/survey-detail/DetailHeader.tsx
    - mobile/src/screens/survey-detail/header.styles.ts
    - mobile/src/navigation/routes/SurveyDetailRoute.tsx
    - mobile/src/i18n/fr/survey-detail.ts
decisions:
  - "A submitted survey reads its method from the server detail (fixed after submit, D-02); a draft from its local payload; each falls back to the other, then to untagged (v3.0)"
  - "SummaryTab takes the context card as a ReactNode slot, so it no longer carries region/stage/cas props"
  - "An unsupported version string shows 'Méthode IBP non reconnue' and no editing controls"
  - "The /50 total stays plain text on the detail; only the /35 and /15 sub-scores carry CNPF band colours and names"
metrics:
  duration: "~60 min"
  completed: 2026-09-26
  tasks: 2
  files: 16
---

# Phase 01.8 Plan 14: Method version and /50 totals on the survey detail Summary

The survey detail now shows each survey's IBP method. A submitted survey shows it read-only, and an untagged one reads as v3.0. Unsubmitted drafts can edit it: a v3.0 or untagged draft keeps its region/stage chips and offers "Passer en IBP v3.2", and a v3.2 draft edits its `ibp_cas` and the cas-3 scale switch. The hero and the factor section show the total as "n / 50". The P/G "/ 35" and Contexte "/ 15" sub-scores are coloured and named by their CNPF band.

## Tasks

| Task | Name | Commits | Main files |
|---|---|---|---|
| 1 | ScoringContextEditor and wiring | 9fc5715 (RED), df58877 (GREEN) | ScoringContextEditor.tsx, context-editor.styles.ts, SummaryTab.tsx, SurveyDetailScreen.tsx, SurveyDetailRoute.tsx, useLocalDraftSummary.ts, survey-detail.ts |
| 2 | /50 totals and banded sub-scores | c0b86cf (RED), 3dc584a (GREEN) | hero-state.ts, FactorsSection.tsx, DetailHeader.tsx, header.styles.ts, survey-detail.ts |

## What changed

**Context editor (`ScoringContextEditor.tsx`)**
- The card was moved out of SummaryTab and titled "Contexte et parcelles". It keeps the edit-parcels button while the survey is editable.
- A "Méthode IBP" line shows a status chip:
  - `fr.ibpMethod.versions[tag]` for a tagged survey;
  - `legacyVersionLabel` for an untagged one;
  - `summary.unknownMethod` for an unsupported tag.
- Once the survey is submitted, it also shows read-only chips (`AppStatusChip`, never pressable) and `versionLockedHint`:
  - v3.2: "Cas N", plus the cas-3 scale label when that is set;
  - v3.0: region and vegetation.
- A v3.0 or untagged draft gets:
  - region and stage `AppChoiceChip`s, which call `updateRegionVersion` / `updateVegetationStage`;
  - an `AppButton` "Passer en IBP v3.2" that calls `switchToV32(id)`, with `switchToV32Hint`.
- A v3.2 draft gets:
  - four cas chips from `IBP_CAS_VALUES`, which call `updateIbpCas(id, n)`;
  - the caption of the selected cas, or `summary.casMissing` in terracotta when `ibp_cas` is null;
  - an RN `Switch` for the cas-3 scale, which calls `updateCas3Scale(id, value)`. It has `accessibilityRole="switch"`, a label and hint from the catalogue, and `accessibilityState.checked`.
- `resolveScoringContext` normalises the raw fields. An empty or missing version gives null (untagged), a cas outside 1–4 gives null, and the flag is on only when it is `=== true`.

**Wiring**
- `useLocalDraftSummary` meta returns `ibp_method_version` (raw), `ibp_cas` and `ibp_cas3_scale`.
- `SurveyDetailScreen` memoises the scoring context and gets three new props.
- `SurveyDetailRoute` passes `actions.updateIbpCas`, `actions.updateCas3Scale` and `actions.switchToV32` directly, with no closures. `routes.test.tsx` was not edited, and navigation coverage stays at 100/98/100/100.

**Totals (D-03 amended, D-11)**
- New catalogue entries in `survey-detail.ts`:
  - `metric.total`, `metric.split`, `metric.standScore`, `metric.contextScore` and `metric.withBand`;
  - `factors.standTotal` / `contextTotal`, which now take numbers;
  - the band names in `bands.stand.*` / `bands.context.*`.
- Every maximum comes from `IBP_MAX`.
- `resolveHeroMetric` returns `value` "45 / 50" and `meta` "P/G 35 / 35 · C 10 / 15". It also returns `stand` and `context` (`text`, `bandLabel`, `tone`), or null when there are no scores.
- `DetailHeader` shows two pills for the sub-scores, coloured with `ibpScoreTokens.colors[tone]`, in place of the meta line. The hero metric card is 168 px wide at most (it was 144) so that "assez faible" fits.
- `FactorsSection` shows the total as "n / 50" and colours the P/G and Contexte pills the same way, with the band names.

## Tests

- New test suites:
  - `ScoringContextEditor.test.tsx`: 16 tests;
  - `hero-state.test.ts`: 7 tests;
  - `FactorsSection.test.tsx`: 5 tests;
  - `DetailHeader.test.tsx`: 2 tests.
- `npm --workspace mobile run test:unit:coverage`: 90 suites and 1250 tests pass, and the thresholds are met. This includes the unchanged `state/render-counts.test.tsx` and `routes.test.tsx`.
- Measured coverage (`node scripts/coverage-by-directory.js mobile`):

| Row | Measured |
|---|---|
| screens | 53/43/45/53 (floor 46/33/40/46) |
| navigation | 100/98/100/100 |
| i18n | 100/75/100/100 |

  No row was lowered. The plan asked for no threshold raise, so `jest.unit.config.js` was not touched: plan 01.8-13 runs in parallel under `screens/`.

## Verification

- The structure gates `literals`, `status-ids`, `unused-styles` and `long-files` are all at 0.
- `npm run lint` has 0 warnings. `npm run typecheck` exits 0. `npm run format:check` is clean.
- `git log -- mobile/src/navigation/routes/routes.test.tsx` shows no 01.8-14 commit.

## Deviations from Plan

1. **[Rule 1, plan text vs the package] Stand 21 is "assez forte" (high), not "moyenne" (mid).** The package's cut-offs 7/14/21/28 are lower-inclusive (assumption A1 in `bands.ts`), so 21 falls in the higher band. The tests use stand 20 for "moyenne"/mid and also assert that 21 gives "assez forte"/high. The package is the source of truth, and nothing in it changed. Commits c0b86cf and 3dc584a.
2. **New file `context-editor.styles.ts`** (not in the plan's file list). The card's styles moved with the card, as the plan's action asks. `summary.styles.ts` loses those five keys and has no unused ones left. Commit df58877.
3. **New file `DetailHeader.test.tsx`** (not in the plan's list). It covers the hero sub-score pills that `DetailHeader.tsx` renders. Commit 3dc584a.
4. **The cas-3 scale uses RN `Switch`.** The app had no existing switch component, and the one 01.8-13 may add is in a parallel plan.
5. **`AppChoiceChip` was not edited.** Its visible text ("Cas N", region and stage names) is the accessible name, and it already sets role "button" and a selected state. Editing it would touch a shared file that 01.8-13 may also edit.

## Known Stubs

None.

## Threat Flags

None. T-01.8-38 is mitigated: the editing controls render only while the survey is not submitted. The tests check that a submitted survey gets no chips, switch or button. The patcher guard and the server 409 still sit behind this.

## Self-Check: PASSED

- The files exist: ScoringContextEditor.tsx, its test, context-editor.styles.ts, hero-state.test.ts, FactorsSection.test.tsx and DetailHeader.test.tsx.
- The commits exist: 9fc5715, df58877, c0b86cf and 3dc584a.
