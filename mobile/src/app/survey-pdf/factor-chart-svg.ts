import { FACTOR_KEYS, STAND_FACTOR_KEYS } from "@cortege/ibp-domain"
import type { FactorKey } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { factorTone } from "../ibp-display"
import { escapeHtml, formatDecimal } from "./html"
import { buildPlaneSvg } from "./plane-svg"
import type { PlaneInput } from "./plane-svg"
import { buildRoseSvg } from "./rose-svg"
import type { RoseInput } from "./rose-svg"
import {
  contextLevels,
  filledPoints,
  roseRingScores,
  scoreBands,
  standZones,
} from "./score-section"
import { sectionTitleCss } from "./styles"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The chart card of the complete PDF (phase 33, D-27, D-28, UI-SPEC B.5 amendment (charts)): our own
// static redrawing of the two charts of the CNPF survey sheet, side by side, with a source line.
// On the left the plane "IBP contexte face à l'IBP peuplement et gestion" (stand and management
// score on x with five tinted bands, context score on y, the survey as one marker), on the right
// the ten-axis rose (rings at the scores a factor may take, the polygon of the survey, the factor
// names around it). Both are pure builders (`plane-svg.ts`, `rose-svg.ts`) that draw what they are
// given: this module computes their inputs from the domain package and the catalogue, so every cut
// point, maximum, band, tone, group and ring score comes from `@cortege/ibp-domain` and no rule is
// written here. The bars of phase 25.1 and the group panels of D-26 are gone (D-28 amends them):
// the groups are carried by the plane's two axes and by the ink of the rose's names. The summary
// calls `buildPlaneSvg` itself (the plane only) with `planeInput`.

const t = fr.surveyExport

/** The plane and the rose sit in a 493 x 160 row: 272 + 12 + 209. */
const PLANE_SIZE = { width: 272, height: 160 } as const
const ROSE_SIZE = { width: 209, height: 160 } as const
const ROSE_LEFT = 284
const ROW_WIDTH = 493
const ROW_HEIGHT = 160
const SOURCE_HEIGHT = 12
// Card padding, border, heading and margin around the row: 20 + 2 + 24 + 160 + 12 + 10 = 228.
const CARD_PADDING = 20 // 10 left and right, 10 top and bottom
const CARD_BORDER = 2 // 1 left and right, 1 top and bottom (counted since plan 33-19, U-26)
const CARD_HEADING = 24
const CARD_MARGIN = 10

const isPoints = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value)

/**
 * The two group labels (D-26, D-27): the group name followed by its sub-score out of 35 or 15 when
 * the domain gave a finite one, else the name alone. They title the plane's axes. The numbers are
 * `data.scores`, never a sum made by the builder (T-33-43).
 */
export function chartGroupLabels(scores: SurveyExportData["scores"]): {
  stand: string
  context: string
} {
  const stand = scores?.ibp_peuplement_gestion
  const context = scores?.ibp_contexte
  return {
    stand: isPoints(stand) ? t.scores.stand(stand) : t.scores.groupNames.stand,
    context: isPoints(context) ? t.scores.context(context) : t.scores.groupNames.context,
  }
}

function listOf(values: readonly number[]): string {
  return t.charts.joinList({ items: values.map((value) => formatDecimal(value, 0)) })
}

/**
 * What the plane draws for a survey (D-27): the two sub-scores of the domain (null when missing or
 * not finite, which draws no marker), the zones and levels read from the package, the axis titles
 * and the spoken label. The cuts and the maxima in the label come from the zone bounds.
 */
export function planeInput(data: SurveyExportData): PlaneInput {
  const bands = scoreBands(data.scores)
  const zones = standZones()
  const levels = contextLevels()
  const stand = isPoints(bands.stand.points) ? bands.stand.points : null
  const context = isPoints(bands.context.points) ? bands.context.points : null
  const standMax = formatDecimal(zones[zones.length - 1].to, 0)
  const contextMax = formatDecimal(levels[levels.length - 1].to, 0)
  const standCuts = listOf(zones.slice(1).map((zone) => zone.from))
  const contextCuts = listOf(levels.slice(1).map((level) => level.from))
  const titles = chartGroupLabels(data.scores)
  const label =
    stand !== null && context !== null
      ? t.charts.planeA11y({
          stand: formatDecimal(stand),
          standMax,
          standBand: bands.stand.bandName ?? "",
          context: formatDecimal(context),
          contextMax,
          contextBand: bands.context.bandName ?? "",
          standCuts,
          contextCuts,
        })
      : t.charts.planeA11yEmpty({ standCuts, standMax, contextCuts, contextMax })
  return {
    stand,
    context,
    standZones: zones,
    contextLevels: levels,
    xTitle: titles.stand,
    yTitle: titles.context,
    label,
  }
}

