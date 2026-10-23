---
phase: 30-route-choice-assistant-inserted-v1
plan: 19
subsystem: mobile-factor-screens
tags: [uncapped-entry, factor-detail, strata-cover, dmh-counts, pdf, d-07]
requires: [30-12, 30-15]
provides:
  - "StrataCoverFields (mobile/src/screens/factor-detail/StrataCoverFields.tsx): B cover per stratum, five percent fields"
  - "DmhCountFields (mobile/src/screens/factor-detail/DmhCountFields.tsx): F counter per group and F's own surface"
  - "UncappedFieldBlock and UncappedEntryProps (mobile/src/screens/factor-detail/UncappedFieldBlock.tsx): the one prop object and the per-factor choice of block"
  - "uncappedEntry prop through FactorDetailRoute, FactorPager and FactorDetailScreen"
  - "PDF factor cards print B cover per stratum and F counts per group with F's surface"
affects: [30-20]
key-files:
  created:
    - mobile/src/screens/factor-detail/StrataCoverFields.tsx
    - mobile/src/screens/factor-detail/StrataCoverFields.test.tsx
    - mobile/src/screens/factor-detail/DmhCountFields.tsx
    - mobile/src/screens/factor-detail/DmhCountFields.test.tsx
    - mobile/src/screens/factor-detail/UncappedFieldBlock.tsx
  modified:
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/FactorDetailScreen.test.tsx
    - mobile/src/screens/survey-form/FactorPager.tsx
    - mobile/src/screens/survey-form/FactorPager.test.tsx
    - mobile/src/navigation/routes/FactorDetailRoute.tsx
    - mobile/src/navigation/routes/FactorDetailRoute.test.tsx
    - mobile/src/app/survey-pdf/factor-fields.ts
    - mobile/src/app/survey-pdf/factor-fields.test.ts
    - mobile/src/app/survey-pdf/factor-section.test.ts
    - mobile/src/i18n/fr/factor-detail.ts
    - mobile/src/i18n/fr/survey-export.ts
    - mobile/src/i18n/fr/route-guide.test.ts
decisions:
  - "A group that already holds a count keeps its counter row even if its chip is unticked, so a count that enters the trees per hectare is never hidden; rows are otherwise one per ticked group"
  - "Cover text is cleaned as typed (digits and one separator, above 100 becomes 100) and stays as typed in the form; the package readers and the hook still drop anything invalid"
  - "The count line under the strata ('3 strates comptees') shows the form's strata_count, which the form wrote from the package derivation, and only once a cover is typed"
  - "On the PDF, F's surface decrite is printed only beside valid dmh_counts, so a survey without details prints exactly as before"
metrics:
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 19: B and F detail inputs of the releve deplafonne Summary

A factor the recorded route counts in full now asks for the detail the official method asks for: B takes a percent of cover per stratum, F takes a tree count per dendromicrohabitat group and its own editable surface, and the PDF factor cards print both. Capped factors and surveys without a route render exactly as before.

## What was built

- **StrataCoverFields**: title, the 20 % helper (catalogue), five rows in the order and with the labels of B's options (`selectionOptionsFor("B")`), each a label on the left and a percent field on the right (88 wide, 48 high, `decimal-pad`, suffix "%", `strata-cover-0` to `strata-cover-4`). Typing calls `setStratumCover(code, text)`; return key goes `next` then `done` on the last, moving focus to the next stratum. A live "N strates comptees" line shows once a cover is typed.
- **DmhCountFields**: under the group chips, a `FactorCounterInput` per ticked group (`dmh-count-{code}`, calls `setDmhCount(code, n)`, whole numbers of 0 or more), the cap hint, and F's own surface (`dmh-surface-field`) prefilled once from the route's zone by `useRouteSurfacePrefill`, editable, with "D'apres le parcours" under it while it equals the zone.
- **UncappedFieldBlock / UncappedEntryProps**: one object (`state` of 30-12 plus `setStratumCover`, `setDmhCount`, `setFSurface`); picks StrataCoverFields for B (it replaces the strata chips) and DmhCountFields for F (under the group chips), nothing for other factors.
- **Wiring**: `FactorDetailRoute` builds `uncappedEntry` (memoised) from the form context; `FactorPager` passes it to the active page; `FactorDetailScreen` shows a block only when the factor is in `uncappedFactors` and the entry is present.
- **PDF**: `factor-fields.ts` prints "Couvert par strate" (`label : value %` per stratum, code order, read through `readStrataCover`) and "Arbres par groupe de dendromicrohabitats" (`label : count`, code order, through `readDmhCounts`) plus F's "Surface decrite" beside the counts. The existing height estimator counts the new lines (tested).

