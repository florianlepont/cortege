import { fr } from "../../i18n"
import { CONTOUR_VIEWBOX, buildContourPaths } from "../contour-paths"
import { contourDrift } from "../visual-tokens"
import { COVER_MAP_FRAME_SIZE } from "./export-settings"
import { escapeHtml, formatDateFr, formatDecimal, svgNumber } from "./html"
import { buildMapFigure, mapFigureCss } from "./map-figure"
import { buildRingSvg } from "./ring-svg"
import { countMissingFactors, scoreBands, toneColor } from "./score-section"
import type { ScoreBand } from "./score-section"
import { COVER_PANEL_HEIGHT, DRAFT_BANNER_HEIGHT, PDF_LOGO_DATA_URI } from "./styles"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The cover of the complete PDF (phase 33, D-11, D-02, D-24, UI-SPEC B.4): one fixed block on its
// own page. The top 356 units are a solid forest panel (the app's static contour lines, the logo on a
// paper tile, the brand, the site name, the date and the total score with its band); the light part
// holds the two sub-score tiles and the parcel map with its legend (the identity facts are on page 2,
// and the cover prints no parcel id and no year). The score card's content lives here (research
// lever L5), so the cover costs no extra page and nothing the score card printed is lost (D-01).
// Every position is in page units on the 4-grid, set absolutely: no flex gap, no CSS columns, no
// opacity, gradient, shadow or filter (UI-SPEC B.2), except the translucent scale and north panels
// of the shared map figure, which ship since 25.1. Pure: colours from `PdfPalette`, fonts from
// `PDF_FONT_FAMILIES`, texts from `fr.surveyExport`, every survey text goes through `escapeHtml`.

const t = fr.surveyExport

/** The page block of the cover (UI-SPEC B.4: the body of a cover page is the whole page). */
const COVER_BLOCK_HEIGHT = 740
const PAGE_WIDTH = 595
const CONTENT_X = 40
const CONTENT_WIDTH = 515

// Forest panel.
const LOGO_OFFSET = 40
const LOGO_TILE = 88
const LOGO_SIZE = 72
const LOGO_TILE_RADIUS = 24
const BRAND_X = 144
const TITLE_TOP = 148
const TITLE_WIDTH = 340
const TITLE_HEIGHT = 84
/** A site name this long or longer takes the smaller title (20 / 24 instead of 24 / 28). */
const TITLE_LONG_FROM = 49
const DATE_TOP = 240
const SCORE_TOP = 264
const SCORE_HEIGHT = 72
const PROVISIONAL_TOP = SCORE_TOP + SCORE_HEIGHT
const PILL_GAP = 16
const PILL_HEIGHT = 24

// Light part, from the panel bottom (y values are those of a submitted survey).
const TILES_TOP = 376
const TILE_HEIGHT = 112
const TILE_GAP = 16
const TILE_WIDTH = (CONTENT_WIDTH - TILE_GAP) / 2
const RING_SIZE = 64
const RING_STROKE = 8

// The parcel map zone (D-24): heading, the shared figure in its frame, a one line legend.
const MAP_TOP = 504
const MAP_HEADING_HEIGHT = 20
const MAP_BOX_HEIGHT = COVER_MAP_FRAME_SIZE.height
const MAP_LEGEND_GAP = 4
const MAP_LEGEND_HEIGHT = 12
const MAP_ZONE_HEIGHT = MAP_HEADING_HEIGHT + MAP_BOX_HEIGHT + MAP_LEGEND_GAP + MAP_LEGEND_HEIGHT
const MAP_LEGEND_TOP = MAP_HEADING_HEIGHT + MAP_BOX_HEIGHT + MAP_LEGEND_GAP

function titleHtml(siteName: string): string {
  const long = siteName.length >= TITLE_LONG_FROM
  return `<div class="cover-title${long ? " cover-title-long" : ""}">${escapeHtml(siteName)}</div>`
}

function logoHtml(logoDataUri: string | null): string {
  if (logoDataUri === null || !PDF_LOGO_DATA_URI.test(logoDataUri)) return ""
  return `<div class="cover-logo-tile"><img class="cover-logo" alt="" src="${escapeHtml(logoDataUri)}"></div>`
}

