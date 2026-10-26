import { FACTOR_KEYS } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { factorTone, MAX_FACTOR_POINTS } from "../ibp-display"
import { escapeHtml, formatDecimal, svgNumber } from "./html"
import { filledPoints, toneColor } from "./score-section"
import { sectionTitleCss } from "./styles"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The ten-bar chart of the sheet's "Score IBP" band (phase 25.1, D-07): one bar per factor A to J,
// its height the retained points out of 5, its colour the app's `factorTone` mapped to the band
// colours, a gap between G (stand) and H (context). Pure: the SVG holds only `svgNumber`
// coordinates, factor letters, palette values and catalogue text, never survey text.
// Phase 33 (D-02, UI-SPEC B.5): rounder bars (rx 4) and a size-parametric function the summary
// calls at 299 x 156. D-26 (2026-10-26) replaces the caption row under the letters: the two groups
// are solid panels (A to G, H to J) in both PDFs, each with a centred label in a 16 high header
// band ("Peuplement et gestion : N / 35", "Contexte : N / 15"; the group name alone when the
// sub-score is missing). The plot starts under the header and ends where it always did, so the
// block heights (214 complete, 176 summary zone) do not move. Solid fills only: no opacity, no
// gradient (UI-SPEC B.2).

const t = fr.surveyExport

type Entries = SurveyExportData["factorEntries"]

/** Room kept above the bars for the value labels and under them for the letters. */
export const CHART_MARGIN = { top: 18, bottom: 18 } as const
// D-26: the header band of each group panel, its label baseline, size, the panel's side padding
// around its bars and its corner radius.
const GROUP_HEADER = 16
const GROUP_LABEL_BASELINE = 11
const GROUP_LABEL_FONT_SIZE = 8
const GROUP_PADDING = 4
const GROUP_RADIUS = 8
const GROUP_STROKE_WIDTH = 1

const PAD_X = 4
const BAR_GAP = 10
const GROUP_GAP = 26 // between G and H
const GROUP_BREAK_AFTER = 6 // index of G
const VALUE_FONT_SIZE = 9
const VALUE_OFFSET = 4
const LETTER_FONT_SIZE = 10
const LETTER_BELOW_PLOT = 13 // letter baseline under the plot
const OUTLINE_WIDTH = 1
const GRID_WIDTH = 0.5
const BAR_RADIUS = 4

/** Chart size in design units: the content width of the page and a short plot. */
const CHART_WIDTH = 515
const CHART_HEIGHT = 160
// Heading line, card padding and bottom margin around the chart.
const CARD_PADDING = 20 // 10 left and right, 10 top and bottom
const CARD_BORDER = 2 // 1 left and right
const CARD_HEADING = 24
const CARD_MARGIN = 10
/** The svg fills the card's inner width, so it never overflows the content column. */
const SVG_WIDTH = CHART_WIDTH - CARD_PADDING - CARD_BORDER

function clampPoints(points: number): number {
  return Math.min(MAX_FACTOR_POINTS, Math.max(0, points))
}

function pointsOf(entries: Entries, factor: string): number | null {
  const entry = entries.find(([key]) => key === factor)?.[1]
  const points = filledPoints(entry)
  return points !== null && Number.isFinite(points) ? clampPoints(points) : null
}

const isPoints = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value)

/** What the chart prints on its two group panels: the labels and the panel fill (a palette value). */
export type ChartGroups = { stand: string; context: string; fill: string }

/**
 * The two group labels (D-26): the group name followed by its sub-score out of 35 or 15 when the
 * domain gave a finite one, else the name alone. The numbers are `data.scores`, never a sum made by
 * the builder (T-33-43).
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

/**
 * The chart as one `svg` element, drawn on its own at `size` design units: two group panels (A to G
 * and H to J), each with its label in a header band, then the grid, the bars, the values and the
 * letters. The summary calls it at 299 x 156, the complete PDF at 493 x 160.
 */
