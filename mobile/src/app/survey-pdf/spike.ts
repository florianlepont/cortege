import * as FileSystem from "expo-file-system/legacy"
import * as Network from "expo-network"
import * as Print from "expo-print"
import * as Sharing from "expo-sharing"
import { Platform } from "react-native"
import { fr, logStatusDetail } from "../../i18n"
import { isOnlineNetworkState } from "../../hooks/survey-sync/utils"
import { isPhotoAttachment, resolveAttachmentPreview } from "../../screens/survey-screen-helpers"
import { getCachedParcelById } from "../../storage/offline-map"
import { listLocalAttachments } from "../../storage/surveys"
import type { LocalAttachment } from "../../storage/types"
import { brandColors } from "../brand-tokens"
import type { PublicParcelStatusItem } from "../types"
import { mixWithWhite, withAlpha } from "../visual-tokens"
import { loadExportAssets } from "./assets"
import { escapeHtml, formatDecimal, svgNumber } from "./html"
import {
  boundsOfRings,
  chooseScaleBar,
  fitFrameToBounds,
  metresPerPixel,
  OFFLINE_ZOOM_RANGE,
  parcelPolygonsFrom,
  ringsToPathD,
  type LngLat,
  type MapFrame,
} from "./map-projection"
import {
  decideBasemap,
  defaultBasemapDeps,
  SNAPSHOT_TIMEOUT_MS,
  takeBasemapJpeg,
  type BasemapChoice,
} from "./map-snapshot"
import { preparePhotosForExport, type PhotoExportSettings } from "./photo-prep"

// Dev-only device spike of phase 25.1 (plan 25.1-07). It exports a worst-case PDF (34 genera, 24
// photos, the parcel map, 7 fixed A4 page blocks) with the real loaders, so the PDFs of the iOS
// simulator and the Android emulator can be measured before the layout is frozen. Reachable only
// from the DebugTab inside `shouldShowDevTools()`. Plan 25.1-16 deletes this file once the real
// pipeline replaces it.

const t = fr.surveyExport

export const SPIKE_PAGE_COUNT = 7
export const SPIKE_PHOTO_COUNT = 24
/** The trial photo settings of the spike; the measured ones become PHOTO_EXPORT_SETTINGS. */
export const SPIKE_PHOTO_SETTINGS: PhotoExportSettings = {
  cap: SPIKE_PHOTO_COUNT,
  longEdgePx: 800,
  jpegQuality: 0.65,
}

const PAGE_WIDTH = 595
const PAGE_BLOCK_HEIGHT = 840
const MAP_WIDTH = 515
const MAP_HEIGHT = 340
const MAP_LEFT = 40
const MAP_TOP = 60
const CELL_WIDTH = 255
const CELL_HEIGHT = 200
const CELL_GAP_X = 20
const CELL_GAP_Y = 14
const CELL_LEFT = 32
const CELL_TOP = 56
const PHOTOS_PER_PAGE = 6
const RULE_POSITIONS = [0, 100, 200, 300, 400, 500, 594]
const DEFAULT_CENTER = { lat: 48.4, lng: 2.7 }
const SQUARE_HALF_SIDE_M = 150
const METRES_PER_DEGREE = 111320

export type SpikeFixture = {
  platform: string
  fonts: ReadonlyArray<{ family: string; base64: string }>
  logoDataUri: string | null
  genusNames: string[]
  photos: Array<{ id: string; dataUri: string; width: number; height: number }>
  map: {
    frame: MapFrame
    basemap: { dataUri: string; frame: MapFrame } | null
    polygons: Array<{ parcelId: string; rings: LngLat[][] }>
  }
}

export type PdfSpikeReport = {
  platform: string
  layoutScale: number
  fontsLoaded: string[]
  timingsMs: { assets: number; photos: number; snapshot: number; print: number; total: number }
  snapshot: "offline" | "online" | "none" | "timeout" | "error"
  photoSource: "survey" | "logo" | "none"
  photoCount: number
  htmlBytes: number
  photoBytes: number
  numberOfPages: number
  pdfBytes: number | null
  uri: string
}

export type PdfSpikeInput = {
  surveyId: string
  parcelIds: string[]
  displayLocation: { lat: number; lng: number } | null
  layoutScale: number
}

type PrintOptions = {
  html: string
  width: number
  height: number
  margins: { left: number; top: number; right: number; bottom: number }
}

