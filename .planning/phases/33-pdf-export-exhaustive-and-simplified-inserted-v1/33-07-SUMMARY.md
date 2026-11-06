---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 07
subsystem: pdf-export
tags: [pdf, svg, ring, factor-chart, trend, score-bands]
requires:
  - phase: 33-02
    provides: "export mode, forest palette keys"
  - phase: 33-03
    provides: "sectionTitleCss in styles.ts"
  - phase: 33-04
    provides: "strings of the cover and the summary"
provides:
  - "buildRingSvg: the static print score ring (cover tiles 64, summary 112)"
  - "scoreBands(scores) and ScoreBand: one source of the band names and tones"
  - "buildFactorChartSvg(..., { captions }): rounder bars, caption row, size-parametric"
  - "resolveTrend(data) with TrendState, trendSummaryParts(trend), restyled buildTrendSvg"
affects: [33-10, 33-11, 33-13, 33-14]
key-files:
  created:
    - mobile/src/app/survey-pdf/ring-svg.ts
    - mobile/src/app/survey-pdf/ring-svg.test.ts
  modified:
    - mobile/src/app/survey-pdf/score-section.ts
    - mobile/src/app/survey-pdf/score-section.test.ts
    - mobile/src/app/survey-pdf/factor-chart-svg.ts
    - mobile/src/app/survey-pdf/factor-chart-svg.test.ts
    - mobile/src/app/survey-pdf/trend-section.ts
    - mobile/src/app/survey-pdf/trend-section.test.ts
key-decisions:
  - "The ring arc is not drawn when its printed length rounds to 0 (a round cap would print a dot), in addition to the ratio 0 rule"
  - "resolveTrend().cachedAt is the long French date only (formatDateFr), not the sentence: the block and the summary each wrap it with fr.surveyExport.trend.cachedAt"
  - "The current trend total gets its own class trend-value-current (Sora-SemiBold 13); past totals keep class trend-value (Sora-Medium 12)"
  - "The chart svg margin switches to 30 only when captions are passed, even if both captions are null, so the plot does not jump when a sub-score is missing"
metrics:
  tasks: 3
  files: 8
  completed: 2026-10-24
status: complete
---

# Phase 33 Plan 07: Print ring, captioned bars, richer trend Summary

The PDF has the worked graphics of D-02 as static, print-safe SVG: a reusable score ring, rounder factor bars captioned with the two sub-scores, a trend curve with a soft area and open past points, and the shared helpers (`scoreBands`, `resolveTrend`, `trendSummaryParts`) the cover (33-10) and the summary (33-11) build on.

## What was built

- `ring-svg.ts`: `buildRingSvg({ size, stroke, ratio, track, arc, label })` returns one `svg` (`role="img"`, escaped `aria-label`), a track circle and, for a ratio above 0, an arc circle of radius `(size - stroke) / 2` with `stroke-dasharray="<c * ratio> <c>"`, `stroke-linecap="round"` and `transform="rotate(-90 c c)"`. Ratio clamped to [0, 1], NaN reads as 0. No opacity, no gradient, no namespace, no import beyond `./html`. Should the device probe of 33-14 reject the rotate, only this function changes.
- `score-section.ts`: `ScoreBand` type and `scoreBands(scores)` (total, stand, context with `points`, `max` 50, 35, 15, `bandName`, `tone`, built from `totalBand`, `standBand`, `contextBand`, `bandTone` and `fr.surveyDetail.bands`). `buildScoreSummaryBlock` now builds its tiles from it and prints the same bytes as before (golden strings of the v3.2 high and mid case, the v3.0 low case and the no-score case are pinned in the test; height 138).
- `factor-chart-svg.ts`: `BAR_RADIUS` 4, `CHART_HEIGHT` 160, `CHART_CAPTION_BOTTOM` 30. `buildFactorChartSvg(entries, palette, size, options?)`: with `options.captions` the bottom margin is 30 and two `text.chart-caption` (Jost-SemiBold 8 `inkMuted`, baseline `height - 3`) are centred under A to G and H to J; a null caption prints nothing; the letters sit 13 under the plot in both cases (the same place as before without captions). No options gives the summary picture (299 x 156 uses the margin 18). `buildFactorChartBlock` passes `t.scores.stand(points)` and `t.scores.context(points)` of `data.scores` (null when not a finite number); the block is 214 high (20 + 24 + 160 + 10); heading rule through `sectionTitleCss(".chart-heading")`, card radius 12, `.chart-svg` 493 x 160.
- `trend-section.ts`: a `path.trend-area` per segment (segment path, then down to `TREND_PLOT_BOTTOM` at the last and first x, `Z`, fill `accentSoft`, no stroke) drawn first; past points r 4, `paper` fill, `accent` ring 2; current point r 6 solid `accent`; totals Sora-Medium 12 (current Sora-SemiBold 13) in `ink`; years Jost-SemiBold 10 `inkMuted`. `trendSummaryParts` is the exported former `summaryParts`. `TrendState` and `resolveTrend(data)` give `noParcel`, `unavailable`, `first` or `ready { model, hasCurrent, cachedAt }`; `buildTrendBlock` switches on it. Heading through `sectionTitleCss(".trend-heading")`. Texts and heights of every block are unchanged.

