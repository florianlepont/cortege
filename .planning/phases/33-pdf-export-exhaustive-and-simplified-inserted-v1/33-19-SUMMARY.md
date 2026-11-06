---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 19
subsystem: mobile-pdf-export
tags: [pdf, charts, plane, rose, cnpf, ibp-domain, palette, svg, gap-closure, owner-review]
requires: [33-18]
provides:
  - STAND_BAND_CUT_OFFS and CONTEXT_BAND_CUT_OFFS exported by @cortege/ibp-domain and read by standBand and contextBand
  - standZones, contextLevels, roseRingScores and zoneTint (the chart inputs, built only from package exports and catalogue names)
  - six palette keys (zoneLow, zoneLowSoft, zoneMid, zoneHighSoft, zoneHigh, contextInk) with pinned contrast
  - fr.surveyExport.charts (heading, plane title, source line, spoken labels)
  - buildPlaneSvg and buildRoseSvg, pure static SVG builders, and splitLabel
  - the complete PDF chart card (plane and rose side by side, source line, 228 high) and the summary's plane
  - exportFixtureLowScore and exportFixtureSummaryLowScore
  - Chrome re-measurement of 16 cases in 33-14-MEASUREMENTS.md
affects: [33-20, 33-15]
key-files:
  created:
    - mobile/src/app/survey-pdf/plane-svg.ts
    - mobile/src/app/survey-pdf/plane-svg.test.ts
    - mobile/src/app/survey-pdf/rose-svg.ts
    - mobile/src/app/survey-pdf/rose-svg.test.ts
  modified:
    - packages/ibp-domain/src/bands.ts
    - packages/ibp-domain/src/bands.test.ts
    - packages/ibp-domain/src/index.ts
    - mobile/src/app/survey-pdf/score-section.ts
    - mobile/src/app/survey-pdf/score-section.test.ts
    - mobile/src/app/survey-pdf/types.ts
    - mobile/src/app/survey-pdf/palette.ts
    - mobile/src/app/survey-pdf/palette.test.ts
    - mobile/src/app/survey-pdf/html.ts
    - mobile/src/app/survey-pdf/html.test.ts
    - mobile/src/app/survey-pdf/factor-chart-svg.ts
    - mobile/src/app/survey-pdf/factor-chart-svg.test.ts
    - mobile/src/app/survey-pdf/summary-section.ts
    - mobile/src/app/survey-pdf/summary-section.test.ts
    - mobile/src/app/survey-pdf/build-html.test.ts
    - mobile/src/i18n/fr/survey-export.ts
    - mobile/src/i18n/fr/survey-export.test.ts
    - mobile/src/i18n/catalogue.test.ts
    - mobile/test/survey-export-fixtures.ts
    - .planning/phases/33-pdf-export-exhaustive-and-simplified-inserted-v1/33-14-MEASUREMENTS.md
decisions:
  - "The two builders import no value from the package, no i18n and no ibp-display: every cut point, maximum, band, tone, group and ring score reaches them as input (D-28); a grep gate in the plan's acceptance criteria confirmed it"
  - "zoneTint (strong or soft tint of a tone) lives in score-section.ts next to toneColor, so the plane and the rose share one rule and neither reads the palette by tone itself"
  - "A missing factor on the rose is never drawn as a zero: dashed spoke, no dot, polygon cut on both sides (U-27); a missing sub-score on the plane gives no marker"
metrics:
  tasks: 5
  completed: 2026-10-26
status: complete
---

# Phase 33 Plan 19: the CNPF-like charts, the plane and the rose (D-27, D-28) Summary