export type PdfSpikeDeps = {
  platform: string
  now: () => number
  loadExportAssets: typeof loadExportAssets
  preparePhotosForExport: typeof preparePhotosForExport
  listLocalAttachments: (surveyId: string) => Promise<LocalAttachment[]>
  getCachedParcel: (parcelId: string) => Promise<PublicParcelStatusItem | null>
  isOnline: () => Promise<boolean>
  decideBasemap: (center: { lat: number; lng: number }, isOnline: boolean) => Promise<BasemapChoice>
  takeBasemapJpeg: typeof takeBasemapJpeg
  print: (options: PrintOptions) => Promise<{ uri: string; numberOfPages: number }>
  fileSize: (uri: string) => Promise<number | null>
  writeLogoFile: (dataUri: string) => Promise<string | null>
  writeReport: (uri: string, json: string) => Promise<void>
  share: (uri: string) => Promise<void>
}

// ---- HTML ----------------------------------------------------------------------------------

const CSP = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'"

// A CSS font family is written between quotes inside a <style>: only the characters of a
// PostScript name are kept, so no value can close the rule or the element.
const cssFamily = (family: string) => family.replace(/[^A-Za-z0-9_-]/g, "")

function fontFaces(fonts: SpikeFixture["fonts"]): string {
  return fonts
    .map(
      ({ family, base64 }) =>
        `@font-face { font-family: '${cssFamily(family)}'; src: url(data:font/ttf;base64,${base64.replace(/[^A-Za-z0-9+/=]/g, "")}) format('truetype'); }`,
    )
    .join("\n")
}

function buildCss(fonts: SpikeFixture["fonts"]): string {
  const ink = brandColors.forest
  const line = withAlpha(brandColors.forest, 0.35)
  return `${fontFaces(fonts)}
@page { size: 595pt 842pt; margin: 0; }
html, body { margin: 0; padding: 0; background: ${brandColors.white}; }
body { font-family: 'Jost-Regular', sans-serif; color: ${ink}; font-size: 11px; }
.page { position: relative; width: ${PAGE_WIDTH}px; height: ${PAGE_BLOCK_HEIGHT}px; overflow: hidden; background: ${brandColors.white}; }
.header { position: absolute; left: 20px; right: 20px; top: 10px; height: 34px; border-bottom: 1px solid ${line}; }
.header .logo { position: absolute; left: 0; top: 0; height: 28px; width: 28px; }
.header .title { position: absolute; left: 38px; top: 6px; font-family: 'Sora-ExtraBold', sans-serif; font-size: 14px; }
.footer { position: absolute; left: 20px; right: 20px; bottom: 10px; height: 20px; border-top: 1px solid ${line}; font-size: 10px; text-align: right; padding-top: 4px; }
.watermark { position: absolute; left: 0; top: 380px; width: ${PAGE_WIDTH}px; text-align: center; font-family: 'Sora-ExtraBold', sans-serif; font-size: 110px; color: ${withAlpha(brandColors.forest, 0.07)}; transform: rotate(-30deg); }
.specimen { margin: 0 0 6px 0; }
.genera { column-count: 2; column-gap: 20px; margin: 10px 0 0 0; padding: 0 0 0 16px; font-size: 11px; }
.body { position: absolute; left: 30px; right: 30px; top: 56px; }
.rule { position: absolute; top: 50px; width: 1px; height: 700px; background: ${brandColors.terracotta}; }
.rulelabel { position: absolute; top: 756px; font-size: 10px; color: ${brandColors.terracotta}; }
.box { position: absolute; left: 0; top: 0; width: ${PAGE_WIDTH}px; height: ${PAGE_BLOCK_HEIGHT}px; box-sizing: border-box; border: 1px solid ${brandColors.terracotta}; }
.photo { position: absolute; width: ${CELL_WIDTH}px; height: ${CELL_HEIGHT}px; object-fit: contain; background: ${mixWithWhite(brandColors.sage, 0.6)}; }
.map { position: absolute; left: ${MAP_LEFT}px; top: ${MAP_TOP}px; width: ${MAP_WIDTH}px; height: ${MAP_HEIGHT}px; background: ${mixWithWhite(brandColors.sage, 0.7)}; }
.basemap { position: absolute; left: 0; top: 0; }
.overlay { position: absolute; left: 0; top: 0; }
.parcel { fill: ${withAlpha(brandColors.terracotta, 0.2)}; stroke: ${brandColors.terracotta}; stroke-width: 1.5; }
.scalebar line { stroke: ${brandColors.black}; stroke-width: 2; }
.scalebar text, .north text { font-family: 'Jost-SemiBold', sans-serif; font-size: 10px; fill: ${brandColors.black}; }
.north polygon { fill: ${brandColors.black}; }
.cross line { stroke: ${brandColors.ochre}; stroke-width: 1; }
.maptext { position: absolute; left: ${MAP_LEFT}px; top: ${MAP_TOP + MAP_HEIGHT + 8}px; font-size: 10px; }`
}

