---
phase: 30-route-choice-assistant-inserted-v1
plan: 14
subsystem: mobile-pdf
tags: [pdf, route, survey-export, d-09]
requires: [30-08, 30-11]
provides:
  - "buildRouteBlock / routeSectionCss (mobile/src/app/survey-pdf/route-section.ts): the 'Parcours utilisé' block, id route"
  - "SurveyExportData.route (SurveyRoute | null), read from the local draft with readSurveyRoute"
  - "Identity row 'Mode de relevé' printed only when data.route is null"
affects: [30-24]
key-files:
  created:
    - mobile/src/app/survey-pdf/route-section.ts
    - mobile/src/app/survey-pdf/route-section.test.ts
  modified:
    - mobile/src/app/survey-pdf/types.ts
    - mobile/src/app/survey-pdf/assemble-export-data.ts
    - mobile/src/app/survey-pdf/assemble-export-data.test.ts
    - mobile/src/app/survey-pdf/build-html.ts
    - mobile/src/app/survey-pdf/build-html.test.ts
    - mobile/src/app/survey-pdf/identity.ts
    - mobile/src/app/survey-pdf/identity.test.ts
    - mobile/test/survey-export-fixtures.ts
decisions:
  - "The block height reuses conditionsBlockHeight from conditions-section.ts instead of a copy of the formula (padding 20 + heading 24 + per row 6 + lines x 13 + margin 10, 80 characters a line): a six-row block of one line each is 168, the fullest route is 181"
  - "The route block has no id collision with the identity card: the identity 'Mode de relevé' caption and the route block's counting caption are the same catalogue word (spec section 9), so with a route exactly one row with that caption prints, the block's"
  - "A route that readSurveyRoute rejects (absent, damaged, newer) reads as null and prints the legacy row: an old or unreadable record never breaks an export (tolerant read, T-30-34)"
metrics:
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 14: The route used in the PDF Summary

The on-device PDF prints a "Parcours utilisé" text block right after "Conditions du relevé" (after the identity cards when there is no conditions block), for drafts and submitted surveys, and the identity card's hard-coded capped sentence goes only when that block prints.

## What was built

- **route-section.ts** (on the `conditions-section.ts` model): `buildRouteBlock(data, palette)` is null without a route, otherwise a block with id `route`, the heading from `fr.surveyExport.route.heading` and one table row per `routeDisplayRows(route, "pdf")` entry (Parcours, Mode de relevé, Facteurs comptés en entier, Surface décrite, Reste du peuplement, Choix; the guide's answers sit inside the Choix sentence). Every caption and value goes through `escapeHtml`; the CSS is `route-` prefixed, palette values only, borders and flex-free table rows, 150 px caption column. The header comment says why it is text only (the trace on the map is Phase 31).
- **Export data**: `SurveyExportData.route`; `loadDraftParts` reads `readSurveyRoute(draft.survey_route)` from the local draft payload (null when absent, damaged, not an object, or the draft cannot be read). No network read is added (a test asserts the parcel fetch is not called).
- **Block order and CSS** in `build-html.ts`: identity, method, conditions (when present), route (when present), scores, chart, factors, map, trend, photos; `routeSectionCss` follows `conditionsSectionCss`.
- **Identity row** (`identity.ts`): "Mode de relevé / Relevé plafonné, aucun facteur déplafonné" is pushed only when `data.route === null`. For a route-less survey the card HTML is byte-identical to before (a test pins the exact row markup and its position as the last row); with a route the card is the same text minus that row, 19 design units shorter.
- **Fixtures**: `exportFixtureWorstCase` (the maximal fixture) carries `WORST_ROUTE`: partial by plot, uncapped on C, D and E, complement done with 12.5 ha, guide accepted with answers. The two other fixtures and every test data literal have `route: null`.

## Page counts (estimate level, pinned in build-html.test.ts)

| Fixture | Before | After |
|---------|--------|-------|
| v3.0 draft, no route | 4 | 4 |
| v3.2 submitted, no route | 4 | 4 |
| v3.2 submitted with the fullest route | n/a | 5 |
| Maximal fixture (worst case, 24 photos, fullest route) | 10 | **10** |

The maximal fixture keeps 10 pages: the 181 unit block fits in the white space left by unsplittable blocks. An ordinary submitted survey that gets a route adds one page, because identity 226 + method 93 + route 181 + scores 136 leaves too little of the 680 page capacity for the chart, which moves to page 2. A capped route with one-line rows is 130 units. These are estimate-level counts from the pure paginator; I could not print a real PDF here. The real page count and the look on iOS and Android are to be measured on devices in plan 30-24 (research Pitfall 8).

## Verification

- `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/__checks__ --coverage=false`: 31 suites, 606 tests passed.
- Full mobile unit suite: 419 suites, 6209 tests passed.
- `npm run lint` and `npm run typecheck`: exit 0. `prettier --check mobile/src mobile/test`: clean (the root `format:check` also flags `.claude/settings.local.json`, not part of this plan).
- `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts` is empty.
- Root `npm run test:unit` was not run to the end: `api/test/check-env-parity.spec.ts` fails on this Mac (bash 3.2), CI runs bash 4.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `route: null` added to test data literals not listed in the plan**
- **Found during:** Task 2
- **Issue:** `route` is a required field of `SurveyExportData`, so the object literals in `score-section`, `factor-chart-svg`, `trend-section`, `map-section`, `photos-section`, `factor-section`, `conditions-section` tests had to carry it.
- **Fix:** one line `route: null,` in each of those test helpers (identity.test.ts is in the plan list). No behaviour change.
- **Commit:** 432b42b2

**2. [Plan wording] Route-block height reuses `conditionsBlockHeight`**
- The plan says "follows the conditions formula"; I imported the exported function instead of duplicating the constants. The result is identical (168 for six one-line rows).

No rule of the validated spec was changed. P-3 holds: a survey without a route prints as before.

## Known Stubs

None.

## Threat Flags

None. T-30-32 (markup injection) is covered by `escapeHtml` on every caption and value and a test that feeds markup characters through stubbed catalogue sentences; T-30-34 (old exports changing) by the route-less fixtures keeping their identity row, their block list and their page counts.

## Commits

- 708f4fbd: feat(30-14): Parcours utilisé PDF block and the route in the export data
- 432b42b2: feat(30-14): print the route block after the conditions, data-driven identity row

## Self-Check: PASSED

- route-section.ts and route-section.test.ts exist; commits 708f4fbd and 432b42b2 exist on the branch.
