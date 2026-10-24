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
import type { PdfPalette, SurveyExportData } from "./types"

// The parcel figure shared by the complete map section and the one-page summary (phase 33, D-12).
// Three outcomes, all printable offline and none able to fail the export: the parcels over the
// basemap snapshot, the parcels as an outline on a pale canvas (with a scale bar and a north
// arrow), or no geometry at all. The frame comes from the data (the snapshot's own frame, or the
// loader's `frameSize` for the outline), so the loader's frame size decides the figure's size.
// Pure: the geometry comes from `map-projection.ts`, the texts from the catalogue, the colours from
// the palette. Only `data:` URIs are written; the snapshot is checked to be a JPEG data URI before
// it is inlined.
//
// iOS print rules measured in plan 25.1-07: no CSS columns, no 1 px filled divs. The overlay,
// the canvas, the frame border and the scale bar are therefore SVG shapes and strokes.

const t = fr.surveyExport.map

/**
 * Corner radius of the figure frame, in design units. Probe item P-4 (rounded clip of a JPEG):
 * if plan 33-14 finds the clip fails on a device, set this to 0.
 */
export const MAP_FRAME_RADIUS = 12

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

/** The figure, or the fact that there is no geometry to draw. */
export type MapFigure =
  | { kind: "noGeometry" }
  | { kind: "figure"; html: string; frame: MapFrame; hasBasemap: boolean }

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
  // The 1 px stroke is centred on a rect inset by half a pixel, so its outer edge follows the
  // frame's own radius.
  const borderRadius = Math.max(0, MAP_FRAME_RADIUS - 0.5)
  const border = `<rect class="map-border" x="0.5" y="0.5" width="${frame.width - 1}" height="${frame.height - 1}" rx="${svgNumber(borderRadius)}" style="fill: none; stroke: ${escapeHtml(palette.line)}; stroke-width: 1"></rect>`
  return `<svg class="map-overlay" width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}">
${canvas}${paths}
${border}
${scaleBarSvg(frame, palette)}
${northArrowSvg(frame, palette)}
</svg>`
}

/**
 * The parcel figure: the polygons over the basemap snapshot (projected with the snapshot's own
 * frame), or as an outline on a pale canvas fitted at the loader's frame size, or nothing when the
 * map or its polygons are missing. A basemap whose data URI is not a base64 JPEG is dropped and the
 * outline is drawn instead (nothing foreign is ever inlined).
 */
export function buildMapFigure(map: SurveyExportData["map"], palette: PdfPalette): MapFigure {
  const polygons = map ? map.polygons : []
  const bounds = boundsOfRings(polygons.flatMap((polygon) => polygon.rings))
  if (!map || !bounds) return { kind: "noGeometry" }

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
  const html = `<div class="map-frame" style="${frameStyle}">${image}${overlaySvg(polygons, frame, palette, !basemap)}</div>`
  return { kind: "figure", html, frame, hasBasemap: basemap !== null }
}

/** CSS of the figure; every class is prefixed `map-`, every colour is a palette value. */
export function mapFigureCss(_palette: PdfPalette): string {
  return `
.map-frame { position: relative; border-radius: ${MAP_FRAME_RADIUS}px; overflow: hidden; }
.map-image { position: absolute; left: 0; top: 0; display: block; }
.map-overlay { position: absolute; left: 0; top: 0; display: block; }
`
}