function pageShell(index: number, fixture: SpikeFixture, body: string, css = ""): string {
  const logo = fixture.logoDataUri
    ? `<img class="logo" width="28" height="28" src="${fixture.logoDataUri}">`
    : ""
  const last = index === SPIKE_PAGE_COUNT
  return `<section class="page" style="page-break-after: ${last ? "auto" : "always"}; break-after: ${last ? "auto" : "page"};${css}">
<div class="header">${logo}<span class="title">${escapeHtml(t.sheetTitle)}</span></div>
${body}
<div class="watermark">${escapeHtml(t.draft.watermark)}</div>
<div class="footer">${escapeHtml(t.page.number({ index: String(index), total: SPIKE_PAGE_COUNT }))}</div>
</section>`
}

function fontsPage(fixture: SpikeFixture): string {
  const specimens = fixture.fonts
    .map(({ family }) => {
      const name = cssFamily(family)
      return `<p class="specimen" style="font-family: '${name}', serif; font-size: 16px">${escapeHtml(name)} : ${escapeHtml(t.sheetTitle)}, ${escapeHtml(t.sheetSubtitle)}</p>`
    })
    .join("\n")
  const genera = fixture.genusNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")
  return `<div class="body">${specimens}<ul class="genera">${genera}</ul></div>`
}

function calibrationPage(): string {
  const rules = RULE_POSITIONS.map(
    (x) =>
      `<div class="rule" style="left: ${x}px"></div><span class="rulelabel" style="left: ${x}px">${x}</span>`,
  ).join("\n")
  return `<div class="box"></div>\n${rules}`
}

function photosPage(fixture: SpikeFixture, pageIndex: number): string {
  const first = pageIndex * PHOTOS_PER_PAGE
  const cells = fixture.photos.slice(first, first + PHOTOS_PER_PAGE).map((photo, position) => {
    const column = position % 2
    const row = Math.floor(position / 2)
    const left = CELL_LEFT + column * (CELL_WIDTH + CELL_GAP_X)
    const top = CELL_TOP + row * (CELL_HEIGHT + CELL_GAP_Y)
    return `<img class="photo" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" style="left: ${left}px; top: ${top}px" src="${photo.dataUri}">`
  })
  return cells.join("\n")
}

function scaleBarLabel(metres: number): string {
  return metres >= 1000
    ? t.map.scaleKm({ km: formatDecimal(metres / 1000, 1) })
    : t.map.scaleValue({ metres: String(metres) })
}

function mapPage(fixture: SpikeFixture): string {
  const { frame, basemap, polygons } = fixture.map
  const image = basemap
    ? `<img class="basemap" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" src="${basemap.dataUri}">`
    : ""
  const paths = polygons
    .map(
      ({ rings }) =>
        `<path class="parcel" d="${ringsToPathD(rings, frame)}" fill-rule="evenodd"></path>`,
    )
    .join("")
  const bar = chooseScaleBar(metresPerPixel(frame.centerLat, frame.zoom), MAP_WIDTH)
  const barY = MAP_HEIGHT - 18
  const barEnd = 14 + bar.px
  const centreX = svgNumber(frame.width / 2)
  const centreY = svgNumber(frame.height / 2)
  const svg = `<svg class="overlay" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}">${paths}
<g class="cross"><line x1="${centreX}" y1="${svgNumber(frame.height / 2 - 8)}" x2="${centreX}" y2="${svgNumber(frame.height / 2 + 8)}"></line><line x1="${svgNumber(frame.width / 2 - 8)}" y1="${centreY}" x2="${svgNumber(frame.width / 2 + 8)}" y2="${centreY}"></line></g>
<g class="scalebar"><line x1="14" y1="${barY}" x2="${svgNumber(barEnd)}" y2="${barY}"></line><text x="14" y="${barY - 5}">${escapeHtml(scaleBarLabel(bar.metres))}</text></g>
<g class="north"><polygon points="${MAP_WIDTH - 22},12 ${MAP_WIDTH - 28},30 ${MAP_WIDTH - 16},30"></polygon><text x="${MAP_WIDTH - 26}" y="44">${escapeHtml(t.map.north)}</text></g>
</svg>`
  const note = basemap ? "" : ` ${escapeHtml(t.map.outlineOnly)}`
  return `<div class="map">${image}${svg}</div>
<div class="maptext">${escapeHtml(t.map.source)}${note}</div>`
}

