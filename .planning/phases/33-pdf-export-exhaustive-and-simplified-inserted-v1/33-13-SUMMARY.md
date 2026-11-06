---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 13
subsystem: mobile-pdf-export
tags: [pdf, registry, page-counts, survey-pdf, ui-spec-b11]
requires: [33-06, 33-07, 33-08, 33-09, 33-10, 33-11]
provides:
  - the final section registry (cover first in complete, summary alone in summary)
  - pinned page counts (B.11) and the pinned page estimate
affects: [33-14]
tech-stack:
  patterns: [registry as the only extension seam, page counts pinned in test names]
key-files:
  created: []
  modified:
    - mobile/src/app/survey-pdf/sections.ts
    - mobile/src/app/survey-pdf/sections.test.ts
    - mobile/src/app/survey-pdf/build-html.test.ts
    - mobile/src/app/survey-pdf/map-section.ts
    - mobile/src/app/survey-pdf/map-section.test.ts
    - mobile/src/app/survey-pdf/score-section.ts
    - mobile/src/app/survey-pdf/score-section.test.ts
    - mobile/src/app/survey-pdf/page-estimate.ts
    - mobile/src/app/survey-pdf/page-estimate.test.ts
    - mobile/test/survey-export-fixtures.ts
decisions:
  - "The map block opens its own page (breakBefore) only when a figure is drawn; a note-only block (no parcel, no outline) follows the factors. This is research lever L2, applied narrowly so the map and the trend still share a page in the worst case"
  - "The v3.2 submitted fixture misses its B.11 target (5 pages, target 4): pinned at 5 with an it.failing test that asserts the target, so the miss is visible and flips loudly when fixed. Owner decision, see below"
metrics:
  tasks: 2
  files: 10
  completed: 2026-10-24
status: complete
---

# Phase 33 Plan 13: Registry, page counts and estimate Summary

The cover and the summary now join the two documents through two registry entries alone, the old score card is gone from the body and from the code, the complete fixtures print on the 250 frame, and the page counts of UI-SPEC B.11 and the "Environ N pages" estimate are pinned. Four of the five complete fixtures meet their page target; the v3.2 submitted fixture is one page over (5 against 4) and is reported below as an open owner decision.

## What was built

- `sections.ts`: `{ id: "cover", modes: ["complete"] }` first, `score-summary` removed, `{ id: "summary", modes: ["summary"] }` last. `sectionsFor("complete")` is `cover, identity, conditions, route, factor-chart, factors, map, trend, photos`; `sectionsFor("summary")` is `["summary"]`. The header comment states the final order and that phase 31 appends after `map`.
- `build-html.ts` is untouched (`git diff HEAD~2 -- build-html.ts` is empty, no commit of this plan touches it): the D-10 proof.
- Fixtures: the worst case's basemap frame and `frameSize` are spreads of `MAP_FRAME_SIZE` (515 x 250), so every complete fixture prints the 250 frame.
- `map-section.ts`: `card()` takes `startsPage`; a drawn figure (basemap or outline) keeps `breakBefore`, the no-parcel and no-outline note blocks do not.
- `score-section.ts`: `buildScoreSummaryBlock`, `scoreSectionCss`, the tile helpers, the `Tile` type and their constants removed. Kept: `filledPoints`, `countMissingFactors`, `toneColor`, `scoreBands`, `ScoreBand`. No module under `mobile/src` references the removed names (grep 0).
- `page-estimate.ts`: `COMPLETE_BASE_PAGES = 5`, now documented as the builder's count of `exportFixtureTypical` without photos (cover, identity plus chart, factors A to E, factors F to J, map plus trend), and pinned by tests.
- `build-html.test.ts` rewritten for the behaviour: cover tests (page 1 is `page-cover`, no running header, total, both sub-scores and three band lines on it), page order with the cover, CSS order, no score card or `.score-tile` rule, page-count pins, map and trend on one page, whole blocks on exactly one page for the five complete fixtures, the photo rule (typical with 1, 7, 13 and 24 photos, the conditioned typical and the worst case), the eight one-page summary documents (typical, fullest, six fallbacks) with no complete-only markup or CSS, the CSP and no script or address in them, and the draft cover keeping its banner and watermark. The equality check against the legacy lists of 33-03 is dropped.

## Page counts (builder, equal to the Chrome print for every case)

Estimate fills are in design units against a usable capacity of 680.8 (658.7 for a draft). Numbers are also in the test names, for plan 33-14 to compare with `pdfinfo` on the devices.

