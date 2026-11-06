import { fr } from "../../i18n"
import { MAX_FACTOR_POINTS } from "../ibp-display"
import { buildEntriesFromOwn, buildParcelHistory } from "../parcel-history"
import type { DeltaCardState, ParcelHistoryModel, TrendSummary } from "../parcel-history"
import {
  TREND_HEIGHT,
  TREND_PLOT_BOTTOM,
  TREND_VALUE_OFFSET,
  TREND_YEAR_BASELINE,
  buildTrend,
} from "../trend-geometry"
import { escapeHtml, formatDateFr, formatDecimal, svgNumber } from "./html"
import { sectionTitleCss } from "./styles"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The parcel trend of the sheet (phase 25.1, D-06b, D-13): the curve of the totals, drawn as an SVG
// string from the geometry the "Historique de la parcelle" page uses (`trend-geometry.ts`), and the
// block around it. Pure: the arithmetic stays in `parcel-history.ts` and `trend-geometry.ts`, the
// wording in `fr.parcelHistory` and `fr.surveyExport.trend`, the colours in the palette.
// Phase 33 (D-02, D-18, UI-SPEC B.5): a soft solid area under each segment, open past points, a
// solid larger current point, Sora totals and Jost-SemiBold years; and `resolveTrend` /
// `trendSummaryParts`, the one place where the one-page summary and the complete
// PDF read the trend state and its summary line.

const t = fr.surveyExport.trend
const screenTexts = fr.parcelHistory.page
const unknownYear = screenTexts.trend.unknownYear

/** Width of the curve in design units: the content column of the page. */
export const TREND_PRINT_WIDTH = 515

// Same sizes as `TrendCurve.tsx`; no animation in print.
const SEGMENT_WIDTH = 3
const LINK_WIDTH = 2
const LINK_DASH = "4 4"
const POINT_RADIUS = 4
const POINT_STROKE_WIDTH = 2
const CURRENT_RADIUS = 6
const VALUE_FONT_SIZE = 12
const CURRENT_VALUE_FONT_SIZE = 13
const YEAR_FONT_SIZE = 10

const attr = (value: string): string => escapeHtml(value)

/** The geometry writes path numbers with two decimals; print them with `svgNumber` like the rest. */
const pathData = (d: string): string =>
  d.replace(/-?\d+(?:\.\d+)?/g, (match) => svgNumber(Number(match)))

/**
 * The closed area under one segment: the segment path, then down to the plot bottom at its last and
 * first x, closed. The geometry writes a segment as `M x y L x y ...`, so its first and last pairs
 * of numbers are the first and last points.
 */
function areaPathOf(segmentD: string, baselineY: number): string {
  const numbers = segmentD.match(/-?\d+(?:\.\d+)?/g) ?? []
  const firstX = numbers[0] ?? "0"
  const lastX = numbers[numbers.length - 2] ?? firstX
  const base = svgNumber(baselineY)
  return `${pathData(segmentD)} L ${svgNumber(Number(lastX))} ${base} L ${svgNumber(Number(firstX))} ${base} Z`
}