/** The 7 page blocks of the worst case, pure: no native module, only the fixture. */
export function buildSpikeHtml(fixture: SpikeFixture, layoutScale: number): string {
  const photoPages = [0, 1, 2, 3].map((pageIndex) => photosPage(fixture, pageIndex))
  const pages = [fontsPage(fixture), calibrationPage(), ...photoPages, mapPage(fixture)].map(
    (body, position) => pageShell(position + 1, fixture, body),
  )
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
${buildCss(fixture.fonts)}
</style>
</head>
<body>
<div class="root" style="zoom: ${layoutScale}">
${pages.join("\n")}
</div>
</body>
</html>`
}

// ---- Runtime -------------------------------------------------------------------------------

async function writeLogoFile(dataUri: string): Promise<string | null> {
  const base64 = dataUri.split("base64,")[1]
  if (!base64 || !FileSystem.cacheDirectory) return null
  const uri = `${FileSystem.cacheDirectory}spike-logo.png`
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 })
  return uri
}

function defaultDeps(): PdfSpikeDeps {
  return {
    platform: Platform.OS,
    now: () => Date.now(),
    loadExportAssets,
    preparePhotosForExport,
    listLocalAttachments,
    getCachedParcel: (parcelId) => getCachedParcelById<PublicParcelStatusItem>(parcelId),
    isOnline: async () => isOnlineNetworkState(await Network.getNetworkStateAsync()),
    decideBasemap: (center, isOnline) => decideBasemap(center, defaultBasemapDeps(isOnline)),
    takeBasemapJpeg,
    print: async (options) => {
      const result = await Print.printToFileAsync(options)
      return { uri: result.uri, numberOfPages: result.numberOfPages }
    },
    fileSize: async (uri) => {
      const info = await FileSystem.getInfoAsync(uri)
      return info.exists && typeof info.size === "number" ? info.size : null
    },
    writeLogoFile,
    writeReport: (uri, json) => FileSystem.writeAsStringAsync(uri, json),
    share: (uri) => Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" }),
  }
}

function resolveDeps(overrides?: Partial<PdfSpikeDeps>): PdfSpikeDeps {
  const deps = defaultDeps() as unknown as Record<string, unknown>
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (value !== undefined) deps[key] = value
  }
  return deps as unknown as PdfSpikeDeps
}

type PhotoSources = {
  source: PdfSpikeReport["photoSource"]
  list: Array<{ id: string; uri: string }>
}

async function collectPhotoSources(
  surveyId: string,
  logoDataUri: string | null,
  deps: PdfSpikeDeps,
): Promise<PhotoSources> {
  let found: Array<{ id: string; uri: string }> = []
  try {
    const attachments = await deps.listLocalAttachments(surveyId)
    for (const attachment of attachments) {
      if (!isPhotoAttachment(attachment)) continue
      const preview = resolveAttachmentPreview(attachment)
      if (preview.kind === "image") found.push({ id: attachment.id, uri: preview.uri })
    }
  } catch (error) {
    logStatusDetail("pdfSpike.attachments", error)
  }
  let source: PdfSpikeReport["photoSource"] = "survey"
  if (found.length === 0 && logoDataUri) {
    const logoUri = await deps.writeLogoFile(logoDataUri)
    found = logoUri ? [{ id: "logo", uri: logoUri }] : []
    source = "logo"
  }
  if (found.length === 0) return { source: "none", list: [] }
  const list = Array.from({ length: SPIKE_PHOTO_COUNT }, (_, index) => {
    const base = found[index % found.length]
    return { id: `${base.id}#${index}`, uri: base.uri }
  })
  return { source, list }
}

function squareAround(center: { lat: number; lng: number }): LngLat[] {
  const dLat = SQUARE_HALF_SIDE_M / METRES_PER_DEGREE
  const dLng = dLat / Math.cos((center.lat * Math.PI) / 180)
  const { lat, lng } = center
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ]
}

