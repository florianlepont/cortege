import {
  FACTOR_KEYS,
  IBP_MAX,
  bandTone,
  contextBand,
  standBand,
  totalBand,
} from "@cortege/ibp-domain"
import type { ScoreTone } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import type { DisplayedFactorResult } from "../../screens/survey-detail/useLocalDraftSummary"
import { escapeHtml, formatDecimal, svgNumber } from "./html"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The score summary at the top of the sheet (phase 25.1, D-02, D-10): the total out of 50, the
// stand and management sub-score out of 35 and the context sub-score out of 15, each with its CNPF
// band. Pure: the bands and their tones come from the domain, the band names from the catalogue
// the survey detail screen uses (`fr.surveyDetail.bands`); there is no threshold in this file.

const t = fr.surveyExport
const bandNames = fr.surveyDetail.bands

// The printed sentinel of a factor without a retained class (as `useLocalDraftSummary` writes it).
// Not imported: that module pulls React and storage in, and this one must stay pure. Keep it in
// step with `NOT_FILLED_CLASS` there and in `factor-section.ts`.
const NOT_FILLED_CLASS = "Not filled"

type Entries = SurveyExportData["factorEntries"]
type Entry = DisplayedFactorResult | undefined

// Height estimate, in design units of the 595 x 842 page (plan 25.1-07).
const CARD_PADDING = 20 // 10 top and 10 bottom
const CARD_TITLE = 24
const PROVISIONAL_HEIGHT = 20
const TILE_HEIGHT = 92 // padding 16, heading 12, value 28, band 16, track 6, gaps 14
const CARD_MARGIN = 10
const TILE_GAP = 8

/** The points of a filled factor, or null when the entry is absent, the sentinel, or point-less. */
export function filledPoints(entry: Entry): number | null {
  if (!entry || entry.selected_class === NOT_FILLED_CLASS) return null
  return entry.score_points
}

/** How many of the factors A to J have no entry or the "Not filled" sentinel. */
export function countMissingFactors(entries: Entries): number {
  const byFactor = new Map(entries)
  let missing = 0
  for (const factor of FACTOR_KEYS) {
    const entry = byFactor.get(factor)
    if (!entry || entry.selected_class === NOT_FILLED_CLASS) missing += 1
  }
  return missing
}

/** The palette colour of a score tone (low, mid, high). */
export function toneColor(tone: ScoreTone, palette: PdfPalette): string {
  switch (tone) {
    case "low":
      return palette.bandLow
    case "mid":
      return palette.bandMid
    default:
      return palette.bandHigh
  }
}

type Tile = {
  heading: string
  points: number | null
  max: number
  bandName: string | null
  tone: ScoreTone | null
}

function isScore(value: number | null): value is number {
  return value !== null && Number.isFinite(value)
}

function tileOf(
  heading: string,
  value: number | null,
  max: number,
  band: (score: number) => { name: string; tone: ScoreTone },
): Tile {
  if (!isScore(value)) return { heading, points: null, max, bandName: null, tone: null }
  const { name, tone } = band(value)
  return { heading, points: value, max, bandName: name, tone }
}

function tileHtml(tile: Tile, palette: PdfPalette): string {
  if (tile.points === null) {
    return `<div class="score-tile"><div class="score-tile-heading">${escapeHtml(tile.heading)}</div><div class="score-value score-value-empty">${escapeHtml(t.scores.notFilled)}</div></div>`
  }
  const color = escapeHtml(tile.tone === null ? palette.bandTrack : toneColor(tile.tone, palette))
  const outOf = t.scores.outOf({ points: formatDecimal(tile.points, 0), max: String(tile.max) })
  const ratio = Math.min(1, Math.max(0, tile.points / tile.max))
  const band = tile.bandName
    ? `<div class="score-band"><span class="score-dot" style="background: ${color}"></span>${escapeHtml(t.scores.band({ band: tile.bandName }))}</div>`
    : ""
  return `<div class="score-tile"><div class="score-tile-heading">${escapeHtml(tile.heading)}</div><div class="score-value">${escapeHtml(outOf)}</div>${band}<div class="score-track"><div class="score-fill" style="width: ${svgNumber(ratio * 100)}%; background: ${color}"></div></div></div>`
}

