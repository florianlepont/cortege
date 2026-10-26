import { fr } from "../../i18n"
import { buildFactorChartSvg, chartGroupLabels } from "./factor-chart-svg"
import { escapeHtml, formatDateFr, formatDecimal, shortenText } from "./html"
import { inseeFromParcelId } from "./identity"
import { buildMapFigure, mapFigureCss } from "./map-figure"
import { buildRingSvg } from "./ring-svg"
import { scoreBands } from "./score-section"
import type { ScoreBand } from "./score-section"
import { PDF_LOGO_DATA_URI, SUMMARY_BODY_HEIGHT } from "./styles"
import { buildTrendSvg, resolveTrend, trendSummaryParts } from "./trend-section"
import type { TrendState } from "./trend-section"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The one-page summary for patrons, partners and funders (phase 33, D-07, D-08, D-18, UI-SPEC B.10).
// One fixed block of 764 units built from five fixed-height zones (title band, score row, map,
// evolution, sources), each absolutely positioned with an explicit height and hidden overflow:
// nothing flows, so the page can neither spill onto a second page nor grow silently, and no height
// estimate is involved (research Pitfall 1). Offsets and heights are multiples of 4 on the 4-grid.
// The solid contract of B.2 holds: no opacity, gradient, shadow or filter. Pure: colours from
// `PdfPalette`, fonts from `PDF_FONT_FAMILIES`, texts from `fr.surveyExport`, every survey text goes
// through `escapeHtml`, the logo is checked with `PDF_LOGO_DATA_URI` and the basemap by the shared
// figure. The page shows no photo and no factor-by-factor detail; a draft never reaches it (three
// guards upstream), so the builder prints no draft word.

const t = fr.surveyExport

const CONTENT_WIDTH = 515
const TITLE_X = 88
const TITLE_WIDTH = CONTENT_WIDTH - TITLE_X
/** A site name this long or longer takes the smaller title (20 / 24 instead of 24 / 28). */
const TITLE_LONG_FROM = 49
/** The meta line is one line of 9 units in a 427-unit box: about 95 characters. */
const META_MAX_CHARS = 95
/** The legend line holds the parcel list: about 110 characters of 8.5 units in 515. */
const LEGEND_MAX_CHARS = 110
/** Two lines of the smaller title hold about this many characters; the builder cuts beyond. */
const TITLE_MAX_CHARS = 72

const HEADING_HEIGHT = 20
const CARD_WIDTH = 200
const CARD_HEIGHT = 176
const CARD_RADIUS = 16
const RING_SIZE = 112
const RING_STROKE = 8
const CHART_X = 216
const CHART_SIZE = { width: 299, height: 156 }
const MAP_BOX_HEIGHT = 228
const LEGEND_TOP = 248
const LEGEND_HEIGHT = 16
const TREND_LINE_HEIGHT = 20
const TREND_TOP = 40
const TREND_BOX_HEIGHT = 128

/**
 * The five zones as `[offset, height]` from the top of the body (UI-SPEC B.10). With the 12-unit
 * gaps and the 8 spare below the evolution zone they sum to the 764 units of the body.
 */
export const SUMMARY_ZONES = Object.freeze({
  title: Object.freeze([0, 88] as const),
  score: Object.freeze([100, 176] as const),
  map: Object.freeze([288, 264] as const),
  evolution: Object.freeze([564, 168] as const),
  sources: Object.freeze([740, 24] as const),
})

function logoHtml(logoDataUri: string | null): string {
  if (logoDataUri === null || !PDF_LOGO_DATA_URI.test(logoDataUri)) return ""
  return `<img class="summary-logo" alt="" src="${escapeHtml(logoDataUri)}">`
}

// The three words of the meta line (commune, parcelle, version) are feminine, so a missing value
// reads "non renseignée" in the middle of the sentence, not the neutral "Non renseigné" of a table.
const MISSING_IN_SENTENCE = t.identity.noParcel.toLowerCase()

function communeCode(parcelIds: string[]): string {
  const insee = parcelIds.length > 0 ? inseeFromParcelId(parcelIds[0]) : null
  return insee ? insee.commune : MISSING_IN_SENTENCE
}

function metaLine(data: SurveyExportData): string {
  const parcels = data.parcelIds.length === 0 ? MISSING_IN_SENTENCE : data.parcelIds.join(", ")
  const version = data.versionNumber === null ? MISSING_IN_SENTENCE : String(data.versionNumber)
  return shortenText(
    t.summary.metaLine({ commune: communeCode(data.parcelIds), parcels, version }),
    META_MAX_CHARS,
  )
}

