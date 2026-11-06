---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 11
subsystem: mobile-pdf-export
tags: [pdf, summary, survey-pdf, ui-spec-b10]
requires: [33-03, 33-04, 33-07, 33-08]
provides:
  - buildSummaryBlocks, summaryCss, SUMMARY_ZONES (mobile/src/app/survey-pdf/summary-section.ts)
affects: [33-13]
tech-stack:
  patterns: [absolute-positioned fixed zones with hidden overflow, solid colours only, builder-side shortening]
key-files:
  created:
    - mobile/src/app/survey-pdf/summary-section.ts
    - mobile/src/app/survey-pdf/summary-section.test.ts
  modified: []
decisions:
  - "Without a usable logo the Z1 texts move to x 0 and take the full 515 width (class summary-bare), as the cover does"
  - "A missing commune, parcel or version in the meta line reads 'non renseignée' (feminine, lower case), taken from identity.noParcel, instead of the table word 'Non renseigné'"
  - "A site name beyond 72 characters is shortened by the builder with one ellipsis; the long title box is 48 high so a cut never shows half a third line"
metrics:
  tasks: 2
  files: 2
  completed: 2026-10-24
status: complete
---

# Phase 33 Plan 11: One-page summary Summary

The one-page summary of D-07 and D-08 is built as one pure block: five fixed zones (title band, score row, map, evolution, sources) with explicit heights and hidden overflow, so it is always exactly one page. It is not in the registry yet (plan 33-13 does that).

## What was built

- `summary-section.ts`: `buildSummaryBlocks(data, palette)` returns one block `{ id: "summary", pageStyle: "summary", height: 764 }` (`SUMMARY_BODY_HEIGHT`); `summaryCss(palette)` starts with `mapFigureCss(palette)`; `SUMMARY_ZONES` is frozen: title `[0, 88]`, score `[100, 176]`, map `[288, 264]`, evolution `[564, 168]`, sources `[740, 24]` (88 + 12 + 176 + 12 + 264 + 12 + 168 + 8 + 24 = 764, tested).
- Z1: logo 72 at (0, 0) only when it matches `PDF_LOGO_DATA_URI`; eyebrow and long date at y 4; site name at (88, 16) in a 427 x 56 box (`summary-title-long`, 20 / 24, from 49 characters); meta line at y 72 shortened to 95 characters; the 1 unit rule at y 88 (in the gap, outside the zone box).
- Z2 left: 200 x 176 forest card (radius 16) with "Score IBP", the 112 `buildRingSvg` (track `forestDeep`, arc `onForestAccent`, ratio total / 50), the Sora-Light 40 / 44 numeral (letter-spacing -2) and "/ 50" centred by an absolute 112 box with flex column, the band line at y 140, the sub-scores at y 156. No total: empty ring, "Non renseigné", no band line.
- Z2 right: heading and `buildFactorChartSvg(entries, palette, { width: 299, height: 156 })` with no captions.
- Z3: heading, `buildMapFigure` in a 515 x 228 box, legend at y 248 (parcels shortened to 110, or `map.outlineOnly` without a basemap). No parcel: quiet panel `map.noParcel`; parcels but no geometry: quiet panel `map.noOutline`; no legend in either.
- Z4: heading, the `trendSummaryParts` line (`font.title` 13 `accent`, then `font.body` 13 `ink`) and `buildTrendSvg` at y 40 when `resolveTrend` is ready and holds this survey; else a quiet 515 x 128 panel: `trend.first`, `summary.trendUnavailable` (no history, or a stale cache without this survey), `trend.noParcel`. `trend.unavailable` (the app instruction) never appears (tested on all fixtures).
- Z5: `trend.cachedAt` only when the curve is drawn and the cache date is readable, `map.source` only with a basemap.

## Verification

- `npx jest -c jest.unit.config.js src/app/survey-pdf/summary-section.test.ts src/__checks__ --coverage=false`: 8 suites, 174 tests, all pass (79 in the summary test). `src/app/survey-pdf src/__checks__`: 37 suites, 893 tests, all pass.
- Coverage of `summary-section.ts`: statements 100, branches 97.43, functions 100, lines 100 (thresholds 95 / 90 / 100 / 95 pass). The one uncovered branch is the `parts === null` of the trend line, unreachable through `resolveTrend` (a "none" trend with the current survey present is a first survey).
- `npx tsc --noEmit -p .` (mobile), `npm run lint` and `npm run typecheck` (root): exit 0.
- `npm run format:check`: the only warning is the pre-existing untracked `.claude/settings.local.json` (not part of this plan, left alone); both new files are formatted.
- Page loop: `exportFixtureSummary`, `exportFixtureSummaryWorst` and the six `summaryVariant` kinds all paginate to `pageCount` 1 with class `page-summary`, no header, no banner, no watermark and no "Page" text.

## Renders (Chrome headless, throwaway harness in the scratchpad, never committed)

Printed with the base page CSS plus `summaryCss` around the block through `paginateBlocks`, root zoom 1.33333, real fonts, the real logo and a real JPEG as basemap (1030 x 456), then viewed as PNG. Every case is exactly one A4 page (`pdfinfo` Pages 1 for all ten; 61 to 127 KB each, no photo).