The factor chart of the complete PDF is now our own static redrawing of the two charts of the CNPF survey sheet, side by side under the heading "Lecture du score IBP": the plane "IBP contexte face à l'IBP peuplement et gestion" (five tinted stand bands cut at the package's own cut points, two dashed context level lines, the survey as one marker) and the ten-axis rose (rings 0, 2, 5, a polygon line with dots, names in green for the stand factors and brown for the context ones), with a source line. The one-page summary shows the plane only in its score row. The bars are gone from both documents, no page-count pin moved, and the CNPF image and logo appear nowhere.

## What changed

| Task | Commit | Change |
|---|---|---|
| 1 | 2b2a0ed2 | `STAND_BAND_CUT_OFFS = [7, 14, 21, 28]` and `CONTEXT_BAND_CUT_OFFS = [5, 10]` exported from the package (read by `standBand` and `contextBand`, no rule change, 100 % coverage kept); `score-section.ts` gains `ChartZone`, `standZones()`, `contextLevels()`, `roseRingScores()` |
| 2 | 243e2a8a | six palette keys derived with `mixWithWhite` and `onSurface.warning` (36 keys pinned, contrast figures below); `fr.surveyExport.charts` (heading, plane title, source, `joinList`, two plane labels, rose label and item) |
| 3 | 1b790e64 | `splitLabel` in `html.ts`, `zoneTint` in `score-section.ts`, `plane-svg.ts` and `rose-svg.ts` with the UI-SPEC geometry (every number of the plan's behavior list is a test) |
| 4 | 1dacc389 | `planeInput` and `roseInput` in `factor-chart-svg.ts`, the card (228 high, `chart-row`, `chart-plane`, `chart-rose`, `chart-source`), the summary's plane under its title, bars, group panels, `CHART_MARGIN` and `scores.chartA11y` removed |
| 5 | 294468c1 | `exportFixtureLowScore` and `exportFixtureSummaryLowScore` (every factor at 0 or 2, 6 / 35 and 2 / 15), the page 2 order test, low score pinned at 4, the Chrome section of `33-14-MEASUREMENTS.md` |
| fix | e1da8b29 | the em dash check of the chart test written with `String.fromCharCode(0x2014)` (the plan's gate counts the literal in added lines) |

## Package exports

`@cortege/ibp-domain` gains two additive constants, exported from `index.ts` on the bands line: `STAND_BAND_CUT_OFFS` and `CONTEXT_BAND_CUT_OFFS`. `standBand` passes the first to `fiveBands`, `contextBand` compares with the second; behaviour is identical (the existing band cases pass untouched, and a new test pins that a cut starts a new band and the point below does not). Package coverage 100 % (959 / 959 statements, 529 / 529 branches). `git diff` of the parity folder, `evaluate.ts` and `api` is empty; the API and mobile parity suites pass (94 and 106 cases).

## The six keys and their contrast

| Key | Value | Pinned |
|---|---|---|
| `zoneLow`, `zoneLowSoft`, `zoneMid`, `zoneHighSoft`, `zoneHigh` | `#E19B85`, `#EEC5B8`, `#F0D4BC`, `#CED6B6`, `#AAB981` | `accent` on them 4.07 / 5.88 / 6.55 / 6.14 / 4.40 (at least 4), `ink` on them 6.02 / 8.68 / 9.68 / 9.07 / 6.50 (at least 6), strong darker than soft by luminance, five distinct values |
| `contextInk` | `#7A4A0A` | on `paper` 7.47, on `panel` 6.90 (at least 4.5) |

`accent` on `paper` and `panel` 9.27 and 8.56. These are the figures of the UI-SPEC, recomputed with the real palette in Chrome's harness; the zones against `paper` are 2.28 / 1.58 / 1.41 / 1.51 / 2.11 (not pinned: band edges are also carried by ticks and names).

## Final pins and page counts (builder = Chrome `pdfinfo`, 16 cases)

| Case | Pin before | Pin now | Builder | Chrome |
|---|---:|---:|---:|---:|
| v3.2 submitted | 4 | 4 | 4 | 4 |
| v3.2 with the fullest route | 4 | 4 | 4 | 4 |
| v3.0 draft | 4 | 4 | 4 | 4 |
| typical | 5 | 5 | 5 | 5 |
| typical with note and route | 6 | 6 | 6 | 6 |
| worst case, with and without the route | 9 | 9 | 9 | 9 |
| 30 parcels, both id widths | 4 | 4 | 4 | 4 |
| low-score v3.2 (new) | none | 4 | 4 | 4 |
| every summary (typical, worst, no basemap, no history, low score) | 1 | 1 | 1 | 1 |

No pin went up and no pin line was changed (`git diff` shows 0 removed pin lines and one added, the low-score line); the stop rule never fired. Page 2 of the v3.2, typical and low-score documents is 689 of 695.6 by estimate, and 725.8 pt printed (64.2 pt under the 790 rule).

## Chrome table (harness of 33-RENDER-HARNESS.md, layout android 4/3)

Full table with the 33-18 sizes, the source-line bottoms and the card estimate in `33-14-MEASUREMENTS.md`, section "Re-measurement of plan 33-19". Highlights:

| case | pages | KB | lowest body text, pt (rule 790) | source line bottom against the card estimate |
|---|---:|---:|---:|---|
| complete-v32 | 4 | 172.5 | 725.8 | 536.2 against 549 |
| complete-v32-route | 4 | 177.5 | 699.7 | 699.7 against 711 |
| complete-v30-draft | 4 | 174.6 | 724.3 | 522.0 against 535 |
| complete-typical | 5 | 444.1 | 745.7 (cover legend 767.2) | 536.2 against 549 |
| complete-typical-conditioned | 6 | 455.1 | 745.7 | 266.2 against 278 |
| complete-worst | 9 | 1038.5 | 745.7 | 699.7 against 711 |
| complete-low-score | 4 | 171.7 | 725.8 | 536.2 against 549 |
| summary | 1 | 129.6 | 799.5 (Z5, unchanged) | n/a |
| summary-low-score | 1 | 128.8 | 799.5 | n/a |

The other seven cases are in the measurements file. The complete documents grew 6.6 to 6.9 KB and the summaries shrank 3.4 to 3.6 KB against 33-18. Every source line ends 11.3 to 13.0 pt above the card's estimated bottom (39 pt for the 30 narrow ids, whose identity prints under its estimate, as in 33-18); the chart card prints exactly 228 units.

Label boxes on page 2 of `complete-typical` (`pdftotext -bbox`): every plane text inside its panel (8.0 pt left, 7.6 pt right, 0.3 pt bottom by font box, the x title baseline is 4 above the edge), every rose name inside its panel (12.0 pt on both sides, 0.5 pt at the bottom by font box, 4.3 pt by baseline). On the summary the heading ends at x 520.5 (limit 555) and the plane texts lie 7.7 and 7.8 pt inside the panel.

## What I saw in the Chrome renders

Looked at with the Read tool, 120 dpi for whole pages and 200 dpi crops of the card (written in full in the measurements file):

- **Typical, page 2**: plane and rose in white panels side by side, the five tints in the right order (terracotta, pale terracotta, ochre, pale green, strong green), tick values under the cuts, names under the bands, two dashed level lines with the level names in the gutter, the marker as a dark green disc with a white ring and two thin dashed guides, bold axis titles; the rose with the pale green and pale terracotta zones, olive and terracotta ring strokes, the white hub, ten spokes, the scale 0, 2, 5, the polygon with ten dots, names in green (stand) and brown (context). The source line is on one line. Nothing overlaps a panel edge to the eye; the polygon passes beside the ring value "2" on this data.
- **Worst**: the same card under the "Parcours utilisé" block, nothing overlaps.
- **Low score**: marker in the first band and the first level on the strong terracotta, still readable; the polygon is a small star on the hub and the 2 ring.
- **v3.0 draft** (I and J missing): the banner and the pale "Brouillon" watermark over the card; on the rose two dashed grey spokes with no dot for the two missing factors, the polygon running A to H and stopping (nothing to I or J, nothing from J to A); the plane marker at 20 and 4 just under the dashed line at 5.
- **Summaries**: the heading on one line over the plane (panel fill on the white page), bars and group panels gone; the low-score marker in the lowest band and level; both are one page. The y title and the "15" tick are close but do not touch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] catalogue sampler cannot call `joinList`**
- **Found during:** Task 2
- **Issue:** `src/i18n/catalogue.test.ts` calls every catalogue function with a proxy argument; `charts.joinList({ items })` got a string for `items` and threw.
- **Fix:** one entry in that test's `LIST_ARGUMENTS` table (`"surveyExport.charts.joinList": { items: ["a", "b", "c"] }`), the mechanism the file already has for list arguments. The test file is not in the plan's `files_modified`.
- **Files modified:** `mobile/src/i18n/catalogue.test.ts`
- **Commit:** 243e2a8a

**2. [Rule 3 - Blocker] the one-page tests live in `summary-section.test.ts`**
- **Found during:** Task 5
- **Issue:** the plan asks to add the low-score summary "to the one-page tests", which are in `summary-section.test.ts` (and `build-html.test.ts`); only the second is in the plan's file list.
- **Fix:** added the fixture to both, plus a test that the marker of the low-score summary sits in the first band and the first level.
- **Files modified:** `mobile/src/app/survey-pdf/summary-section.test.ts`
- **Commit:** 294468c1

**3. [Rule 1 - Bug] em dash literal in an added test line**
- **Found during:** final verification
- **Issue:** the rewritten chart test kept the old `not.toContain("—")` literal; the plan's gate counts the character in added lines.
- **Fix:** `String.fromCharCode(0x2014)` as `build-html.test.ts` does.
- **Commit:** e1da8b29

**4. Task 2 removed `scores.chartA11y` early, then restored it**
- The plan says to keep the key until Task 4. Task 2 removed it by mistake (the typecheck of `factor-chart-svg.ts` failed); the Task 3 commit puts it back with a comment and Task 4 removes it with its last reader. The commit 243e2a8a alone has that one type error in the old bar chart; every commit from 1b790e64 on typechecks.

### Other notes

- TDD: each task has its tests and code in one commit (the plan type is `execute`, not `tdd`), tests were written with the code and the geometry numbers of the plan are asserted one by one; no RED-only commits.
- `zoneTint` (not in the plan's interface list) was added to `score-section.ts` so the plane and the rose share the tint rule.
- `npm run test:unit` stops at the API suite on this Mac: `check-env-parity.spec.ts` (50 cases) fails as before (bash 3.2, known). The other 57 API suites and all 456 mobile suites (7169 tests) pass, and the package suite (471 tests) passes with 100 % coverage.

## Known Stubs

None. The fixtures use placeholder photos and basemaps as every PDF fixture does.

## Threat Flags

None. No network endpoint, auth path, file access or schema change; the charts are static SVG with no reference to any resource (T-33-51 tested), the CSP and `build-html.ts` are untouched, texts and colours go through `escapeHtml` (T-33-49 tested with a hostile title, label and palette value), the cut points are the package's (T-33-50, grep gate and tests), a missing factor or sub-score is never drawn as a value (T-33-52), and no pin moved (T-33-53, T-33-54).

## Open questions for the owner

1. The rings are 0, 2 and 5 (the scores every factor may take, as the owner wrote in D-27). The CNPF sheet also marks 1, a score factors A to F can take; a 1 sits between the rings 0 and 2 today. Default kept: 0, 2, 5.
2. The source line names the Centre national de la propriété forestière and "l'unité de recherche Dynafor" without the acronyms CNPF and INRAE (the abbreviation gate allows only units, OK, PDF, GPS, IBP and "ex."). Writing INRAE out would make the line wrap and move the typical survey to 6 pages. Default kept (U-25).
3. To judge on paper: the 8-unit labels, the five tints and, on the rose, the ring values (no halo) that the polygon can cross.

## For plan 33-20

- The only new engine item is probe P-6: `text-anchor="end"` (y ticks, level names, x axis title, the rose names on the left half). Chrome right edges are in the measurements file (plane x title ends at 311.0 pt in `complete-typical`, the y tick column at 93.0, the rose's left-half names at 387.0 to 425.0); compare the iOS and Android `pdftotext -bbox` right edges within 1 unit.
- Pins to compare on the devices: v3.2 4, typical 5, typical with note and route 6, worst 9, 30 parcels 4, low score 4, summaries 1; expected page 2 of the v3.2 documents about 726 pt in Chrome (the card prints 228).
- Device cases worth adding: `complete-low-score`, `complete-v30-draft` (I and J missing) and `summary-low-score`.
- The owner's review plan 33-15 must depend on 33-19 and 33-20 (the orchestrator updates its `depends_on`). I did not touch `docs/user-tests/device-checks.md` or `CLAUDE.md`; both belong to 33-20.
- Throwaway harness files stay in the scratchpad (`pdf-harness/render.harness.test.ts` with the two new cases, `run19.sh`, `table19.py`, `label19.py`, `src19.py`); none is in the repository.

## Self-Check: PASSED

- Created files exist: `plane-svg.ts`, `plane-svg.test.ts`, `rose-svg.ts`, `rose-svg.test.ts`.
- Commits exist: 2b2a0ed2, 243e2a8a, 1b790e64, 1dacc389, 294468c1, e1da8b29.
- `npm run lint`, `npm run typecheck` green; `npm run format:check` reports only the pre-existing untracked `.claude/settings.local.json`; package coverage 100 %; `git diff 28ae7951 -- mobile packages` holds no U+2014; `build-html.ts`, `sections.ts`, `map-projection.ts`, `map-figure.ts`, `survey-pdf-export.ts` and `api` unchanged since 28ae7951.
