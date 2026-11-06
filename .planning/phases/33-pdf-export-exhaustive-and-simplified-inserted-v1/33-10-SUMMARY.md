---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 10
subsystem: mobile-pdf-export
tags: [pdf, cover, survey-pdf, ui-spec-b4]
requires: [33-03, 33-04, 33-06, 33-07]
provides:
  - buildCoverBlocks, coverCss, COVER_FACT_MAX_CHARS (mobile/src/app/survey-pdf/cover-section.ts)
affects: [33-13]
tech-stack:
  patterns: [absolute-positioned fixed block, solid colours only, builder-side shortening]
key-files:
  created:
    - mobile/src/app/survey-pdf/cover-section.ts
    - mobile/src/app/survey-pdf/cover-section.test.ts
  modified: []
decisions:
  - "Draft cover: the whole light part moves down by DRAFT_BANNER_HEIGHT (24), as the plan resolved"
  - "Without a usable logo the eyebrow and subtitle move to x 40 (class cover-bare) instead of leaving a hole at x 144"
  - "The Observateur value is shortened with shortenText at 34 characters like the parcel list"
metrics:
  tasks: 2
  files: 2
  completed: 2026-10-24
status: complete
---

# Phase 33 Plan 10: Cover page Summary

The complete PDF now has a cover block: a half-bleed forest panel with the app's static contour lines, the logo on a paper tile, the brand, the site name, the date and the total score (Sora-Light 64) with its band pill, then two ring tiles for the sub-scores and six identity facts. It is not in the registry yet (plan 33-13 does that).

## What was built

- `cover-section.ts`: `buildCoverBlocks(data, palette)` returns one block `{ id: "cover", pageStyle: "cover", height: 740 }`; `coverCss(palette)`; `COVER_FACT_MAX_CHARS = 34`.
- Panel: contour svg first child (`buildContourPaths(7)`, `CONTOUR_VIEWBOX`, `xMaxYMax slice`, `aria-hidden`, sage stroke width 1 and moss 1.4 from `contourDrift`, both `fill="none"`); logo tile 88 at (40, 40) with the 72 image only when the value matches `PDF_LOGO_DATA_URI`; eyebrow `sheetTitle`, subtitle `sheetSubtitle`; title 340 x 84 (`cover-title-long` from 49 characters); long date; score row with the numeral, `cover.outOf`, the band pill; "Non renseigné" and no pill without a total; the provisional line at y 352 on a draft with missing factors.
- Light part: two `cover-tile` boxes (112 high, 249.5 wide, 16 gap) with a 64 `buildRingSvg` in the band tone, heading, value in Sora-Light 24 with "/ 35" or "/ 15", and the band line; a missing sub-score prints `scores.notFilled`, an empty ring, no band line. Six facts by index in two columns of 245.5 (24 gap, step 57): Commune, Parcelle(s), Année, Version, Observateur (dropped when blank, later cells move up), Méthode IBP (`methodShortText`).
- Draft: tiles at 432 and facts at 572 (shift of 24); the banner and watermark are drawn by the paginator.
- Contract: no opacity, gradient, shadow, filter, hex or http in the CSS or HTML (tested); every survey text goes through `escapeHtml`.

## Verification

- `npx jest -c jest.unit.config.js src/app/survey-pdf/cover-section.test.ts src/__checks__ --coverage=false`: 8 suites, 132 tests, all pass (37 in the cover test).
- Coverage of `cover-section.ts`: statements 100, branches 90.32, functions 100, lines 100 (thresholds 95 / 90 / 100 / 95 pass).
- `npx tsc --noEmit -p .` (mobile), `npm run lint` and `npm run typecheck` (root): exit 0.
- `npm run format:check`: the only warning is the pre-existing `.claude/settings.local.json` (not part of this plan, left alone); the two new files are formatted.

## Renders (Chrome headless, throwaway harness in the scratchpad, never committed)

Printed with the base page CSS plus `coverCss` around a cover block through `paginateBlocks`, root zoom 1.33333 so one unit is one point, then viewed as PNG:

- Light submitted survey ("Bois de la Colline", 32 / 50, "Niveau : assez forte"): one page. Forest panel with six sage rings and one moss ring anchored bottom right, clipped at the panel edge; the logo disc on a white rounded tile; "Relevé IBP" in pale green with the subtitle; the title in white on one line; the date in pale green; the numeral "32" with "/ 50" and an outlined pill on a solid forest backing, left of the rings so no line crosses text. Below the panel: two tiles with rings (orange arc 20 / 35 moyenne, green arc 12 / 15 forte), arcs start at 12 o'clock; six facts in two columns with hairlines, ending around y 780 of 840, about 100 units of calm paper above the footer. Footer "Page 1 / 1".
- Draft v3.0 (24 / 50): the pale-red banner "Brouillon, non soumis" sits right under the panel and does not touch the tiles (they start 24 lower); the provisional line "Score provisoire : 2 facteurs non renseignés" is readable in pale green under the pill; the large "Brouillon" watermark is drawn in the light part only; with no parcel, the Commune, Parcelle(s), Année and Version cells all read "Non renseigné(e)", the observer cell is gone and "Méthode IBP v3.0" moved up to the fifth place (left column, third row).
- Long name (70 and 76 characters, three parcels, long observer): the title switches to 20 / 24 and takes three lines inside its 84-unit box without touching the date; the parcel list reads "77186000AB0123, 77186000AB0124, …" and the observer "Jean-Baptiste de la Tour…", both inside the cell.
- Survey without scores: "Non renseigné" in place of the numeral, no pill; both tiles show an empty grey ring and "Non renseigné"; the rest of the page unchanged. Every case is one page.

Chrome only: WebKit and Skia are for plan 33-14 (probe items P-2 ring `rotate(-90)`, P-3 `slice`, P-5 letter-spacing -3 are all used here; their fallbacks are one-line changes: `ring-svg.ts` for P-2, the contour attribute for P-3, the numeral CSS for P-5).

## Deviations from Plan

- Both tasks were committed together in one commit (`e0c192b7`): the light part and the panel share one file and one test file, written together, so a split commit would have been artificial. Task 2's acceptance greps and coverage run are green.
- [Rule 2 - robustness] With no usable logo the eyebrow and subtitle move to x 40 (class `cover-bare`) instead of floating at x 144 next to an empty space. With a logo they are at (144, 56) and (144, 76) as specified.
- [Rule 2 - determinism] The observer value is shortened by the builder (`shortenText` at `COVER_FACT_MAX_CHARS`), like the parcel list, since CSS ellipsis is not used (UI-SPEC B.2).
- The sub-score tile width is 249.5 and the fact cell 245.5 (half-units from the 515 column), so the left offsets 265.5 and 269.5 are not on the 4-grid; this follows the UI-SPEC arithmetic exactly.

None of the three changes any binding number of B.4.

## Known Stubs

None.

## Threat Flags

None. T-33-23 (HTML injection) is covered by escaped output tests with `<b>`, quotes, a `<script>` and an event-handler string; T-33-24 (remote image) by tests that a null, `https:`, SVG or quote-carrying logo value gives no `img` and no `https:`.

## Notes for the next plans

- 33-13 registers the section: `buildCoverBlocks` / `coverCss` as id `cover`, modes `["complete"]`, first; remove the old score card (the cover carries the total, both sub-scores, band names and the provisional line).
- The fake palette of the test lists the 30 keys of `PdfPalette` (incl. the forest keys); a section test needs them all.
- The block height 740 is nominal: a cover page is full (the body is 595 x 840 from (0, 0) for the cover kind), and the paginator puts the next block on a new page.
- `cover-score` carries `role="img"` and an `aria-label` from `cover.scoreA11y`; the rings carry `cover.subscoreA11y`.

## Self-Check: PASSED

- FOUND: mobile/src/app/survey-pdf/cover-section.ts
- FOUND: mobile/src/app/survey-pdf/cover-section.test.ts
- FOUND: commit e0c192b7 (feat(33-10))