## U-O10 and persistence

Nothing here deletes data. When a factor leaves the full count the block is simply not rendered: the stored cover, counts and surface stay in the form state and payload (plan 30-12), and the chip entry reopens seeded with the last derived value through the existing legacy-count path. Values survive another factor's edit and a draft reload through the form state of 30-12 (its tests cover those; the fields here are stateless and show what the form holds).

## Line counts (cap 400)

| File | Lines |
|------|-------|
| mobile/src/screens/FactorDetailScreen.tsx | 398 (was 362) |
| mobile/src/screens/survey-form/FactorPager.tsx | 376 (was 371) |
| mobile/src/navigation/routes/FactorDetailRoute.tsx | 152 |
| StrataCoverFields.tsx / DmhCountFields.tsx | 173 / 128 |

## Verification

- `cd mobile && npx jest -c jest.unit.config.js`: 430 suites, 6485 tests, all pass.
- `npm run lint`, `npm run typecheck`: clean. `npm run format:check` flags only `.claude/settings.local.json` (not this plan's).
- `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts`: empty.
- STATE.md, ROADMAP.md, REQUIREMENTS.md not touched.

## Deviations from Plan

**1. [Rule 3 - Line cap] Extra file `UncappedFieldBlock.tsx`**
- `FactorDetailScreen.tsx` was at 362 lines; inlining the block choice and the prop type would have crossed 400. The choice of block and the `UncappedEntryProps` type live in `factor-detail/UncappedFieldBlock.tsx`; the screen is at 398.

**2. [Repo state] No locked state on the factor pages**
- The plan says a submitted survey shows the fields read-only "(the existing locked state)". `FactorDetailScreen` has no locked state (no field has one; submitted surveys are not edited through the pager). Both blocks take an `editable` prop (default true, tested: the fields are not editable and nothing is prefilled when false), but the screen does not pass it.

**3. Decisions where the plan was silent**
- Counter rows are the ticked groups plus any group already holding a count above zero (see decisions), instead of only ticked groups.
- Catalogue additions: `strataCounted`, `strataFieldA11y`, `strataCoverUnit`, `strataCoverPlaceholder` (the lint rule forbids literal text in JSX), `strataCover`, `strataCoverItem`, `dmhCounts`, `dmhCountItem`; the function leaves were added to the sample list of `route-guide.test.ts`.
- F's trees-per-hectare numeric field and the group chips stay in place above the new block; the derived value shows in that field, still editable (spec section 7, U-O10).

TDD note: the component tests were written after the implementation in one pass (no separate RED commit), as in plan 30-12 Task 1.

## Threat model

- T-30-41 (out-of-range input): covers are cleaned and capped at 100 as typed, counts are whole numbers of 0 or more, the package readers drop invalid entries on load and on the PDF. Tested.
- T-30-42 (detail lost on a mode switch): hidden, never deleted; the form state of 30-12 is untouched. Tested there; here the blocks show what the form holds.

## Known Stubs

None.

## Self-Check: PASSED

- Files present: StrataCoverFields.tsx, DmhCountFields.tsx, UncappedFieldBlock.tsx and their tests under `mobile/src/screens/factor-detail/`.
- Commits present: 91f741d2 (Task 1), 96439a92 (Task 2).