## Commits

| Task | Commit | Content |
|------|--------|---------|
| 1 | f74b90ac | buildRingSvg, scoreBands, byte-equal score card |
| 2 | 17b3df49 | rx 4 bars, caption row, CHART_HEIGHT 160, block 214 |
| 3 | ff063d66 | trend area, point and label styles, resolveTrend, trendSummaryParts |

## Verification

- `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/__checks__ --coverage=false`: 33 suites, 745 tests passed.
- `npx tsc --noEmit -p .` (mobile) and `npm run typecheck`: exit 0. `npm run lint`: exit 0.
- `npm run format:check`: only the untracked, pre-existing `.claude/settings.local.json` is reported (not part of this plan, not fixed).
- Before and after check of the trend block with a throwaway script (not committed): for a mixed-method history, the three note blocks and the score card the HTML outside the svg is byte-identical and the heights are equal (350, 53, 66, 53, 138). The chart block grew from 204 to 214 as planned.

## Pinned page counts (build-html.test.ts)

Not edited. The chart block grew by 10 units (204 to 214) and every pinned count held, as the plan predicted; `build-html.test.ts` passes unchanged. The Chrome harness page counts are also unchanged against the baseline of 33-01: v32 4, v30-draft 4, typical 6, typical-conditioned 7, worst 10.

## What I saw (Chrome render, 90 dpi, harness case `typical`)

- Page 1: the "Score par facteur" card has the section title with its accent bar, radius 12, and ten clearly rounded bars (rx 4) in the band colours with the values above and the letters below. The caption row reads "Peuplement et gestion : 20 / 35", centred under A to G, and "Contexte : 12 / 15", centred under H to J, in small muted Jost. The chart sits well inside the card; the page still has about 130 units free under it.
- Page 5: the trend heading carries the accent bar; the curve has a solid pale green area under the line (closed down to the plot bottom, flat baseline), the two past points are open (white fill, dark ring), the current point is solid and larger, the totals are in Sora (the last one, 42, a little larger and bolder), the years in Jost-SemiBold. The per-factor table and the cache line are unchanged.
- The ring is not used by any builder yet (33-10 and 33-11 call it), so it was not rendered; its geometry is checked by the unit tests only. The `rotate(-90)` on Chrome is probe P-2 of the 33-01 harness; the phone engines are confirmed by 33-14.

## Deviations from Plan

None - plan executed as written. Small additions inside the plan's files: the ring skips an arc whose printed length rounds to 0 (the round cap would draw a dot), and the past trend totals keep the class `trend-value` while the current one takes `trend-value trend-value-current`.

## Notes for the next plans

- 33-10 (cover): `buildRingSvg({ size: 64, ... })`, `scoreBands(data.scores)` for the tiles; the ring is a static svg, put the numeral in HTML over or beside it.
- 33-11 (summary): call `buildFactorChartSvg(entries, palette, { width: 299, height: 156 })` with no options (no captions); `resolveTrend(data)`: map `ready` with `hasCurrent === false` to its own unavailable panel and use `cachedAt` (a date; wrap with `fr.surveyExport.trend.cachedAt({ date })`); `trendSummaryParts(state.model.trend)` for the summary line; `buildTrendSvg(model, palette)` is 515 x 128.
- 33-13 removes the `score-summary` block; `scoreSectionCss` and the tile helpers stay until then.

## Known Stubs

None.

## Threat Flags

None (the plan's T-33-16 and T-33-17 are mitigated: label, captions and colours go through `escapeHtml`, numbers through `svgNumber`, ratio clamped, all tested with a `"><script>` label).

## Self-Check: PASSED

- ring-svg.ts, ring-svg.test.ts, 33-07-SUMMARY.md exist; `export function buildRingSvg`, `export function scoreBands`, `export function resolveTrend`, `export function trendSummaryParts`, `CHART_CAPTION_BOTTOM = 30`, `const CHART_HEIGHT = 160`, `const BAR_RADIUS = 4`, `trend-area`, `TREND_PLOT_BOTTOM` all found by grep.
- Commits f74b90ac, 17b3df49 and ff063d66 are in `git log`.