async function resolvePolygons(
  input: PdfSpikeInput,
  deps: PdfSpikeDeps,
): Promise<SpikeFixture["map"]["polygons"]> {
  const parcelId = input.parcelIds[0]
  if (parcelId) {
    try {
      const item = await deps.getCachedParcel(parcelId)
      const polygons = item ? parcelPolygonsFrom([item], [parcelId]) : []
      if (polygons.length > 0) return polygons
    } catch (error) {
      logStatusDetail("pdfSpike.parcel", error)
    }
  }
  return [{ parcelId: "SPIKE", rings: [squareAround(input.displayLocation ?? DEFAULT_CENTER)] }]
}

const reportPath = (pdfUri: string) => `${pdfUri.replace(/\.pdf$/i, "")}.json`

/**
 * Exports the worst-case PDF with the real loaders, logs and returns the measurement report, and
 * opens the share sheet. Never called outside a dev build.
 */
export async function runPdfSpike(
  input: PdfSpikeInput,
  overrides?: Partial<PdfSpikeDeps>,
): Promise<PdfSpikeReport> {
  const deps = resolveDeps(overrides)
  const started = deps.now()

  const assetsStart = deps.now()
  const assets = await deps.loadExportAssets()
  const assetsMs = deps.now() - assetsStart

  const photosStart = deps.now()
  const sources = await collectPhotoSources(input.surveyId, assets.logoDataUri, deps)
  const prepared =
    sources.list.length > 0
      ? await deps.preparePhotosForExport(sources.list, SPIKE_PHOTO_SETTINGS)
      : { photos: [], failed: 0, capped: 0 }
  const photosMs = deps.now() - photosStart

  const snapshotStart = deps.now()
  const polygons = await resolvePolygons(input, deps)
  const bounds = boundsOfRings(polygons.flatMap(({ rings }) => rings)) ?? {
    west: DEFAULT_CENTER.lng,
    south: DEFAULT_CENTER.lat,
    east: DEFAULT_CENTER.lng,
    north: DEFAULT_CENTER.lat,
  }
  const frame = fitFrameToBounds(
    bounds,
    { width: MAP_WIDTH, height: MAP_HEIGHT },
    { paddingRatio: 0.1, zoomRange: OFFLINE_ZOOM_RANGE },
  )
  let online = false
  try {
    online = await deps.isOnline()
  } catch (error) {
    logStatusDetail("pdfSpike.network", error)
  }
  const choice = await deps.decideBasemap({ lat: frame.centerLat, lng: frame.centerLng }, online)
  let snapshot: PdfSpikeReport["snapshot"] = "none"
  let basemap: SpikeFixture["map"]["basemap"] = null
  if (choice.kind !== "none") {
    const takeStart = deps.now()
    basemap = await deps.takeBasemapJpeg({ mapStyle: choice.mapStyle, frame })
    if (basemap) snapshot = choice.kind
    else snapshot = deps.now() - takeStart >= SNAPSHOT_TIMEOUT_MS - 50 ? "timeout" : "error"
  }
  const snapshotMs = deps.now() - snapshotStart

  const fixture: SpikeFixture = {
    platform: deps.platform,
    fonts: assets.fonts,
    logoDataUri: assets.logoDataUri,
    genusNames: Object.values(fr.genus.displayName),
    photos: prepared.photos,
    map: { frame, basemap, polygons },
  }
  const html = buildSpikeHtml(fixture, input.layoutScale)

  const printStart = deps.now()
  const printed = await deps.print({
    html,
    width: PAGE_WIDTH,
    height: 842,
    margins: { left: 0, top: 0, right: 0, bottom: 0 },
  })
  const printMs = deps.now() - printStart
  const pdfBytes = await deps.fileSize(printed.uri)

  const report: PdfSpikeReport = {
    platform: deps.platform,
    layoutScale: input.layoutScale,
    fontsLoaded: assets.fonts.map(({ family }) => family),
    timingsMs: {
      assets: assetsMs,
      photos: photosMs,
      snapshot: snapshotMs,
      print: printMs,
      total: deps.now() - started,
    },
    snapshot,
    photoSource: sources.source,
    photoCount: prepared.photos.length,
    htmlBytes: html.length,
    photoBytes: prepared.photos.reduce((sum, photo) => sum + photo.dataUri.length, 0),
    numberOfPages: printed.numberOfPages,
    pdfBytes,
    uri: printed.uri,
  }
  logStatusDetail("pdfSpike", report)
  try {
    await deps.writeReport(reportPath(printed.uri), JSON.stringify(report, null, 2))
  } catch (error) {
    logStatusDetail("pdfSpike.report", error)
  }
  try {
    await deps.share(printed.uri)
  } catch (error) {
    logStatusDetail("pdfSpike.share", error)
  }
  return report
}