/** Z1: who, where and when. Without a usable logo the texts start at the left edge. */
function titleZoneHtml(data: SurveyExportData): string {
  const logo = logoHtml(data.assets.logoDataUri)
  const bare = logo === "" ? " summary-bare" : ""
  const siteName = shortenText(data.siteName, TITLE_MAX_CHARS)
  const long = data.siteName.length >= TITLE_LONG_FROM ? " summary-title-long" : ""
  const date = escapeHtml(formatDateFr(data.dateIso, t.identity.unknown))
  return `<div class="summary-zone summary-zone-title">${logo}<div class="summary-eyebrow${bare}">${escapeHtml(t.summary.eyebrow)}</div><div class="summary-date">${date}</div><div class="summary-title${long}${bare}">${escapeHtml(siteName)}</div><div class="summary-meta${bare}">${escapeHtml(metaLine(data))}</div></div><div class="summary-rule"></div>`
}

function numeralHtml(total: ScoreBand): string {
  if (total.points === null) {
    return `<span class="summary-noscore">${escapeHtml(t.scores.notFilled)}</span>`
  }
  const outOf = t.cover.outOf({ max: String(total.max) })
  return `<span class="summary-numeral">${escapeHtml(formatDecimal(total.points, 0))}</span><span class="summary-outof">${escapeHtml(outOf)}</span>`
}

function ringHtml(total: ScoreBand, palette: PdfPalette): string {
  const label =
    total.points === null
      ? `${t.scores.title} : ${t.scores.notFilled}`
      : t.cover.scoreA11y({ points: formatDecimal(total.points, 0), max: String(total.max) })
  return buildRingSvg({
    size: RING_SIZE,
    stroke: RING_STROKE,
    ratio: total.points === null ? 0 : total.points / total.max,
    track: palette.forestDeep,
    arc: palette.onForestAccent,
    label,
  })
}

/** Z2 left: the forest card with the ring, the band and the two sub-scores. */
function scoreCardHtml(data: SurveyExportData, palette: PdfPalette): string {
  const bands = scoreBands(data.scores)
  const { total, stand, context } = bands
  const band = total.bandName
    ? `<div class="summary-band">${escapeHtml(t.scores.band({ band: total.bandName }))}</div>`
    : ""
  const subscores =
    stand.points !== null && context.points !== null
      ? `<div class="summary-subscores">${escapeHtml(
          t.summary.subscores({
            stand: formatDecimal(stand.points, 0),
            context: formatDecimal(context.points, 0),
          }),
        )}</div>`
      : ""
  return `<div class="summary-score-card"><div class="summary-card-eyebrow">${escapeHtml(t.scores.title)}</div><div class="summary-ring">${ringHtml(total, palette)}</div><div class="summary-ring-value">${numeralHtml(total)}</div>${band}${subscores}</div>`
}

/**
 * Z2 right: the heading and the ten-bar chart with its two group panels (D-26). The page is
 * `paper`, so the panels are `panel`.
 */
function chartHtml(data: SurveyExportData, palette: PdfPalette): string {
  const svg = buildFactorChartSvg(data.factorEntries, palette, CHART_SIZE, {
    ...chartGroupLabels(data.scores),
    fill: palette.panel,
  })
  return `<div class="summary-chart"><div class="summary-heading">${escapeHtml(t.scores.chartHeading)}</div><div class="summary-chart-box">${svg}</div></div>`
}

/** A quiet panel (D-18, B.10): a sentence on a `panel` box, for a part that cannot be shown. */
function quietHtml(text: string, top: number, height: number): string {
  return `<div class="summary-quiet" style="top: ${top}px; height: ${height}px">${escapeHtml(text)}</div>`
}

function headingHtml(text: string): string {
  return `<div class="summary-heading">${escapeHtml(text)}</div>`
}

/** Z3: the parcel figure with its legend, or a quiet panel when there is nothing to draw. */
function mapZone(
  data: SurveyExportData,
  palette: PdfPalette,
): { html: string; hasBasemap: boolean } {
  const heading = headingHtml(t.summary.mapHeading)
  const open = '<div class="summary-zone summary-zone-map">'
  if (data.parcelIds.length === 0) {
    return {
      html: `${open}${heading}${quietHtml(t.map.noParcel, HEADING_HEIGHT, MAP_BOX_HEIGHT)}</div>`,
      hasBasemap: false,
    }
  }
  const figure = buildMapFigure(data.map, palette)
  if (figure.kind === "noGeometry") {
    return {
      html: `${open}${heading}${quietHtml(t.map.noOutline, HEADING_HEIGHT, MAP_BOX_HEIGHT)}</div>`,
      hasBasemap: false,
    }
  }
  const legendText = figure.hasBasemap
    ? shortenText(`${t.map.parcels} ${data.parcelIds.join(", ")}`, LEGEND_MAX_CHARS)
    : t.map.outlineOnly
  return {
    html: `${open}${heading}<div class="summary-map-box">${figure.html}</div><div class="summary-legend">${escapeHtml(legendText)}</div></div>`,
    hasBasemap: figure.hasBasemap,
  }
}

