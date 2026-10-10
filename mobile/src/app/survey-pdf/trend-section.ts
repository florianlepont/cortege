import { fr } from "../../i18n"
import type { ParcelHistoryModel } from "../parcel-history"
import {
  TREND_HEIGHT,
  TREND_VALUE_OFFSET,
  TREND_YEAR_BASELINE,
  buildTrend,
} from "../trend-geometry"
import { escapeHtml, formatDecimal, svgNumber } from "./html"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfPalette } from "./types"

// The parcel trend of the sheet (phase 25.1, D-06b, D-13): the curve of the totals, drawn as an SVG
// string from the geometry the "Historique de la parcelle" page uses (`trend-geometry.ts`), and the
// block around it. Pure: the arithmetic stays in `parcel-history.ts` and `trend-geometry.ts`, the
// wording in `fr.parcelHistory` and `fr.surveyExport.trend`, the colours in the palette.

const t = fr.surveyExport.trend
const unknownYear = fr.parcelHistory.page.trend.unknownYear

/** Width of the curve in design units: the content column of the page. */
export const TREND_PRINT_WIDTH = 515

// Same sizes as `TrendCurve.tsx`; no animation in print.
const SEGMENT_WIDTH = 3
const LINK_WIDTH = 2
const LINK_DASH = "4 4"
const POINT_RADIUS = 4
const CURRENT_RADIUS = 6
const CURRENT_STROKE_WIDTH = 2
const LABEL_FONT_SIZE = 12

const attr = (value: string): string => escapeHtml(value)

/** The geometry writes path numbers with two decimals; print them with `svgNumber` like the rest. */
const pathData = (d: string): string =>
  d.replace(/-?\d+(?:\.\d+)?/g, (match) => svgNumber(Number(match)))

/** The curve of the totals as one `svg` element; segments, dashed links, points, totals and years. */
export function buildTrendSvg(model: ParcelHistoryModel, palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  const geometry = buildTrend(model.drawn, TREND_PRINT_WIDTH)

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
        ? `<circle class="trend-point-current" cx="${svgNumber(point.x)}" cy="${svgNumber(point.y)}" r="${svgNumber(CURRENT_RADIUS)}" fill="${attr(palette.ink)}" stroke="${attr(palette.accent)}" stroke-width="${svgNumber(CURRENT_STROKE_WIDTH)}"/>`
        : `<circle class="trend-point" cx="${svgNumber(point.x)}" cy="${svgNumber(point.y)}" r="${svgNumber(POINT_RADIUS)}" fill="${attr(palette.accent)}"/>`,
    )
    .join("")
  const values = geometry.points
    .map(
      (point) =>
        `<text class="trend-value" x="${svgNumber(point.x)}" y="${svgNumber(point.y - TREND_VALUE_OFFSET)}" text-anchor="middle" font-family="${attr(font.numeral)}" font-size="${svgNumber(LABEL_FONT_SIZE)}" fill="${attr(palette.ink)}">${escapeHtml(formatDecimal(point.total))}</text>`,
    )
    .join("")
  const years = geometry.points
    .map(
      (point) =>
        `<text class="trend-year" x="${svgNumber(point.x)}" y="${svgNumber(TREND_YEAR_BASELINE)}" text-anchor="middle" font-family="${attr(font.label)}" font-size="${svgNumber(LABEL_FONT_SIZE)}" fill="${attr(palette.inkMuted)}">${escapeHtml(point.year !== null ? formatDecimal(point.year, 0) : unknownYear)}</text>`,
    )
    .join("")

  return `<svg class="trend-svg" role="img" aria-label="${attr(t.curveA11y)}" width="${svgNumber(TREND_PRINT_WIDTH)}" height="${svgNumber(TREND_HEIGHT)}" viewBox="0 0 ${svgNumber(TREND_PRINT_WIDTH)} ${svgNumber(TREND_HEIGHT)}">${segments}${links}${circles}${values}${years}</svg>`
}
