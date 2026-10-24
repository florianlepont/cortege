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
// Phase 33 (D-02, UI-SPEC B.5): rounder bars (rx 4), a caption row under the letters in the
// complete PDF ("Peuplement et gestion : N / 35" under A to G, "Contexte : N / 15" under H to J),
// and a size-parametric function the summary calls at 299 x 156 without captions.

const t = fr.surveyExport

type Entries = SurveyExportData["factorEntries"]

/** Room kept above the bars for the value labels and under them for the letters. */
export const CHART_MARGIN = { top: 18, bottom: 18 } as const
/** Bottom margin when the caption row is printed: the letters, then the two captions. */
const CHART_CAPTION_BOTTOM = 30

const PAD_X = 4
const BAR_GAP = 10
const GROUP_GAP = 26 // between G and H
const GROUP_BREAK_AFTER = 6 // index of G
const VALUE_FONT_SIZE = 9
const VALUE_OFFSET = 4
const LETTER_FONT_SIZE = 10
const LETTER_BELOW_PLOT = 13 // letter baseline under the plot, with or without captions
const CAPTION_FONT_SIZE = 8
const CAPTION_OFFSET = 3 // caption baseline above the bottom edge
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

/** The two caption texts of the complete PDF; a null one prints nothing for its group. */
export type ChartCaptions = { stand: string | null; context: string | null }

/**
 * The chart as one `svg` element, drawn on its own at `size` design units. With `options.captions`
 * the bottom margin grows to hold the caption row; without it the margin and the picture are those
 * of the summary.
 */
export function buildFactorChartSvg(
  entries: Entries,
  palette: PdfPalette,
  size: { width: number; height: number },
  options?: { captions?: ChartCaptions },
): string {
  const font = PDF_FONT_FAMILIES
  const captions = options?.captions
  const marginBottom = captions ? CHART_CAPTION_BOTTOM : CHART_MARGIN.bottom
  const plotHeight = Math.max(1, size.height - CHART_MARGIN.top - marginBottom)
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
  const barXs = FACTOR_KEYS.map((_, index) => {
    const barX = x
    x += barWidth + (index === GROUP_BREAK_AFTER ? GROUP_GAP : BAR_GAP)
    return barX
  })
  const drawn = FACTOR_KEYS.map((factor, index) => {
    const barX = barXs[index]
    const points = pointsOf(entries, factor)
    const centre = barX + barWidth / 2
    const letter = `<text class="chart-letter" x="${svgNumber(centre)}" y="${svgNumber(baseline + LETTER_BELOW_PLOT)}" text-anchor="middle" font-family="${escapeHtml(font.label)}" font-size="${svgNumber(LETTER_FONT_SIZE)}" fill="${escapeHtml(palette.inkMuted)}">${factor}</text>`
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

  // The centre of a group of bars, for its caption.
  const groupCentre = (first: number, last: number): number =>
    (barXs[first] + barXs[last] + barWidth) / 2
  const caption = (text: string | null, centre: number): string =>
    text === null || text === ""
      ? ""
      : `<text class="chart-caption" x="${svgNumber(centre)}" y="${svgNumber(size.height - CAPTION_OFFSET)}" text-anchor="middle" font-family="${escapeHtml(font.label)}" font-size="${svgNumber(CAPTION_FONT_SIZE)}" fill="${escapeHtml(palette.inkMuted)}">${escapeHtml(text)}</text>`
  const captionRow = captions
    ? caption(captions.stand, groupCentre(0, GROUP_BREAK_AFTER)) +
      caption(captions.context, groupCentre(GROUP_BREAK_AFTER + 1, FACTOR_KEYS.length - 1))
    : ""

  return `<svg class="chart-svg" role="img" aria-label="${escapeHtml(t.scores.chartA11y)}" width="${svgNumber(size.width)}" height="${svgNumber(size.height)}" viewBox="0 0 ${svgNumber(size.width)} ${svgNumber(size.height)}">${grid}${drawn}${captionRow}</svg>`
}

const isPoints = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value)

/** The chart card: its heading and the SVG at the content width of the page, sub-scores captioned. */
export function buildFactorChartBlock(data: SurveyExportData, palette: PdfPalette): PdfBlock {
  const stand = data.scores?.ibp_peuplement_gestion
  const context = data.scores?.ibp_contexte
  const svg = buildFactorChartSvg(
    data.factorEntries,
    palette,
    { width: SVG_WIDTH, height: CHART_HEIGHT },
    {
      captions: {
        stand: isPoints(stand) ? t.scores.stand(stand) : null,
        context: isPoints(context) ? t.scores.context(context) : null,
      },
    },
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
