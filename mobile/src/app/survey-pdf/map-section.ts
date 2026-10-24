import { fr } from "../../i18n"
import { escapeHtml } from "./html"
import { buildMapFigure, mapFigureCss } from "./map-figure"
import { sectionTitleCss } from "./styles"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The map page of the sheet (phase 25.1, D-06; figure extracted in phase 33, D-12). Three outcomes,
// all printable offline and none able to fail the export: the parcels over the basemap snapshot,
// the parcels as an outline on a pale canvas, or a note when there is no geometry (or no parcel).
// The figure itself (overlay, scale bar, north arrow, JPEG check) is `map-figure.ts`, shared with
// the one-page summary; this module adds the heading, the parcels line and the source or outline
// note around it, and sizes the block.

const t = fr.surveyExport.map

// Design units of the 595 x 842 page (plan 25.1-07).
const HEADING_HEIGHT = 24
const LINE_HEIGHT = 13
const LINE_PADDING = 6 // 3 above and 3 below a text line
const CARD_MARGIN = 10
const CHARS_PER_LINE = 100 // 9 px Jost over the 515 wide frame, with a margin

const lines = (text: string) => Math.max(1, Math.ceil(text.length / CHARS_PER_LINE))
const textHeight = (text: string) => lines(text) * LINE_HEIGHT + LINE_PADDING

function headingHtml(): string {
  return `<h2 class="map-heading">${escapeHtml(t.heading)}</h2>`
}

function noteHtml(text: string): string {
  return `<p class="map-note">${escapeHtml(text)}</p>`
}

function parcelsText(ids: string[]): string {
  return ids.join(", ")
}

function parcelsHtml(ids: string[]): string {
  return `<p class="map-legend"><span class="map-legend-label">${escapeHtml(t.parcels)}</span> ${escapeHtml(parcelsText(ids))}</p>`
}

function card(inner: string, height: number): PdfBlock {
  return {
    id: "map",
    html: `<section class="map-card">\n${inner}\n</section>`,
    height: HEADING_HEIGHT + height + CARD_MARGIN,
    breakBefore: true,
  }
}

function noGeometryBlock(ids: string[]): PdfBlock {
  const parcels = parcelsText(ids)
  return card(
    `${headingHtml()}\n${noteHtml(t.noOutline)}\n${parcelsHtml(ids)}`,
    textHeight(t.noOutline) + textHeight(`${t.parcels} ${parcels}`),
  )
}

/**
 * The map page: the parcel figure (basemap snapshot with the projected parcels, or an outline on a
 * pale canvas), or a note. The source line is printed with a basemap only: the snapshot's native
 * "Source : IGN" box exists on iOS only when the style carries the cadastre raster (the offline
 * style), so the line is the one attribution that always holds.
 */
export function buildMapBlock(data: SurveyExportData, palette: PdfPalette): PdfBlock {
  if (data.parcelIds.length === 0) {
    return card(`${headingHtml()}\n${noteHtml(t.noParcel)}`, textHeight(t.noParcel))
  }
  const figure = buildMapFigure(data.map, palette)
  if (figure.kind === "noGeometry") return noGeometryBlock(data.parcelIds)

  const parcelsLine = `${t.parcels} ${parcelsText(data.parcelIds)}`
  const trailing = figure.hasBasemap ? t.source : t.outlineOnly
  const trailingHtml = figure.hasBasemap
    ? `<p class="map-source">${escapeHtml(t.source)}</p>`
    : noteHtml(t.outlineOnly)
  const inner = `${headingHtml()}
${figure.html}
${parcelsHtml(data.parcelIds)}
${trailingHtml}`
  return card(inner, figure.frame.height + textHeight(parcelsLine) + textHeight(trailing))
}

/** CSS of the map page; every class is prefixed `map-`, every colour is a palette value. */
export function mapSectionCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  return `${mapFigureCss(palette)}
.map-card { display: block; margin: 0 0 ${CARD_MARGIN}px; }
${sectionTitleCss(".map-heading", palette)}
.map-legend { margin: 0; padding: 3px 0; font-family: ${font.body}; font-size: 9px; line-height: ${LINE_HEIGHT}px; color: ${palette.ink}; }
.map-legend-label { font-family: ${font.label}; color: ${palette.inkMuted}; }
.map-note { margin: 0; padding: 3px 0; font-family: ${font.body}; font-size: 9px; line-height: ${LINE_HEIGHT}px; color: ${palette.inkMuted}; }
.map-source { margin: 0; padding: 3px 0; font-family: ${font.body}; font-size: 8px; line-height: ${LINE_HEIGHT}px; color: ${palette.inkMuted}; }
`
}
