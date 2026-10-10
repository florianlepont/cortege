import { fr } from "../../i18n"
import { escapeHtml, formatDecimal, svgNumber } from "./html"
import {
  boundsOfRings,
  chooseScaleBar,
  fitFrameToBounds,
  metresPerPixel,
  ringsToPathD,
} from "./map-projection"
import type { MapFrame } from "./map-projection"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The map page of the sheet (phase 25.1, D-06). Three outcomes, all printable offline and none able
// to fail the export: the parcels over the basemap snapshot, the parcels as an outline on a pale
// canvas, or a note when there is no geometry (or no parcel). Pure: the geometry comes from
// `map-projection.ts`, the texts from the catalogue, the colours from the palette. Only `data:`
// URIs are written; the snapshot is checked to be a JPEG data URI before it is inlined.
//
// iOS print rules measured in plan 25.1-07: no CSS columns, no 1 px filled divs. The overlay,
// the canvas, the frame border and the scale bar are therefore SVG shapes and strokes.

const t = fr.surveyExport.map

// Design units of the 595 x 842 page (plan 25.1-07).
const HEADING_HEIGHT = 24
const LINE_HEIGHT = 13
const LINE_PADDING = 6 // 3 above and 3 below a text line
const CARD_MARGIN = 10
const CHARS_PER_LINE = 100 // 9 px Jost over the 515 wide frame, with a margin

// The outline-only frame never zooms past this: a tiny parcel would otherwise give a 10 m scale bar
// longer than the frame (zoom 19 is 0.1 m per pixel at the latitudes of France).
const OUTLINE_MAX_ZOOM = 19
const OUTLINE_PADDING_RATIO = 0.1

// Overlay furniture, in frame units.
const MARGIN = 8
const SCALE_PANEL_HEIGHT = 32
const SCALE_LABEL_BASELINE = 12 // from the panel top
const SCALE_LINE_OFFSET = 24 // from the panel top
const SCALE_TICK = 4
const SCALE_PAD_X = 8
const SCALE_LABEL_CHAR_WIDTH = 5
const SCALE_MAX_SHARE = 0.5 // a bar longer than this share of the frame width is dropped
const NORTH_PANEL_WIDTH = 28
const NORTH_PANEL_HEIGHT = 40
const NORTH_ARROW_TOP = 16 // from the panel top
const NORTH_ARROW_HEIGHT = 20
const NORTH_ARROW_HALF_WIDTH = 6
const NORTH_NOTCH = 5

const JPEG_DATA_URI = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/

const lines = (text: string) => Math.max(1, Math.ceil(text.length / CHARS_PER_LINE))
const textHeight = (text: string) => lines(text) * LINE_HEIGHT + LINE_PADDING

function scaleLabel(metres: number): string {
  return metres >= 1000
    ? t.scaleKm({ km: formatDecimal(metres / 1000) })
    : t.scaleValue({ metres: String(metres) })
}

function scaleBarSvg(frame: MapFrame, palette: PdfPalette): string {
  const bar = chooseScaleBar(metresPerPixel(frame.centerLat, frame.zoom), frame.width)
  if (!(bar.px > 0) || bar.px > frame.width * SCALE_MAX_SHARE) return ""
  const label = scaleLabel(bar.metres)
  const labelWidth = label.length * SCALE_LABEL_CHAR_WIDTH
  const panelWidth = Math.max(bar.px, labelWidth) + 2 * SCALE_PAD_X
  const left = MARGIN
  const top = frame.height - MARGIN - SCALE_PANEL_HEIGHT
  const x1 = left + SCALE_PAD_X
  const x2 = x1 + bar.px
  const lineY = top + SCALE_LINE_OFFSET
  const ink = escapeHtml(palette.ink)
  const stroke = `style="stroke: ${ink}; stroke-width: 1.5"`
  return `<g class="map-scale">
<rect class="map-scale-panel" x="${svgNumber(left)}" y="${svgNumber(top)}" width="${svgNumber(panelWidth)}" height="${SCALE_PANEL_HEIGHT}" rx="3" style="fill: ${escapeHtml(palette.paper)}; fill-opacity: 0.85"></rect>
<text class="map-scale-label" x="${svgNumber(x1)}" y="${svgNumber(top + SCALE_LABEL_BASELINE)}" font-family="${escapeHtml(PDF_FONT_FAMILIES.label)}" font-size="9" style="fill: ${ink}">${escapeHtml(label)}</text>
<line class="map-scale-line" x1="${svgNumber(x1)}" y1="${svgNumber(lineY)}" x2="${svgNumber(x2)}" y2="${svgNumber(lineY)}" ${stroke}></line>
<line class="map-scale-tick" x1="${svgNumber(x1)}" y1="${svgNumber(lineY - SCALE_TICK)}" x2="${svgNumber(x1)}" y2="${svgNumber(lineY + SCALE_TICK)}" ${stroke}></line>
<line class="map-scale-tick" x1="${svgNumber(x2)}" y1="${svgNumber(lineY - SCALE_TICK)}" x2="${svgNumber(x2)}" y2="${svgNumber(lineY + SCALE_TICK)}" ${stroke}></line>
</g>`
}