/** The curve of the totals as one `svg` element; segments, dashed links, points, totals and years. */
export function buildTrendSvg(model: ParcelHistoryModel, palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  const geometry = buildTrend(model.drawn, TREND_PRINT_WIDTH)

  const areas = geometry.segments
    .map(
      (segment) =>
        `<path class="trend-area" d="${attr(areaPathOf(segment.d, TREND_PLOT_BOTTOM))}" fill="${attr(palette.accentSoft)}" stroke="none"/>`,
    )
    .join("")
  const segments = geometry.segments
    .map(
      (segment) =>
        `<path class="trend-segment" d="${attr(pathData(segment.d))}" fill="none" stroke="${attr(palette.accent)}" stroke-width="${svgNumber(SEGMENT_WIDTH)}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("")
  const links = geometry.links
    .map(
      (link) =>
        `<path class="trend-link" d="${attr(pathData(link.d))}" fill="none" stroke="${attr(palette.inkMuted)}" stroke-width="${svgNumber(LINK_WIDTH)}" stroke-dasharray="${LINK_DASH}"/>`,
    )
    .join("")
  const circles = geometry.points
    .map((point) =>
      point.isCurrent
        ? `<circle class="trend-point-current" cx="${svgNumber(point.x)}" cy="${svgNumber(point.y)}" r="${svgNumber(CURRENT_RADIUS)}" fill="${attr(palette.accent)}"/>`
        : `<circle class="trend-point" cx="${svgNumber(point.x)}" cy="${svgNumber(point.y)}" r="${svgNumber(POINT_RADIUS)}" fill="${attr(palette.paper)}" stroke="${attr(palette.accent)}" stroke-width="${svgNumber(POINT_STROKE_WIDTH)}"/>`,
    )
    .join("")
  const values = geometry.points
    .map((point) => {
      const family = point.isCurrent ? font.heading : font.strong
      const size = point.isCurrent ? CURRENT_VALUE_FONT_SIZE : VALUE_FONT_SIZE
      const className = point.isCurrent ? "trend-value trend-value-current" : "trend-value"
      return `<text class="${className}" x="${svgNumber(point.x)}" y="${svgNumber(point.y - TREND_VALUE_OFFSET)}" text-anchor="middle" font-family="${attr(family)}" font-size="${svgNumber(size)}" fill="${attr(palette.ink)}">${escapeHtml(formatDecimal(point.total))}</text>`
    })
    .join("")
  const years = geometry.points
    .map(
      (point) =>
        `<text class="trend-year" x="${svgNumber(point.x)}" y="${svgNumber(TREND_YEAR_BASELINE)}" text-anchor="middle" font-family="${attr(font.label)}" font-size="${svgNumber(YEAR_FONT_SIZE)}" fill="${attr(palette.inkMuted)}">${escapeHtml(point.year !== null ? formatDecimal(point.year, 0) : unknownYear)}</text>`,
    )
    .join("")

  return `<svg class="trend-svg" role="img" aria-label="${attr(t.curveA11y)}" width="${svgNumber(TREND_PRINT_WIDTH)}" height="${svgNumber(TREND_HEIGHT)}" viewBox="0 0 ${svgNumber(TREND_PRINT_WIDTH)} ${svgNumber(TREND_HEIGHT)}">${areas}${segments}${links}${circles}${values}${years}</svg>`
}

// ---- the block ------------------------------------------------------------------------------

// Design units of the 595 x 842 page (plan 25.1-07).
const HEADING_HEIGHT = 24
const SUMMARY_HEIGHT = 22
const LINE_HEIGHT = 13
const LINE_PADDING = 6 // 3 above and 3 below a text line
const CARD_MARGIN = 10
const SECTION_GAP = 6
const CHARS_PER_LINE = 100 // 9 px Jost over the 515 wide column, with a margin
const DELTA_TITLE_HEIGHT = 20
const DELTA_TOTAL_HEIGHT = 16
const DELTA_ROW_HEIGHT = 16
const DELTA_ROWS_PER_COLUMN = 5 // ten factors in two explicit columns (iOS print ignores CSS columns)

const lines = (text: string) => Math.max(1, Math.ceil(text.length / CHARS_PER_LINE))
const textHeight = (text: string) => lines(text) * LINE_HEIGHT + LINE_PADDING

const headingHtml = (): string => `<h2 class="trend-heading">${escapeHtml(t.heading)}</h2>`

function noteBlock(text: string): PdfBlock {
  return {
    id: "trend",
    html: `<section class="trend-card">\n${headingHtml()}\n<p class="trend-note">${escapeHtml(text)}</p>\n</section>`,
    height: HEADING_HEIGHT + textHeight(text) + CARD_MARGIN,
  }
}

/** The two parts of the summary line, worded like `TrendCard`; null when the trend is "none". */
export function trendSummaryParts(trend: TrendSummary): [string, string] | null {
  if (trend.kind === "none") return null
  if (trend.kind === "change") {
    return [
      screenTexts.trend.titleStrong(trend.delta),
      screenTexts.trend.titleAccent(trend.sinceYear),
    ]
  }
  const strong =
    trend.method === null
      ? screenTexts.trend.newMethodUnknown
      : screenTexts.trend.newMethodStrong(trend.method)
  return [strong, trend.year === null ? "" : screenTexts.trend.newMethodAccent(trend.year)]
}

function summaryHtml(parts: [string, string]): string {
  const [strong, accent] = parts
  const accentHtml =
    accent === "" ? "" : `<span class="trend-summary-accent">${escapeHtml(accent)}</span>`
  return `<p class="trend-summary"><span class="trend-summary-strong">${escapeHtml(strong)}</span>${accentHtml}</p>`
}

function deltaColor(delta: number | null, palette: PdfPalette): string {
  if (delta === null || delta === 0) return palette.inkMuted
  return delta > 0 ? palette.accent : palette.alert
}

type DeltaRow = Extract<DeltaCardState, { kind: "card" }>["rows"][number]

function deltaRowHtml(row: DeltaRow, palette: PdfPalette): string {
  const points =
    row.points === null
      ? fr.surveyExport.scores.notFilled
      : fr.surveyExport.scores.outOf({
          points: formatDecimal(row.points),
          max: String(MAX_FACTOR_POINTS),
        })
  const value = row.delta === null ? screenTexts.deltas.none : screenTexts.deltas.value(row.delta)
  const color = escapeHtml(deltaColor(row.delta, palette))
  return `<div class="trend-delta-row" data-factor="${escapeHtml(row.factor)}"><span class="trend-delta-letter">${escapeHtml(row.factor)}</span><span class="trend-delta-points">${escapeHtml(points)}</span><span class="trend-delta-value" style="color: ${color}">${escapeHtml(value)}</span></div>`
}

/** The per-factor part: its HTML and height, or null when the screen would show nothing. */
function deltasPart(
  state: DeltaCardState,
  palette: PdfPalette,
): { html: string; height: number } | null {
  if (state.kind === "hidden") return null
  if (state.kind === "differentMethod") {
    return {
      html: `<p class="trend-note">${escapeHtml(t.differentMethod)}</p>`,
      height: textHeight(t.differentMethod),
    }
  }
  const title =
    state.titleYear === null
      ? t.deltaHeadingNoYear
      : t.deltaHeading({ year: formatDecimal(state.titleYear, 0) })
  const rows = state.rows.map((row) => deltaRowHtml(row, palette))
  const columns = [rows.slice(0, DELTA_ROWS_PER_COLUMN), rows.slice(DELTA_ROWS_PER_COLUMN)]
  const grid = columns
    .map((column) => `<div class="trend-delta-column">${column.join("")}</div>`)
    .join("")
  return {
    html: `<h3 class="trend-delta-title">${escapeHtml(title)}</h3>
<p class="trend-delta-total">${escapeHtml(screenTexts.deltas.total(state.total))}</p>
<div class="trend-delta-grid">${grid}</div>`,
    height:
      DELTA_TITLE_HEIGHT +
      DELTA_TOTAL_HEIGHT +
      DELTA_ROWS_PER_COLUMN * DELTA_ROW_HEIGHT +
      SECTION_GAP,
  }
}

/**
 * What the trend of a survey can print: no parcel, no history cached on the phone, the parcel's
 * first survey, or a model ready to draw. `hasCurrent` tells whether the current survey is in the
 * cached history (a stale cache may lack it: the summary then shows its own unavailable panel,
 * the complete PDF draws the past as before); `cachedAt` is the long French cache date, or null.
 */
export type TrendState =
  | { kind: "noParcel" }
  | { kind: "unavailable" }
  | { kind: "first" }
  | { kind: "ready"; model: ParcelHistoryModel; hasCurrent: boolean; cachedAt: string | null }

/** The one place where the trend state of a survey is decided, from the data the export holds. */
export function resolveTrend(data: SurveyExportData): TrendState {
  if (data.parcelIds.length === 0) return { kind: "noParcel" }
  if (data.history === null) return { kind: "unavailable" }
  const entries = buildEntriesFromOwn(data.history.items, data.surveyId)
  const model = buildParcelHistory(entries)
  if (model.isFirst) return { kind: "first" }
  const cachedDate = formatDateFr(data.history.fetchedAt, "")
  return {
    kind: "ready",
    model,
    hasCurrent: entries.some((entry) => entry.isCurrent),
    cachedAt: cachedDate === "" ? null : cachedDate,
  }
}

/**
 * The parcel trend: the summary line, the curve of the totals and the per-factor changes against
 * the survey just before, all from the history cached on the phone; or a short note when the
 * survey has no parcel, no history is cached, or it is the parcel's first survey.
 */
export function buildTrendBlock(data: SurveyExportData, palette: PdfPalette): PdfBlock {
  const state = resolveTrend(data)
  switch (state.kind) {
    case "noParcel":
      return noteBlock(t.noParcel)
    case "unavailable":
      return noteBlock(t.unavailable)
    case "first":
      return noteBlock(t.first)
    default:
      return readyBlock(state.model, state.cachedAt, palette)
  }
}

function readyBlock(
  model: ParcelHistoryModel,
  cachedDate: string | null,
  palette: PdfPalette,
): PdfBlock {
  const parts = trendSummaryParts(model.trend)
  const mixed = model.trend.kind !== "none" && model.trend.mixed
  const deltas = deltasPart(model.deltaCard, palette)
  const cached = cachedDate === null ? null : t.cachedAt({ date: cachedDate })

  const sections = [
    headingHtml(),
    parts === null ? "" : summaryHtml(parts),
    mixed ? `<p class="trend-note">${escapeHtml(screenTexts.trend.mixed)}</p>` : "",
    `<div class="trend-curve">${buildTrendSvg(model, palette)}</div>`,
    deltas === null ? "" : `<div class="trend-deltas">${deltas.html}</div>`,
    cached === null ? "" : `<p class="trend-cached">${escapeHtml(cached)}</p>`,
  ].filter((section) => section !== "")
  const height =
    HEADING_HEIGHT +
    (parts === null ? 0 : SUMMARY_HEIGHT) +
    (mixed ? textHeight(screenTexts.trend.mixed) : 0) +
    TREND_HEIGHT +
    SECTION_GAP +
    (deltas === null ? 0 : deltas.height) +
    (cached === null ? 0 : textHeight(cached)) +
    CARD_MARGIN
  return {
    id: "trend",
    html: `<section class="trend-card">\n${sections.join("\n")}\n</section>`,
    height,
  }
}

/** CSS of the trend section; every class is prefixed `trend-`, every colour is a palette value. */
export function trendSectionCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  return `
.trend-card { display: block; margin: 0 0 ${CARD_MARGIN}px; }
${sectionTitleCss(".trend-heading", palette)}
.trend-summary { margin: 0; height: ${SUMMARY_HEIGHT}px; font-size: 13px; line-height: ${SUMMARY_HEIGHT}px; color: ${palette.ink}; }
.trend-summary-strong { font-family: ${font.title}; color: ${palette.ink}; }
.trend-summary-accent { font-family: ${font.title}; color: ${palette.accent}; }
.trend-note { margin: 0; padding: 3px 0; font-family: ${font.body}; font-size: 9px; line-height: ${LINE_HEIGHT}px; color: ${palette.inkMuted}; }
.trend-curve { margin: 0 0 ${SECTION_GAP}px; height: ${TREND_HEIGHT}px; }
.trend-svg { display: block; width: ${TREND_PRINT_WIDTH}px; height: ${TREND_HEIGHT}px; }
.trend-deltas { margin: 0 0 ${SECTION_GAP}px; }
.trend-delta-title { margin: 0; height: ${DELTA_TITLE_HEIGHT}px; font-family: ${font.heading}; font-size: 10px; line-height: ${DELTA_TITLE_HEIGHT}px; color: ${palette.ink}; }
.trend-delta-total { margin: 0; height: ${DELTA_TOTAL_HEIGHT}px; font-family: ${font.body}; font-size: 9px; line-height: ${DELTA_TOTAL_HEIGHT}px; color: ${palette.inkMuted}; }
.trend-delta-grid { display: flex; }
.trend-delta-column { flex: 1; box-sizing: border-box; padding-right: 16px; }
.trend-delta-column:last-child { padding-right: 0; }
.trend-delta-row { display: flex; height: ${DELTA_ROW_HEIGHT}px; font-size: 9px; line-height: ${DELTA_ROW_HEIGHT}px; border-bottom: 0.5px solid ${palette.line}; }
.trend-delta-letter { width: 18px; font-family: ${font.title}; color: ${palette.ink}; }
.trend-delta-points { flex: 1; font-family: ${font.body}; color: ${palette.ink}; }
.trend-delta-value { width: 40px; font-family: ${font.label}; text-align: right; }
.trend-cached { margin: 0; padding: 3px 0; font-family: ${font.body}; font-size: 8px; line-height: ${LINE_HEIGHT}px; color: ${palette.inkMuted}; }
`
}