function contoursHtml(palette: PdfPalette): string {
  const { sage, moss } = buildContourPaths(7)
  return `<svg class="cover-contours" aria-hidden="true" width="${PAGE_WIDTH}" height="${COVER_PANEL_HEIGHT}" viewBox="${CONTOUR_VIEWBOX}" preserveAspectRatio="xMaxYMax slice"><path d="${sage}" fill="none" stroke="${escapeHtml(palette.contourSage)}" stroke-width="${contourDrift.sageWidth}"/><path d="${moss}" fill="none" stroke="${escapeHtml(palette.contourMoss)}" stroke-width="${contourDrift.mossWidth}"/></svg>`
}

function scoreRowHtml(total: ScoreBand): string {
  if (total.points === null) {
    return `<div class="cover-score"><span class="cover-noscore">${escapeHtml(t.scores.notFilled)}</span></div>`
  }
  const points = formatDecimal(total.points, 0)
  const label = t.cover.scoreA11y({ points, max: String(total.max) })
  const pill = total.bandName
    ? `<span class="cover-pill">${escapeHtml(t.scores.band({ band: total.bandName }))}</span>`
    : ""
  return `<div class="cover-score" role="img" aria-label="${escapeHtml(label)}"><span class="cover-numeral">${escapeHtml(points)}</span><span class="cover-outof">${escapeHtml(t.cover.outOf({ max: String(total.max) }))}</span>${pill}</div>`
}

function panelHtml(data: SurveyExportData, palette: PdfPalette): string {
  const logo = logoHtml(data.assets.logoDataUri)
  const bare = logo === "" ? " cover-bare" : ""
  const bands = scoreBands(data.scores)
  const missing = countMissingFactors(data.factorEntries)
  const provisional =
    data.isDraft && missing > 0
      ? `<div class="cover-provisional">${escapeHtml(t.scores.provisional({ count: missing }))}</div>`
      : ""
  return `<div class="cover-panel">${contoursHtml(palette)}${logo}<div class="cover-eyebrow${bare}">${escapeHtml(t.sheetTitle)}</div><div class="cover-subtitle${bare}">${escapeHtml(t.sheetSubtitle)}</div>${titleHtml(data.siteName)}<div class="cover-date">${escapeHtml(formatDateFr(data.dateIso, t.identity.unknown))}</div>${scoreRowHtml(bands.total)}${provisional}</div>`
}

function tileHtml(heading: string, band: ScoreBand, left: number, palette: PdfPalette): string {
  const box = `class="cover-tile" style="left: ${svgNumber(left)}px"`
  if (band.points === null) {
    const ring = buildRingSvg({
      size: RING_SIZE,
      stroke: RING_STROKE,
      ratio: 0,
      track: palette.chartGrid,
      arc: palette.chartGrid,
      label: t.cover.subscoreA11y({ heading, points: t.scores.notFilled, max: String(band.max) }),
    })
    return `<div ${box}><div class="cover-tile-ring">${ring}</div><div class="cover-tile-heading">${escapeHtml(heading)}</div><div class="cover-tile-empty">${escapeHtml(t.scores.notFilled)}</div></div>`
  }
  const tone = band.tone === null ? palette.bandTrack : toneColor(band.tone, palette)
  const points = formatDecimal(band.points, 0)
  const ring = buildRingSvg({
    size: RING_SIZE,
    stroke: RING_STROKE,
    ratio: band.points / band.max,
    track: palette.chartGrid,
    arc: tone,
    label: t.cover.subscoreA11y({ heading, points, max: String(band.max) }),
  })
  const bandLine = band.bandName
    ? `<div class="cover-tile-band"><span class="cover-tile-dot" style="background: ${escapeHtml(tone)}"></span>${escapeHtml(t.scores.band({ band: band.bandName }))}</div>`
    : ""
  return `<div ${box}><div class="cover-tile-ring">${ring}</div><div class="cover-tile-heading">${escapeHtml(heading)}</div><div class="cover-tile-value"><span class="cover-tile-numeral">${escapeHtml(points)}</span><span class="cover-tile-outof">${escapeHtml(t.cover.outOf({ max: String(band.max) }))}</span></div>${bandLine}</div>`
}

/** A quiet panel for a map that cannot be drawn: a sentence on a `panel` box, no legend line. */
function quietHtml(text: string): string {
  return `<div class="cover-quiet">${escapeHtml(text)}</div>`
}