function northArrowSvg(frame: MapFrame, palette: PdfPalette): string {
  const left = frame.width - MARGIN - NORTH_PANEL_WIDTH
  const top = MARGIN
  const centre = left + NORTH_PANEL_WIDTH / 2
  const tipY = top + NORTH_ARROW_TOP
  const baseY = tipY + NORTH_ARROW_HEIGHT
  const ink = escapeHtml(palette.ink)
  const point = (x: number, y: number) => `${svgNumber(x)} ${svgNumber(y)}`
  const arrow = `M${point(centre, tipY)} L${point(centre + NORTH_ARROW_HALF_WIDTH, baseY)} L${point(centre, baseY - NORTH_NOTCH)} L${point(centre - NORTH_ARROW_HALF_WIDTH, baseY)} Z`
  return `<g class="map-north">
<rect class="map-north-panel" x="${svgNumber(left)}" y="${svgNumber(top)}" width="${NORTH_PANEL_WIDTH}" height="${NORTH_PANEL_HEIGHT}" rx="3" style="fill: ${escapeHtml(palette.paper)}; fill-opacity: 0.85"></rect>
<text x="${svgNumber(centre)}" y="${svgNumber(top + 12)}" text-anchor="middle" font-family="${escapeHtml(PDF_FONT_FAMILIES.label)}" font-size="9" style="fill: ${ink}">${escapeHtml(t.north)}</text>
<path d="${arrow}" style="fill: ${ink}"></path>
</g>`
}

type Polygons = NonNullable<SurveyExportData["map"]>["polygons"]

function overlaySvg(
  polygons: Polygons,
  frame: MapFrame,
  palette: PdfPalette,
  withCanvas: boolean,
): string {
  const canvas = withCanvas
    ? `<rect class="map-canvas" x="0" y="0" width="${frame.width}" height="${frame.height}" style="fill: ${escapeHtml(palette.mapCanvas)}"></rect>\n`
    : ""
  const paths = polygons
    .map(
      (polygon) =>
        `<path class="map-parcel" d="${ringsToPathD(polygon.rings, frame)}" fill-rule="evenodd" style="fill: ${escapeHtml(palette.parcelFill)}; stroke: ${escapeHtml(palette.parcelStroke)}; stroke-width: 1.5; stroke-linejoin: round"></path>`,
    )
    .join("\n")
  const border = `<rect class="map-border" x="0.5" y="0.5" width="${frame.width - 1}" height="${frame.height - 1}" style="fill: none; stroke: ${escapeHtml(palette.line)}; stroke-width: 1"></rect>`
  return `<svg class="map-overlay" width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}">
${canvas}${paths}
${border}
${scaleBarSvg(frame, palette)}
${northArrowSvg(frame, palette)}
</svg>`
}

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
 * The map page: the parcel polygons over the basemap snapshot (projected with the snapshot's own
 * frame), or as an outline on a pale canvas, or a note. The source line is printed with a basemap
 * only: the snapshot's native "Source : IGN" box exists on iOS only when the style carries the
 * cadastre raster (the offline style), so the line is the one attribution that always holds.
 */
export function buildMapBlock(data: SurveyExportData, palette: PdfPalette): PdfBlock {
  if (data.parcelIds.length === 0) {
    return card(`${headingHtml()}\n${noteHtml(t.noParcel)}`, textHeight(t.noParcel))
  }
  const map = data.map
  const polygons = map ? map.polygons : []
  const bounds = boundsOfRings(polygons.flatMap((polygon) => polygon.rings))
  if (!map || !bounds) return noGeometryBlock(data.parcelIds)

  const basemap = map.basemap && JPEG_DATA_URI.test(map.basemap.dataUri) ? map.basemap : null
  let frame: MapFrame
  if (basemap) {
    frame = basemap.frame
  } else {
    const fitted = fitFrameToBounds(bounds, map.frameSize, {
      paddingRatio: OUTLINE_PADDING_RATIO,
      zoomRange: null,
    })
    frame = { ...fitted, zoom: Math.min(fitted.zoom, OUTLINE_MAX_ZOOM) }
  }

  const image = basemap
    ? `<img class="map-image" width="${frame.width}" height="${frame.height}" src="${basemap.dataUri}">`
    : ""
  const frameStyle = `width: ${frame.width}px; height: ${frame.height}px`
  const parcelsLine = `${t.parcels} ${parcelsText(data.parcelIds)}`
  const trailing = basemap ? t.source : t.outlineOnly
  const trailingHtml = basemap
    ? `<p class="map-source">${escapeHtml(t.source)}</p>`
    : noteHtml(t.outlineOnly)
  const inner = `${headingHtml()}
<div class="map-frame" style="${frameStyle}">${image}${overlaySvg(polygons, frame, palette, !basemap)}</div>
${parcelsHtml(data.parcelIds)}
${trailingHtml}`
  return card(inner, frame.height + textHeight(parcelsLine) + textHeight(trailing))
}

/** CSS of the map page; every class is prefixed `map-`, every colour is a palette value. */
export function mapSectionCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  return `
.map-card { display: block; margin: 0 0 ${CARD_MARGIN}px; }
.map-heading { margin: 0; height: ${HEADING_HEIGHT}px; font-family: ${font.heading}; font-size: 11px; line-height: ${HEADING_HEIGHT}px; color: ${palette.ink}; }
.map-frame { position: relative; }
.map-image { position: absolute; left: 0; top: 0; display: block; }
.map-overlay { position: absolute; left: 0; top: 0; display: block; }
.map-legend { margin: 0; padding: 3px 0; font-family: ${font.body}; font-size: 9px; line-height: ${LINE_HEIGHT}px; color: ${palette.ink}; }
.map-legend-label { font-family: ${font.label}; color: ${palette.inkMuted}; }
.map-note { margin: 0; padding: 3px 0; font-family: ${font.body}; font-size: 9px; line-height: ${LINE_HEIGHT}px; color: ${palette.inkMuted}; }
.map-source { margin: 0; padding: 3px 0; font-family: ${font.body}; font-size: 8px; line-height: ${LINE_HEIGHT}px; color: ${palette.inkMuted}; }
`
}