export function buildFactorChartSvg(
  entries: Entries,
  palette: PdfPalette,
  size: { width: number; height: number },
  groups: ChartGroups,
): string {
  const font = PDF_FONT_FAMILIES
  const plotTop = GROUP_HEADER + CHART_MARGIN.top
  const plotHeight = Math.max(1, size.height - plotTop - CHART_MARGIN.bottom)
  const baseline = plotTop + plotHeight
  const barWidth = Math.max(
    1,
    (size.width - 2 * PAD_X - (FACTOR_KEYS.length - 2) * BAR_GAP - GROUP_GAP) / FACTOR_KEYS.length,
  )

  let x = PAD_X
  const barXs = FACTOR_KEYS.map((_, index) => {
    const barX = x
    x += barWidth + (index === GROUP_BREAK_AFTER ? GROUP_GAP : BAR_GAP)
    return barX
  })

  // Panel 1 holds A to G, panel 2 H to J. Each runs from its first bar minus the padding to its
  // last bar plus the padding, so the gap between them is the G to H gap minus two paddings.
  const panels = [
    { name: "stand", first: 0, last: GROUP_BREAK_AFTER, text: groups.stand },
    {
      name: "context",
      first: GROUP_BREAK_AFTER + 1,
      last: FACTOR_KEYS.length - 1,
      text: groups.context,
    },
  ].map((group) => {
    const left = barXs[group.first] - GROUP_PADDING
    const right = barXs[group.last] + barWidth + GROUP_PADDING
    return { ...group, left, right }
  })
  const drawnPanels = panels
    .map((panel) => {
      const half = GROUP_STROKE_WIDTH / 2
      const rect = `<rect class="chart-group" data-group="${panel.name}" x="${svgNumber(panel.left + half)}" y="${svgNumber(half)}" width="${svgNumber(panel.right - panel.left - GROUP_STROKE_WIDTH)}" height="${svgNumber(size.height - GROUP_STROKE_WIDTH)}" rx="${svgNumber(GROUP_RADIUS)}" fill="${escapeHtml(groups.fill)}" stroke="${escapeHtml(palette.line)}" stroke-width="${svgNumber(GROUP_STROKE_WIDTH)}"/>`
      const label = `<text class="chart-group-label" x="${svgNumber((panel.left + panel.right) / 2)}" y="${svgNumber(GROUP_LABEL_BASELINE)}" text-anchor="middle" font-family="${escapeHtml(font.label)}" font-size="${svgNumber(GROUP_LABEL_FONT_SIZE)}" fill="${escapeHtml(palette.ink)}">${escapeHtml(panel.text)}</text>`
      return `${rect}${label}`
    })
    .join("")

  // The 0 to 5 grid, inside each panel only, so the gap between the panels stays clean.
  const grid = panels
    .flatMap((panel) =>
      Array.from({ length: MAX_FACTOR_POINTS + 1 }, (_, level) => {
        const y = baseline - (level / MAX_FACTOR_POINTS) * plotHeight
        return `<line class="chart-grid" x1="${svgNumber(panel.left + GROUP_PADDING)}" y1="${svgNumber(y)}" x2="${svgNumber(panel.right - GROUP_PADDING)}" y2="${svgNumber(y)}" stroke="${escapeHtml(palette.chartGrid)}" stroke-width="${svgNumber(GRID_WIDTH)}"/>`
      }),
    )
    .join("")

  const drawn = FACTOR_KEYS.map((factor, index) => {
    const barX = barXs[index]
    const points = pointsOf(entries, factor)
    const centre = barX + barWidth / 2
    const letter = `<text class="chart-letter" x="${svgNumber(centre)}" y="${svgNumber(baseline + LETTER_BELOW_PLOT)}" text-anchor="middle" font-family="${escapeHtml(font.label)}" font-size="${svgNumber(LETTER_FONT_SIZE)}" fill="${escapeHtml(palette.inkMuted)}">${factor}</text>`
    const geometry = `data-factor="${factor}" x="${svgNumber(barX)}" y="${svgNumber(plotTop)}" width="${svgNumber(barWidth)}"`
    if (points === null) {
      const outline = `<rect class="chart-bar chart-bar-missing" ${geometry} height="${svgNumber(plotHeight)}" rx="${svgNumber(BAR_RADIUS)}" fill="none" stroke="${escapeHtml(palette.inkFaint)}" stroke-width="${svgNumber(OUTLINE_WIDTH)}"/>`
      return `${outline}${letter}`
    }
    const height = (points / MAX_FACTOR_POINTS) * plotHeight
    const top = baseline - height
    const fill = escapeHtml(toneColor(factorTone(points), palette))
    const bar = `<rect class="chart-bar" data-factor="${factor}" x="${svgNumber(barX)}" y="${svgNumber(top)}" width="${svgNumber(barWidth)}" height="${svgNumber(height)}" rx="${svgNumber(BAR_RADIUS)}" fill="${fill}"/>`
    const value = `<text class="chart-value" x="${svgNumber(centre)}" y="${svgNumber(top - VALUE_OFFSET)}" text-anchor="middle" font-family="${escapeHtml(font.strong)}" font-size="${svgNumber(VALUE_FONT_SIZE)}" fill="${escapeHtml(palette.ink)}">${escapeHtml(formatDecimal(points))}</text>`
    return `${bar}${value}${letter}`
  }).join("")

  return `<svg class="chart-svg" role="img" aria-label="${escapeHtml(t.scores.chartA11y)}" width="${svgNumber(size.width)}" height="${svgNumber(size.height)}" viewBox="0 0 ${svgNumber(size.width)} ${svgNumber(size.height)}">${drawnPanels}${grid}${drawn}</svg>`
}

/**
 * The chart card: its heading and the SVG at the content width of the page. The card is `panel`, so
 * the group panels are `paper` (UI-SPEC B.5 amendment).
 */
export function buildFactorChartBlock(data: SurveyExportData, palette: PdfPalette): PdfBlock {
  const svg = buildFactorChartSvg(
    data.factorEntries,
    palette,
    { width: SVG_WIDTH, height: CHART_HEIGHT },
    { ...chartGroupLabels(data.scores), fill: palette.paper },
  )
  const html = `<section class="chart-card">
<h2 class="chart-heading">${escapeHtml(t.scores.chartHeading)}</h2>
${svg}
</section>`
  return {
    id: "factor-chart",
    html,
    height: CARD_PADDING + CARD_HEADING + CHART_HEIGHT + CARD_MARGIN,
  }
}

/** CSS of the chart card; every class is prefixed `chart-`, every colour is a palette value. */
export function factorChartCss(palette: PdfPalette): string {
  return `
.chart-card { display: block; box-sizing: border-box; margin: 0 0 ${CARD_MARGIN}px; padding: 10px; border: 1px solid ${palette.line}; border-radius: 12px; background: ${palette.panel}; }
${sectionTitleCss(".chart-heading", palette)}
.chart-svg { display: block; width: ${SVG_WIDTH}px; height: ${CHART_HEIGHT}px; }
`
}