/** The parcel map zone: the figure and its legend, or a quiet panel (no parcel, no geometry). */
function mapZoneHtml(data: SurveyExportData, palette: PdfPalette, top: number): string {
  const open = `<div class="cover-map" style="top: ${top}px">`
  const heading = `<div class="cover-map-heading">${escapeHtml(t.map.heading)}</div>`
  if (data.parcelIds.length === 0) return `${open}${heading}${quietHtml(t.map.noParcel)}</div>`
  const figure = buildMapFigure(data.map, palette)
  if (figure.kind === "noGeometry") return `${open}${heading}${quietHtml(t.map.noOutline)}</div>`
  const legend = figure.hasBasemap ? t.map.source : t.map.outlineOnly
  return `${open}${heading}<div class="cover-map-box">${figure.html}</div><div class="cover-map-legend">${escapeHtml(legend)}</div></div>`
}

/**
 * The cover block. A draft moves the whole light part down by the banner height: the banner strip
 * of a draft cover is 368 to 386, the tiles start at 400 and the map zone ends at 792, above the
 * footer line at 804.
 */
export function buildCoverBlocks(data: SurveyExportData, palette: PdfPalette): PdfBlock[] {
  const shift = data.isDraft ? DRAFT_BANNER_HEIGHT : 0
  const bands = scoreBands(data.scores)
  const tiles = `<div class="cover-tiles" style="top: ${TILES_TOP + shift}px">${tileHtml(t.scores.standHeading, bands.stand, 0, palette)}${tileHtml(t.scores.contextHeading, bands.context, TILE_WIDTH + TILE_GAP, palette)}</div>`
  const map = mapZoneHtml(data, palette, MAP_TOP + shift)
  const html = `<div class="cover-page">${panelHtml(data, palette)}${tiles}${map}</div>`
  return [{ id: "cover", pageStyle: "cover", height: COVER_BLOCK_HEIGHT, html }]
}