- `exportFixtureSummary` (typical): logo disc top left, "Résumé du relevé IBP" over "Bois de la Colline" in forest green, the date right, the meta line "Commune 77186, parcelle 77186000AB0001, version 2" above the rule. Forest card with the pale ring about two thirds filled, "32" and "/ 50" centred inside, "Niveau : assez forte" and "20 / 35 peuplement, 12 / 15 contexte" under it; to its right "Score par facteur" and ten rounded bars (orange, red, green by band) with the gap between G and H and no caption row. The map frame with the parcel overlay, scale bar and north arrow, "Parcelles 77186000AB0001" under it. "Évolution de la parcelle", "+8 points depuis 2023" (bold green then regular), the three-point curve with its soft area, the current point solid. Two source lines (cache date, IGN) above the footer line; the footer reads "Généré le ... / Cortège" with no page number.
- `exportFixtureSummaryWorst` (64 character name, three parcels, six history points): the name in two lines at 20 / 24 inside the band, the meta line with the three ids on one line, three parcel polygons, the legend listing the three ids, the six-point curve with the dashed method link between 2020 and 2021 and "+12 points depuis 2021".
- Worst case for width (80 characters of W and M, cut to 72): two clean lines, nothing under the second, no half line (this showed a half third line before the long title box was set to 48 high, now fixed).
- `noBasemap`: pale canvas with the parcel outline, scale bar and north arrow, legend "Fond de carte non disponible sur cet appareil : contour des parcelles seul.", and only the cache line in the sources.
- `noGeometry`: Z3 is a quiet rounded panel with "Contour des parcelles non disponible sur cet appareil." centred; the evolution zone unchanged; no legend.
- `noParcel`: both Z3 and Z4 are quiet panels ("Aucune parcelle liée à ce relevé." and "Aucune parcelle liée à ce relevé : pas d'historique."), the meta line reads "Commune non renseignée, parcelle non renseignée, version 2" after the fix; the sources zone is empty.
- `noHistory` and `staleCache`: the quiet panel "Évolution de la parcelle non disponible sur cet appareil." under the heading, no summary line, no cache line, the IGN source kept. `firstSurvey`: the quiet panel "Premier relevé de cette parcelle : pas encore d'évolution à montrer.".
- No scores: the ring is an empty dark track with "Non renseigné" inside, no band, no sub-scores line, ten outlined empty bars with their letters; the rest unchanged.

Chrome only: WebKit and Skia are for plan 33-14. The flex-centred numeral box, `letter-spacing: -2px` (probe P-5, fallback 0 and size 38), `rotate(-90)` ring (P-2) and the rounded JPEG clip of the shared figure (P-4) are the engine-dependent parts of this page; the fallbacks are one-line changes in `summaryCss`, `ring-svg.ts` and `MAP_FRAME_RADIUS`.

## Deviations from Plan

- Both tasks were committed together in one commit (`9643f47e`): they share one source file and one test file, written together, so a split commit would have been artificial. Task 2's acceptance greps and coverage run are green.
- [Rule 2 - robustness] Without a usable logo the eyebrow, title and meta line move to x 0 and take the full 515 width (class `summary-bare`) instead of leaving a hole at x 88 (same choice as the cover). With a logo they are at x 88 as specified.
- [Rule 1 - wording] The plan prints the meta line's missing values with `identity.unknown` ("Non renseigné"), which gave "Commune Non renseigné, parcelle Non renseignée" in the render. A missing commune, parcel or version now prints "non renseignée" in lower case (the three words are feminine), derived from `identity.noParcel`, with no new catalogue string. The case only occurs for a survey without a parcel.
- [Rule 2 - determinism] The site name is shortened by the builder beyond 72 characters, and the long title box is 48 high (two lines of 24) so a cut never shows a third line half drawn. A normal title keeps the 56 box. The full name of a 64 character worst case is printed whole.
- The rule at y 88 is a sibling of the title zone, not inside it (the zone is 88 high with hidden overflow), in the 12-unit gap before the score row.

None of the four changes any binding number of B.10.

## Known Stubs

None.

## Threat Flags

None. T-33-25 (HTML injection) is covered by tests with `<b>`, quotes and ampersands in the site name and `<i>` in a parcel id (escaped everywhere); T-33-26 (misleading trend) by `summaryVariant("staleCache")` printing the quiet unavailable panel and no cache line; T-33-27 (remote image) by tests that a null, `https:`, SVG or quote-carrying logo value gives no `summary-logo` image, and by the shared figure's JPEG check.

## Notes for the next plans

- 33-13 registers the section: `buildSummaryBlocks` / `summaryCss` as id `summary`, modes `["summary"]`, the only section of that mode. The block height is `SUMMARY_BODY_HEIGHT` (764), nominal: the paginator puts a page-style block alone on its page.
- The shared map figure keeps its own `fill-opacity: 0.85` on the scale and north panels (shipping since 25.1; UI-SPEC B.2 keeps such values). The plan's "no opacity in the HTML" is therefore tested on the summary's own HTML with the figure removed; the CSS holds none.
- The fake palette of the test lists the 30 keys of `PdfPalette`; `forestDeep` is used in the ring SVG (HTML), the other forest keys in the CSS.
- A summary of a survey whose basemap frame is not 515 x 228 is clipped to the 515 x 228 box (the loader sets `SUMMARY_MAP_FRAME_SIZE`, so this holds in the app).
- Known engine item for 33-14: the numeral and "/ 50" are centred with a flex column box (no `gap`); if WebKit print mis-centres it, make the two lines absolute at y 36 and 80 of the ring box.

## Self-Check: PASSED

- FOUND: mobile/src/app/survey-pdf/summary-section.ts
- FOUND: mobile/src/app/survey-pdf/summary-section.test.ts
- FOUND: commit 9643f47e (feat(33-11))
