import { FACTOR_KEYS } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { factorTone, MAX_FACTOR_POINTS } from "../ibp-display"
import { escapeHtml, formatDecimal, svgNumber } from "./html"
import { filledPoints, toneColor } from "./score-section"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The ten-bar chart of the sheet's "Score IBP" band (phase 25.1, D-07): one bar per factor A to J,
// its height the retained points out of 5, its colour the app's `factorTone` mapped to the band
// colours, a gap between G (stand) and H (context). Pure: the SVG holds only `svgNumber`
// coordinates, factor letters, palette values and catalogue text, never survey text.

const t = fr.surveyExport

type Entries = SurveyExportData["factorEntries"]

/** Room kept above the bars for the value labels and under them for the letters. */
export const CHART_MARGIN = { top: 18, bottom: 18 } as const

const PAD_X = 4
const BAR_GAP = 10
const GROUP_GAP = 26 // between G and H
const GROUP_BREAK_AFTER = 6 // index of G
const VALUE_FONT_SIZE = 9
const VALUE_OFFSET = 4
const LETTER_FONT_SIZE = 10
const LETTER_OFFSET = 5
const OUTLINE_WIDTH = 1
const GRID_WIDTH = 0.5
const BAR_RADIUS = 2

/** Chart size in design units: the content width of the page and a short plot. */
const CHART_WIDTH = 515
const CHART_HEIGHT = 150
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

/** The chart as one `svg` element, drawn on its own at `size` design units. */
export function buildFactorChartSvg(
  entries: Entries,
  palette: PdfPalette,
  size: { width: number; height: number },
): string {
  const font = PDF_FONT_FAMILIES
  const plotHeight = Math.max(1, size.height - CHART_MARGIN.top - CHART_MARGIN.bottom)
  const baseline = CHART_MARGIN.top + plotHeight
  const barWidth = Math.max(
    1,
    (size.width - 2 * PAD_X - (FACTOR_KEYS.length - 2) * BAR_GAP - GROUP_GAP) / FACTOR_KEYS.length,
  )
  const grid = Array.from({ length: MAX_FACTOR_POINTS + 1 }, (_, level) => {
    const y = baseline - (level / MAX_FACTOR_POINTS) * plotHeight
    return `<line class="chart-grid" x1="${svgNumber(PAD_X)}" y1="${svgNumber(y)}" x2="${svgNumber(size.width - PAD_X)}" y2="${svgNumber(y)}" stroke="${escapeHtml(palette.chartGrid)}" stroke-width="${svgNumber(GRID_WIDTH)}"/>`
  }).join("")

  let x = PAD_X
  const drawn = FACTOR_KEYS.map((factor, index) => {
    const barX = x
    x += barWidth + (index === GROUP_BREAK_AFTER ? GROUP_GAP : BAR_GAP)
    const points = pointsOf(entries, factor)
    const centre = barX + barWidth / 2
    const letter = `<text class="chart-letter" x="${svgNumber(centre)}" y="${svgNumber(size.height - LETTER_OFFSET)}" text-anchor="middle" font-family="${escapeHtml(font.label)}" font-size="${svgNumber(LETTER_FONT_SIZE)}" fill="${escapeHtml(palette.inkMuted)}">${factor}</text>`
    const geometry = `data-factor="${factor}" x="${svgNumber(barX)}" y="${svgNumber(CHART_MARGIN.top)}" width="${svgNumber(barWidth)}"`
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

  return `<svg class="chart-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(t.scores.chartA11y)}" width="${svgNumber(size.width)}" height="${svgNumber(size.height)}" viewBox="0 0 ${svgNumber(size.width)} ${svgNumber(size.height)}">${grid}${drawn}</svg>`
}

/** The chart card: its heading and the SVG at the content width of the page. */
export function buildFactorChartBlock(data: SurveyExportData, palette: PdfPalette): PdfBlock {
  const svg = buildFactorChartSvg(data.factorEntries, palette, {
    width: SVG_WIDTH,
    height: CHART_HEIGHT,
  })
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
  const font = PDF_FONT_FAMILIES
  return `
.chart-card { display: block; box-sizing: border-box; margin: 0 0 ${CARD_MARGIN}px; padding: 10px; border: 1px solid ${palette.line}; border-radius: 6px; background: ${palette.panel}; }
.chart-heading { margin: 0; height: ${CARD_HEADING}px; font-family: ${font.heading}; font-size: 11px; line-height: ${CARD_HEADING}px; color: ${palette.ink}; }
.chart-svg { display: block; width: ${SVG_WIDTH}px; height: ${CHART_HEIGHT}px; }
`
}