const STAND_KEYS: readonly string[] = STAND_FACTOR_KEYS

function pointsOf(data: SurveyExportData, factor: FactorKey): number | null {
  const entry = data.factorEntries.find(([key]) => key === factor)?.[1]
  const points = filledPoints(entry)
  return isPoints(points) ? points : null
}

/**
 * What the rose draws for a survey (D-27): the rings at the scores every factor may take with the
 * factor tone of each, one item per factor A to J with the app's title, its points (null when the
 * factor is missing) and its group, and the spoken label that lists every value.
 */
export function roseInput(data: SurveyExportData): RoseInput {
  const rings = roseRingScores().map((value) => ({ value, tone: factorTone(value) }))
  const items = FACTOR_KEYS.map((factor) => ({
    factor,
    title: fr.labels.factorTitles[factor],
    points: pointsOf(data, factor),
    group: STAND_KEYS.includes(factor) ? ("stand" as const) : ("context" as const),
  }))
  const label = t.charts.roseA11y({
    rings: t.charts.joinList({ items: rings.map((ring) => formatDecimal(ring.value)) }),
    items: t.charts.joinList({
      items: items.map((item) =>
        t.charts.roseItem({
          title: item.title,
          value:
            item.points === null ? t.scores.notFilled.toLowerCase() : formatDecimal(item.points),
        }),
      ),
    }),
  })
  return { rings, items, label }
}

/**
 * The chart card: its heading, the plane (272 x 160) and the rose (209 x 160) in one row, and the
 * source line. The card is `panel`, so both charts are drawn on `paper`.
 */
export function buildFactorChartBlock(data: SurveyExportData, palette: PdfPalette): PdfBlock {
  const plane = buildPlaneSvg(planeInput(data), palette, PLANE_SIZE, {
    title: t.charts.planeTitle,
    fill: palette.paper,
  })
  const rose = buildRoseSvg(roseInput(data), palette, ROSE_SIZE, {
    title: t.scores.chartHeading,
    fill: palette.paper,
  })
  const html = `<section class="chart-card">
<h2 class="chart-heading">${escapeHtml(t.charts.heading)}</h2>
<div class="chart-row">${plane}${rose}</div>
<div class="chart-source">${escapeHtml(t.charts.source)}</div>
</section>`
  return {
    id: "factor-chart",
    html,
    height: CARD_PADDING + CARD_BORDER + CARD_HEADING + ROW_HEIGHT + SOURCE_HEIGHT + CARD_MARGIN,
  }
}

/** CSS of the chart card; every class is prefixed `chart-`, every colour is a palette value. */
export function factorChartCss(palette: PdfPalette): string {
  return `
.chart-card { display: block; box-sizing: border-box; margin: 0 0 ${CARD_MARGIN}px; padding: 10px; border: 1px solid ${palette.line}; border-radius: 12px; background: ${palette.panel}; }
${sectionTitleCss(".chart-heading", palette)}
.chart-row { position: relative; width: ${ROW_WIDTH}px; height: ${ROW_HEIGHT}px; }
.chart-plane { position: absolute; left: 0; top: 0; display: block; width: ${PLANE_SIZE.width}px; height: ${PLANE_SIZE.height}px; }
.chart-rose { position: absolute; left: ${ROSE_LEFT}px; top: 0; display: block; width: ${ROSE_SIZE.width}px; height: ${ROSE_SIZE.height}px; }
.chart-source { height: ${SOURCE_HEIGHT}px; overflow: hidden; white-space: nowrap; font-family: ${PDF_FONT_FAMILIES.body}; font-size: 8px; line-height: ${SOURCE_HEIGHT}px; color: ${palette.inkMuted}; }
`
}