/**
 * Z4: the evolution of the parcel. Only a ready trend that holds this survey is drawn; a cache
 * without it is treated as unavailable, because the "+N points" line could be wrong (the complete
 * PDF keeps its own note for a stale cache, research section 3). Returns whether the curve is drawn.
 */
function evolutionZone(
  state: TrendState,
  palette: PdfPalette,
): { html: string; drawn: boolean; cachedAt: string | null } {
  const open = `<div class="summary-zone summary-zone-evolution">${headingHtml(t.trend.heading)}`
  const quiet = (text: string) => ({
    html: `${open}${quietHtml(text, TREND_TOP, TREND_BOX_HEIGHT)}</div>`,
    drawn: false,
    cachedAt: null,
  })
  switch (state.kind) {
    case "noParcel":
      return quiet(t.trend.noParcel)
    case "first":
      return quiet(t.trend.first)
    case "unavailable":
      return quiet(t.summary.trendUnavailable)
    default: {
      if (!state.hasCurrent) return quiet(t.summary.trendUnavailable)
      const parts = trendSummaryParts(state.model.trend)
      const line =
        parts === null
          ? ""
          : `<div class="summary-trend-line"><span class="summary-trend-strong">${escapeHtml(parts[0])}</span><span class="summary-trend-rest">${escapeHtml(parts[1])}</span></div>`
      const curve = `<div class="summary-trend-box">${buildTrendSvg(state.model, palette)}</div>`
      return { html: `${open}${line}${curve}</div>`, drawn: true, cachedAt: state.cachedAt }
    }
  }
}

/** Z5: the cache date of the history and the basemap source, each only when applicable. */
function sourcesZone(cachedAt: string | null, hasBasemap: boolean): string {
  const lines: string[] = []
  if (cachedAt !== null) lines.push(t.trend.cachedAt({ date: cachedAt }))
  if (hasBasemap) lines.push(t.map.source)
  const body = lines.map((line) => `<div class="summary-source">${escapeHtml(line)}</div>`).join("")
  return `<div class="summary-zone summary-zone-sources">${body}</div>`
}

/**
 * The summary block: one `{ id: "summary", pageStyle: "summary", height: 764 }`. The page of that
 * style has no running header and no page number; its body is 515 x 764 (UI-SPEC B.1).
 */
export function buildSummaryBlocks(data: SurveyExportData, palette: PdfPalette): PdfBlock[] {
  const scoreZone = `<div class="summary-zone summary-zone-score">${scoreCardHtml(data, palette)}${chartHtml(data, palette)}</div>`
  const map = mapZone(data, palette)
  const evolution = evolutionZone(resolveTrend(data), palette)
  const html = `<div class="summary-page">${titleZoneHtml(data)}${scoreZone}${map.html}${evolution.html}${sourcesZone(evolution.cachedAt, map.hasBasemap)}</div>`
  return [{ id: "summary", pageStyle: "summary", height: SUMMARY_BODY_HEIGHT, html }]
}