| Fixture | Baseline | Target (B.11) | Now (builder = Chrome) | Pages by content (cover is page 1) |
|---|---:|---:|---:|---|
| `exportFixtureV32Submitted` | 4 | 4 | **5 (MISS, +1)** | identity + chart (502); stand heading, A to E (648); F to J + "no map" note (662); trend note alone (66) |
| `exportFixtureV30Draft` | 4 | 4 | 4 | identity + chart + heading + A (640); B to G (657); H to J + map note + trend note (464) |
| `exportFixtureTypical` | 6 | 6 | 6 | identity + chart; A to E; F to J; map + trend; 6 photos |
| `exportFixtureTypicalConditioned` | 7 | 7 | 7 | identity (with conditions and route) on its own page, then chart + factors, F to J, map + trend, 6 photos |
| `exportFixtureWorstCase` (and without route) | 10 | 10 | 10 (10) | identity + chart; factors; factors; map + trend; four photo pages of six |
| Summary fixtures (typical, fullest, six fallbacks) | n/a | 1 | 1 each | one summary page |

Map and trend share one page for the typical survey, the conditioned typical survey and the worst case (six history points). Every block of every complete fixture prints whole on exactly one page. No photo page before the last holds fewer than two photos (every full photo page holds six).

Chrome PDF sizes (real photos at 800 px / JPEG 65, logo 240 px), against the 33-01 baseline: v32 169 KB (145.5), v30 draft 167 KB (145.8), typical 545 KB (532), conditioned 556 KB (542.7), worst 1439 KB (1410.3); summaries 59 to 123 KB. The growth of 12 to 24 KB per complete document is the cover (contour art, two rings, six fonts' used cuts); photos are unchanged in this plan (the 640 px trial is plan 33-08's).

## Known miss: the v3.2 submitted fixture prints 5 pages, the target is 4

This needs an owner decision (or a wider fix), it is not hidden: the pin test says 5, and an `it.failing` test asserts the target of 4, so the day the layout reaches 4 that test starts failing and tells whoever fixed it to flip the pin.

Measured with the real estimates (design units, usable capacity 680.8 = 740 x 0.92):

- Page 2 holds the identity card with the method (288) and the factor chart (214) = 502. The next run, the stand heading kept with factor A (34 + 156 = 190), makes 692, which is 11.2 over the capacity, so the factors start on page 3.
- Page 3: heading, A to E (648). Page 4: F, G, context heading, H to J (590) plus the "no map" note (72) = 662; the trend note (66) does not fit and prints alone on page 5.
- Even the best case of the whole remediation order does not close the gap. Chrome's measured heights (script on the printed document) are: identity 279.2 + 10 margin (estimate 288, accurate), chart 205.6 + 10 (estimate 214, accurate), factor A 142.6 + 8 (estimate 156, over by 5.4), factors C, D, E 99.6 + 8 (estimate 117, over by 9.4) but B and I under-estimated by 3.6, trend note 43 + 10 (estimate 66, over by 13).

Remediation order, and what each step gave:

- (a) Trim an over-estimated block: factor A is the only block on page 2 that is demonstrably over-estimated (156 against 150.6 measured, -5). It comes out of a generic wrapped-row formula shared by all factor cards, where other cards are under-estimated (B and I by 3.6), so a card-specific trim was not made on the Chrome measure alone. Even taken, it gives 687.
- (b) L1, the map frame height: no effect, the fixture draws no map. L2, no `breakBefore` on the map block: applied, in its narrow form (see Deviations); it fixes the v3.0 draft (5 to 4) and does nothing for this fixture (the trend note still does not fit page 4). L3, the sub-heading line box from 24 to 20: -4, giving 688, with (a) 683, still 2.2 units over 680.8. L4 and L5: no room left (the commune row and the score card are already merged and moved, as the plan expected); confirmed.
- (c) Therefore stop and report. The real heights fit a four-page document in Chrome (page 2 with A would be 689 of the 740 body units): the limit is the 0.92 fill factor, a device-calibrated safety margin in `paginate.ts` (not in this plan), together with the 33-07 chart growth from 206 to 214 that the research table did not include. The research claimed "the cover costs no extra page" for the v3.0 draft, the typical, conditioned and worst cases; it never stated the v3.2 fixture's body count.

Options for the owner or the orchestrator: accept 5 for a survey with no map and no history (the fifth page holds one short note); or shrink page 2 by about 12 real units (for example the chart block 214 to 200 and the identity card 288 to 284 together would do it); or lower the fill factor for the first body page only. Any of them is a layout change to be measured on the devices in 33-14. A survey that has a map and a history (the real case) is unaffected: typical is 6, as targeted.

## Look at the renders (Chrome headless, throwaway harness in the scratchpad, nothing committed)

All five complete fixtures and eight summary fixtures printed through `buildSurveyExportHtml` itself (summary through `mode: "summary"` and the registry), root zoom 1.33333, real fonts, real logo, real photos and a real JPEG as basemap, then viewed as PNG pages.