/** The score card: title, the provisional line of a draft, and the three tiles with their bands. */
export function buildScoreSummaryBlock(data: SurveyExportData, palette: PdfPalette): PdfBlock {
  const scores = data.scores
  const tiles = [
    tileOf(t.scores.totalHeading, scores?.ibp_total ?? null, IBP_MAX.total, (score) => {
      const band = totalBand(score)
      return { name: bandNames.stand[band], tone: bandTone(band) }
    }),
    tileOf(
      t.scores.standHeading,
      scores?.ibp_peuplement_gestion ?? null,
      IBP_MAX.stand,
      (score) => {
        const band = standBand(score)
        return { name: bandNames.stand[band], tone: bandTone(band) }
      },
    ),
    tileOf(t.scores.contextHeading, scores?.ibp_contexte ?? null, IBP_MAX.context, (score) => {
      const band = contextBand(score)
      return { name: bandNames.context[band], tone: bandTone(band) }
    }),
  ]
  const missing = countMissingFactors(data.factorEntries)
  const provisional = data.isDraft && missing > 0
  const provisionalHtml = provisional
    ? `<p class="score-provisional" style="color: ${escapeHtml(palette.alert)}">${escapeHtml(t.scores.provisional({ count: missing }))}</p>`
    : ""
  const html = `<section class="score-card">
<h2 class="score-title">${escapeHtml(t.scores.title)}</h2>
${provisionalHtml}<div class="score-tiles">${tiles.map((tile) => tileHtml(tile, palette)).join("")}</div>
</section>`
  const height =
    CARD_PADDING + CARD_TITLE + (provisional ? PROVISIONAL_HEIGHT : 0) + TILE_HEIGHT + CARD_MARGIN
  return { id: "score-summary", html, height }
}

/** CSS of the score card; every class is prefixed `score-`, every colour is a palette value. */
export function scoreSectionCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  return `
.score-card { display: block; box-sizing: border-box; margin: 0 0 ${CARD_MARGIN}px; padding: 10px; border: 1px solid ${palette.line}; border-radius: 6px; background: ${palette.panel}; }
.score-title { margin: 0; height: ${CARD_TITLE}px; font-family: ${font.heading}; font-size: 11px; line-height: ${CARD_TITLE}px; color: ${palette.ink}; }
.score-provisional { margin: 0; height: ${PROVISIONAL_HEIGHT}px; font-family: ${font.label}; font-size: 9px; line-height: ${PROVISIONAL_HEIGHT}px; color: ${palette.alert}; }
.score-tiles { display: flex; }
.score-tile { flex: 1; box-sizing: border-box; margin-right: ${TILE_GAP}px; padding: 8px 10px; border-radius: 6px; background: ${palette.paper}; }
.score-tile:last-child { margin-right: 0; }
.score-tile-heading { height: 12px; font-family: ${font.label}; font-size: 8px; line-height: 12px; color: ${palette.inkMuted}; }
.score-value { height: 28px; font-family: ${font.numeral}; font-size: 20px; line-height: 28px; color: ${palette.ink}; }
.score-value-empty { font-family: ${font.body}; font-size: 10px; color: ${palette.inkMuted}; }
.score-band { height: 16px; font-family: ${font.body}; font-size: 8.5px; line-height: 16px; color: ${palette.ink}; }
.score-dot { display: inline-block; width: 7px; height: 7px; margin-right: 5px; border-radius: 4px; }
.score-track { height: 6px; margin-top: 4px; border-radius: 3px; background: ${palette.bandTrack}; overflow: hidden; }
.score-fill { height: 6px; border-radius: 3px; }
`
}