/** CSS of the cover; every class is prefixed `cover-`, every colour is a palette value. */
export function coverCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  const abs = "position: absolute;"
  return `
.cover-page { ${abs} left: 0; top: 0; width: ${PAGE_WIDTH}px; height: 840px; overflow: hidden; }
.cover-panel { ${abs} left: 0; top: 0; width: ${PAGE_WIDTH}px; height: ${COVER_PANEL_HEIGHT}px; overflow: hidden; background: ${palette.forest}; }
.cover-contours { ${abs} left: 0; top: 0; }
.cover-logo-tile { ${abs} left: ${LOGO_OFFSET}px; top: ${LOGO_OFFSET}px; width: ${LOGO_TILE}px; height: ${LOGO_TILE}px; border-radius: ${LOGO_TILE_RADIUS}px; background: ${palette.paper}; }
.cover-logo { ${abs} left: 8px; top: 8px; width: ${LOGO_SIZE}px; height: ${LOGO_SIZE}px; }
.cover-eyebrow { ${abs} left: ${BRAND_X}px; top: 56px; height: 16px; font-family: ${font.title}; font-size: 13px; line-height: 16px; white-space: nowrap; color: ${palette.onForestAccent}; }
.cover-subtitle { ${abs} left: ${BRAND_X}px; top: 76px; height: 13px; font-family: ${font.body}; font-size: 9px; line-height: 13px; white-space: nowrap; color: ${palette.onForestBody}; }
.cover-bare { left: ${CONTENT_X}px; }
.cover-title { ${abs} left: ${CONTENT_X}px; top: ${TITLE_TOP}px; width: ${TITLE_WIDTH}px; height: ${TITLE_HEIGHT}px; overflow: hidden; font-family: ${font.heading}; font-size: 24px; line-height: 28px; color: ${palette.onForest}; }
.cover-title-long { font-size: 20px; line-height: 24px; }
.cover-date { ${abs} left: ${CONTENT_X}px; top: ${DATE_TOP}px; height: 16px; font-family: ${font.body}; font-size: 12px; line-height: 16px; white-space: nowrap; color: ${palette.onForestBody}; }
.cover-score { ${abs} left: ${CONTENT_X}px; top: ${SCORE_TOP}px; height: ${SCORE_HEIGHT}px; line-height: ${SCORE_HEIGHT}px; white-space: nowrap; }
.cover-numeral { font-family: ${font.numeral}; font-size: 64px; line-height: ${SCORE_HEIGHT}px; letter-spacing: -3px; color: ${palette.onForest}; }
.cover-outof { margin-left: 6px; font-family: ${font.body}; font-size: 20px; line-height: 24px; color: ${palette.onForestBody}; }
.cover-noscore { font-family: ${font.body}; font-size: 20px; line-height: 24px; color: ${palette.onForestBody}; }
.cover-pill { display: inline-block; box-sizing: border-box; height: ${PILL_HEIGHT}px; margin-left: ${PILL_GAP}px; padding: 0 12px; border: 1px solid ${palette.onForestAccent}; border-radius: 999px; vertical-align: middle; background: ${palette.forest}; font-family: ${font.label}; font-size: 9px; line-height: 22px; color: ${palette.onForestAccent}; }
.cover-provisional { ${abs} left: ${CONTENT_X}px; top: ${PROVISIONAL_TOP}px; height: 13px; font-family: ${font.body}; font-size: 9px; line-height: 13px; white-space: nowrap; color: ${palette.onForestAccent}; }
.cover-tiles { ${abs} left: ${CONTENT_X}px; width: ${CONTENT_WIDTH}px; height: ${TILE_HEIGHT}px; }
.cover-tile { ${abs} top: 0; box-sizing: border-box; width: ${TILE_WIDTH}px; height: ${TILE_HEIGHT}px; border: 1px solid ${palette.line}; border-radius: 12px; background: ${palette.panel}; }
.cover-tile-ring { ${abs} left: 16px; top: 24px; width: ${RING_SIZE}px; height: ${RING_SIZE}px; }
.cover-tile-heading { ${abs} left: 96px; top: 16px; width: ${TILE_WIDTH - 96 - 8}px; height: 12px; overflow: hidden; font-family: ${font.label}; font-size: 8.5px; line-height: 12px; white-space: nowrap; color: ${palette.inkMuted}; }
.cover-tile-value { ${abs} left: 96px; top: 32px; height: 32px; line-height: 32px; white-space: nowrap; }
.cover-tile-numeral { font-family: ${font.numeral}; font-size: 24px; line-height: 32px; color: ${palette.ink}; }
.cover-tile-outof { margin-left: 4px; font-family: ${font.body}; font-size: 12px; line-height: 32px; color: ${palette.inkMuted}; }
.cover-tile-empty { ${abs} left: 96px; top: 32px; height: 32px; font-family: ${font.body}; font-size: 12px; line-height: 32px; white-space: nowrap; color: ${palette.inkMuted}; }
.cover-tile-band { ${abs} left: 96px; top: 72px; height: 16px; font-family: ${font.body}; font-size: 9px; line-height: 16px; white-space: nowrap; color: ${palette.ink}; }
.cover-tile-dot { display: inline-block; width: 8px; height: 8px; margin-right: 4px; border-radius: 4px; }
.cover-map { ${abs} left: ${CONTENT_X}px; width: ${CONTENT_WIDTH}px; height: ${MAP_ZONE_HEIGHT}px; }
.cover-map-heading { ${abs} left: 0; top: 0; width: ${CONTENT_WIDTH}px; height: ${MAP_HEADING_HEIGHT}px; overflow: hidden; white-space: nowrap; font-family: ${font.heading}; font-size: 11px; line-height: ${MAP_HEADING_HEIGHT}px; color: ${palette.ink}; }
.cover-map-box { ${abs} left: 0; top: ${MAP_HEADING_HEIGHT}px; width: ${CONTENT_WIDTH}px; height: ${MAP_BOX_HEIGHT}px; overflow: hidden; }
.cover-map-legend { ${abs} left: 0; top: ${MAP_LEGEND_TOP}px; width: ${CONTENT_WIDTH}px; height: ${MAP_LEGEND_HEIGHT}px; overflow: hidden; white-space: nowrap; font-family: ${font.body}; font-size: 8px; line-height: ${MAP_LEGEND_HEIGHT}px; color: ${palette.inkMuted}; }
.cover-quiet { ${abs} left: 0; top: ${MAP_HEADING_HEIGHT}px; box-sizing: border-box; width: ${CONTENT_WIDTH}px; height: ${MAP_BOX_HEIGHT}px; overflow: hidden; padding: 0 24px; display: flex; align-items: center; justify-content: center; text-align: center; border: 1px solid ${palette.line}; border-radius: 12px; background: ${palette.panel}; font-family: ${font.body}; font-size: 9px; line-height: 13px; color: ${palette.inkMuted}; }
${mapFigureCss(palette)}`
}