- Cover (typical, page 1): half-bleed forest panel with the logo tile, "Relevé IBP", the site name, the date, the white numeral "32 / 50" with the "Niveau : assez forte" pill, and the contour lines anchored bottom right, clear of the text. Below, two ring tiles (orange 20 / 35 "moyenne", green 12 / 15 "forte") and six facts in two columns; calm paper above the footer. No running header. The draft cover (v3.0): the pink banner "Brouillon, non soumis" under the panel, the provisional line in the panel, "Non renseigné" in the empty fact cells, the watermark over the light part.
- Factor page (typical, page 3): the group title, then cards A to E with the coloured left strip by band, rounded corners, chip row, the "Classe retenue" line and the scale line; five cards, about 100 units of paper left under them.
- Map and trend page (typical page 5, worst page 6): "Localisation" with the 250-high frame, the parcel overlay (three parcels in the worst case), scale bar and north arrow, the parcel line and the IGN source, then "Évolution de la parcelle" with "+8 points depuis 2023" (worst: "+12 points depuis 2021" and the method note), the curve (with the dashed link between methods in the worst case) and the per-factor change table. One page, about 130 units free at the bottom.
- Photos (worst, page 7): two columns by three rows, rounded frames, captions "Photo n sur 24".
- Summary (typical): title band with logo, "Résumé du relevé IBP", the date and the meta line; the forest score card with the ring and "32 / 50"; ten factor bars; the 228-high map frame with the parcel; the evolution line and curve; two source lines above the footer with no page number. All eight summary fixtures are exactly one page.
- The v3.2 fixture without map or history: page 4 ends with the factor J card, the "Localisation" note and the parcel line; page 5 is the lone "Évolution de la parcelle" note.

Chrome only: the phone engines are for plan 33-14.

## Deviations from Plan

- [Rule 1 - layout, plan remediation (b), L2] The plan says drop `breakBefore` on the map "so it can follow the factors". Dropping it everywhere broke the worst case: factors close at 358 and a 322 map would then fit behind them (680 of 680.8), leaving the trend alone on the next page and violating "map and trend share a page". The map block now keeps `breakBefore` when it draws a figure and drops it when it is only a note (no parcel, no outline). Result: v3.0 draft 5 to 4, no other count changes. Files: `map-section.ts` and its test (commit 98986d21).
- Task 1's tests were written together with the registry change in one commit; Task 2 is a separate commit.
- The tracked `page-estimate.ts` constant is unchanged in value (5): the builder count of the typical survey without photos is 5 with the cover, so the plan's "set from the builder" confirms it. The comment and the pins are new.

## Deferred Issues

- The v3.2 submitted fixture target miss above (open owner decision).

## Verification

- `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/app/survey-pdf-export.test.ts src/screens --coverage=false`: 208 suites, 3296 tests, all pass. Full mobile unit run with coverage: 455 suites, 7110 tests pass, no coverage threshold message (the `./src/app/` floor holds).
- `cd mobile && npx tsc --noEmit -p .`: exit 0. Root `npm run lint` exit 0, `npm run typecheck` exit 0.
- `npm run format:check`: the only warning is the pre-existing untracked `.claude/settings.local.json`; not part of this plan, not touched. The API and package suites of `npm run test:unit` were not re-run: nothing under `api/` or `packages/` changed.
- Acceptance greps: `id: "cover"` and `id: "summary"` in `sections.ts` (found), `"score-summary"` outside comments 0, `buildScoreSummaryBlock|scoreSectionCss` under `mobile/src` 0, `build-html.ts` diff empty, `page-summary`/`pageSummary` in `build-html.test.ts` present.

## Notes for the next plans

- 33-14: compare the device `pdfinfo` counts with these pins (v32 5, v30 draft 4, typical 6, conditioned 7, worst 10, summaries 1) and re-check the page-2 fill of the v3.2 fixture (692 estimated against 680.8 allowed) on both platforms: if the devices print the identity card and chart shorter than estimated, the miss may already be gone there.
- If the map frame height is lowered later (L1), update the alignment check; this plan left it at 250 (no step needed it).
- `exportFixtureWorstCase` now prints its basemap at 515 x 250; any test that read the old 340 height would have failed, none did.

## Known Stubs

None.

## Threat Flags

None. T-33-30: the summary registry list is `["summary"]` only and the eight summary documents are tested for no photo, factor, identity or cover markup or CSS, including with photos present in the data. T-33-31: the existing document tests (CSP first, no script, no http or file address, escaped site name and observer, no em dash) still run on the complete documents and now also on the summaries.

## Self-Check: PASSED

- FOUND: mobile/src/app/survey-pdf/sections.ts (cover and summary entries), mobile/src/app/survey-pdf/build-html.test.ts, mobile/src/app/survey-pdf/page-estimate.ts
- FOUND: commit 98986d21 (feat(33-13)), commit 4ef68f60 (refactor(33-13))