/** CSS of the summary, after the shared map figure; every class is prefixed `summary-`. */
export function summaryCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  const abs = "position: absolute;"
  const zone = (name: keyof typeof SUMMARY_ZONES) =>
    `top: ${SUMMARY_ZONES[name][0]}px; height: ${SUMMARY_ZONES[name][1]}px;`
  const hiddenLine = (height: number) =>
    `height: ${height}px; overflow: hidden; white-space: nowrap;`
  return `${mapFigureCss(palette)}
.summary-page { position: relative; width: ${CONTENT_WIDTH}px; height: ${SUMMARY_BODY_HEIGHT}px; overflow: hidden; }
.summary-zone { ${abs} left: 0; width: ${CONTENT_WIDTH}px; overflow: hidden; }
.summary-zone-title { ${zone("title")} }
.summary-zone-score { ${zone("score")} }
.summary-zone-map { ${zone("map")} }
.summary-zone-evolution { ${zone("evolution")} }
.summary-zone-sources { ${zone("sources")} }
.summary-logo { ${abs} left: 0; top: 0; width: 72px; height: 72px; }
.summary-eyebrow { ${abs} left: ${TITLE_X}px; top: 4px; ${hiddenLine(12)} font-family: ${font.label}; font-size: 8.5px; line-height: 12px; color: ${palette.inkMuted}; }
.summary-date { ${abs} right: 0; top: 4px; ${hiddenLine(12)} text-align: right; font-family: ${font.label}; font-size: 9px; line-height: 12px; color: ${palette.inkMuted}; }
.summary-title { ${abs} left: ${TITLE_X}px; top: 16px; width: ${TITLE_WIDTH}px; height: 56px; overflow: hidden; font-family: ${font.heading}; font-size: 24px; line-height: 28px; color: ${palette.accent}; }
.summary-title-long { height: 48px; font-size: 20px; line-height: 24px; }
.summary-meta { ${abs} left: ${TITLE_X}px; top: 72px; width: ${TITLE_WIDTH}px; ${hiddenLine(16)} font-family: ${font.body}; font-size: 9px; line-height: 16px; color: ${palette.inkMuted}; }
.summary-bare { left: 0; width: ${CONTENT_WIDTH}px; }
.summary-rule { ${abs} left: 0; top: ${SUMMARY_ZONES.title[1]}px; width: ${CONTENT_WIDTH}px; height: 1px; background: ${palette.line}; }
.summary-score-card { ${abs} left: 0; top: 0; width: ${CARD_WIDTH}px; height: ${CARD_HEIGHT}px; overflow: hidden; border-radius: ${CARD_RADIUS}px; background: ${palette.forest}; }
.summary-card-eyebrow { ${abs} left: 16px; top: 12px; ${hiddenLine(12)} font-family: ${font.label}; font-size: 8.5px; line-height: 12px; color: ${palette.onForestBody}; }
.summary-ring { ${abs} left: 44px; top: 24px; width: ${RING_SIZE}px; height: ${RING_SIZE}px; }
.summary-ring-value { ${abs} left: 44px; top: 24px; width: ${RING_SIZE}px; height: ${RING_SIZE}px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.summary-numeral { display: block; height: 44px; font-family: ${font.numeral}; font-size: 40px; line-height: 44px; letter-spacing: -2px; color: ${palette.onForest}; }
.summary-outof { display: block; height: 16px; font-family: ${font.body}; font-size: 12px; line-height: 16px; color: ${palette.onForestBody}; }
.summary-noscore { display: block; font-family: ${font.body}; font-size: 12px; line-height: 16px; color: ${palette.onForestBody}; }
.summary-band { ${abs} left: 0; top: 140px; width: ${CARD_WIDTH}px; ${hiddenLine(16)} text-align: center; font-family: ${font.label}; font-size: 9px; line-height: 16px; color: ${palette.onForestAccent}; }
.summary-subscores { ${abs} left: 0; top: 156px; width: ${CARD_WIDTH}px; ${hiddenLine(12)} text-align: center; font-family: ${font.body}; font-size: 8.5px; line-height: 12px; color: ${palette.onForestBody}; }
.summary-chart { ${abs} left: ${CHART_X}px; top: 0; width: ${CHART_SIZE.width}px; height: ${CARD_HEIGHT}px; overflow: hidden; }
.summary-chart-box { ${abs} left: 0; top: ${HEADING_HEIGHT}px; width: ${CHART_SIZE.width}px; height: ${CHART_SIZE.height}px; }
.summary-heading { ${abs} left: 0; top: 0; width: ${CONTENT_WIDTH}px; ${hiddenLine(HEADING_HEIGHT)} font-family: ${font.heading}; font-size: 11px; line-height: ${HEADING_HEIGHT}px; color: ${palette.ink}; }
.summary-map-box { ${abs} left: 0; top: ${HEADING_HEIGHT}px; width: ${CONTENT_WIDTH}px; height: ${MAP_BOX_HEIGHT}px; overflow: hidden; }
.summary-legend { ${abs} left: 0; top: ${LEGEND_TOP}px; width: ${CONTENT_WIDTH}px; ${hiddenLine(LEGEND_HEIGHT)} font-family: ${font.body}; font-size: 8.5px; line-height: ${LEGEND_HEIGHT}px; color: ${palette.inkMuted}; }
.summary-quiet { ${abs} left: 0; box-sizing: border-box; width: ${CONTENT_WIDTH}px; overflow: hidden; padding: 0 24px; display: flex; align-items: center; justify-content: center; text-align: center; border: 1px solid ${palette.line}; border-radius: 12px; background: ${palette.panel}; font-family: ${font.body}; font-size: 9px; line-height: 13px; color: ${palette.inkMuted}; }
.summary-trend-line { ${abs} left: 0; top: ${HEADING_HEIGHT}px; width: ${CONTENT_WIDTH}px; ${hiddenLine(TREND_LINE_HEIGHT)} font-size: 13px; line-height: ${TREND_LINE_HEIGHT}px; }
.summary-trend-strong { font-family: ${font.title}; color: ${palette.accent}; }
.summary-trend-rest { font-family: ${font.body}; color: ${palette.ink}; }
.summary-trend-box { ${abs} left: 0; top: ${TREND_TOP}px; width: ${CONTENT_WIDTH}px; height: ${TREND_BOX_HEIGHT}px; overflow: hidden; }
.summary-source { height: 12px; overflow: hidden; white-space: nowrap; font-family: ${font.body}; font-size: 8px; line-height: 12px; color: ${palette.inkMuted}; }
`
}
