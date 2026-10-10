import { FACTOR_KEYS, STAND_FACTOR_KEYS, allowedScoresFor } from "@cortege/ibp-domain"
import type { FactorKey } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import type { DisplayedFactorResult } from "../../screens/survey-detail/useLocalDraftSummary"
import { buildFactorObservations, methodKeyOf } from "./factor-fields"
import type { ObservationLine } from "./factor-fields"
import { escapeHtml } from "./html"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The ten factor cards of the sheet (phase 25.1, D-01, D-09, D-10): the raw observations, the class
// scale with the retained class highlighted, the retained points and the scale line of the survey's
// method, A to G under the stand heading and H to J under the context heading, as CNPF orders them.
// Pure: the class and the points come from `factorEntries` (the app's single result), the chips
// from the domain's `allowedScoresFor`. No CSS column and no 1 px filled div (the iOS print engine
// ignores both, measured in plan 25.1-07); borders and flex rows only.

const t = fr.surveyExport

// The printed sentinel of a factor without a retained class (as `useLocalDraftSummary` writes it).
// Not imported: that module pulls React and storage in, and this one must stay pure.
const NOT_FILLED_CLASS = "Not filled"

// Height estimate, in design units of the 595 x 842 page (plan 25.1-07): the packer needs a block
// height before the print engine has laid anything out. Values are the CSS below: padding, rows and
// line heights, plus a width-based count of wrapped rows. Slightly generous on purpose, since a
// block that is too short spills over its page and one that is too tall only costs white space.
const CARD_PADDING = 16 // 8 top and 8 bottom
const CARD_HEAD = 20
const CARD_GAP = 6
const CARD_MARGIN = 8
const RESULT_MIN_HEIGHT = 36 // chips row 18 + gap 4 + class line 12 + slack
/** Height of a card with no observation line and no scale line. */
export const FACTOR_CARD_BASE_HEIGHT =
  CARD_PADDING + CARD_HEAD + CARD_GAP + RESULT_MIN_HEIGHT + CARD_MARGIN
const OBS_LINE_HEIGHT = 13
const OBS_ITEM_ROW_HEIGHT = 14 // 12 line plus 2 gap
const OBS_NOTE_HEIGHT = 12
const OBS_CHAR_WIDTH = 4.4 // 8.5 px Jost, average
const OBS_WIDTH = 313 // 515 content - 20 padding - 170 result column - 12 gap
const ITEM_PADDING = 14 // 5 + 5 padding, 2 border, 2 gap
const SCALE_LINE_HEIGHT = 11
const SCALE_CHARS_PER_LINE = 110
const HEADING_HEIGHT = 34

type Entry = DisplayedFactorResult | undefined

function wrappedRows(chars: number, charWidth: number, width: number): number {
  return Math.max(1, Math.ceil((chars * charWidth) / width))
}

function itemRows(items: string[]): number {
  let rows = 1
  let used = 0
  for (const item of items) {
    const width = Math.min(item.length * OBS_CHAR_WIDTH + ITEM_PADDING, OBS_WIDTH)
    if (used > 0 && used + width > OBS_WIDTH) {
      rows += 1
      used = 0
    }
    used += width
  }
  return rows
}

function observationHeight(lines: ObservationLine[]): number {
  let height = 0
  for (const line of lines) {
    const text = line.caption.length + (line.value?.length ?? 0) + 3
    height += wrappedRows(text, OBS_CHAR_WIDTH, OBS_WIDTH) * OBS_LINE_HEIGHT
    if (line.items && line.items.length > 0) height += itemRows(line.items) * OBS_ITEM_ROW_HEIGHT
    if (line.note) {
      height += wrappedRows(line.note.length, OBS_CHAR_WIDTH, OBS_WIDTH) * OBS_NOTE_HEIGHT
    }
  }
  return height
}

function scaleHeight(scale: string): number {
  const chars = t.factors.scale.length + 1 + scale.length
  return CARD_GAP + wrappedRows(chars, 1, SCALE_CHARS_PER_LINE) * SCALE_LINE_HEIGHT
}

function observationHtml(line: ObservationLine): string {
  const caption = `<span class="factor-caption">${escapeHtml(line.caption)}</span>`
  const value =
    line.value === null ? "" : `&nbsp;: <span class="factor-value">${escapeHtml(line.value)}</span>`
  // A line without a value and without items is a statement by itself (a count of genera).
  const head =
    line.value === null && !line.items
      ? `<div class="factor-line"><span class="factor-value">${escapeHtml(line.caption)}</span></div>`
      : `<div class="factor-line">${caption}${value}</div>`
  const items = line.items
    ? `<div class="factor-items">${line.items
        .map((item) => {
          const muted = item.endsWith(t.factors.genusNotCounted) ? " factor-item-muted" : ""
          return `<span class="factor-item${muted}">${escapeHtml(item)}</span>`
        })
        .join("")}</div>`
    : ""
  const note = line.note ? `<div class="factor-note">${escapeHtml(line.note)}</div>` : ""
  return `${head}${items}${note}`
}

function chipsHtml(factor: FactorKey, points: number | null): string {
  return allowedScoresFor(factor)
    .map((score) => {
      const on = points !== null && score === points ? " factor-chip-on" : ""
      return `<span class="factor-chip${on}">${score}</span>`
    })
    .join("")
}

function resultHtml(entry: Entry, palette: PdfPalette): { html: string; points: number | null } {
  if (!entry || entry.selected_class === NOT_FILLED_CLASS) {
    const style = `color: ${escapeHtml(palette.alert)}`
    return {
      html: `<div class="factor-class factor-missing" style="${style}">${escapeHtml(t.factors.missing)}</div>`,
      points: null,
    }
  }
  const points = entry.score_points
  const pointsText =
    points === null ? "" : ` · ${escapeHtml(t.factors.pointsOutOfFive({ points: String(points) }))}`
  return {
    html: `<div class="factor-class">${escapeHtml(t.factors.retainedClass)}&nbsp;: <span class="factor-value">${escapeHtml(entry.selected_class)}</span>${pointsText}</div>`,
    points,
  }
}

function cardBlock(factor: FactorKey, data: SurveyExportData, palette: PdfPalette): PdfBlock {
  const entry: Entry = data.factorEntries.find(([key]) => key === factor)?.[1]
  const lines = buildFactorObservations(factor, data.rawFactors, {
    method: data.method,
    points: entry?.score_points ?? null,
  })
  const result = resultHtml(entry, palette)
  const scale = t.scaleLines[methodKeyOf(data.method.version)][factor]
  const title = fr.labels.factorTitles[factor]
  const html = `<section class="factor-card">
<div class="factor-head"><span class="factor-letter">${factor}</span><span class="factor-title">${escapeHtml(title)}</span></div>
<div class="factor-body">
<div class="factor-obs">${lines.map(observationHtml).join("")}</div>
<div class="factor-result"><div class="factor-chips">${chipsHtml(factor, result.points)}</div>${result.html}</div>
</div>
<p class="factor-scale"><span class="factor-scale-label">${escapeHtml(t.factors.scale)}</span> ${escapeHtml(scale)}</p>
</section>`
  const height =
    CARD_PADDING +
    CARD_HEAD +
    CARD_GAP +
    Math.max(observationHeight(lines), RESULT_MIN_HEIGHT) +
    scaleHeight(scale) +
    CARD_MARGIN
  return { id: `factor-${factor}`, html, height }
}

function headingBlock(id: string, text: string): PdfBlock {
  return {
    id,
    html: `<h2 class="factor-group">${escapeHtml(text)}</h2>`,
    height: HEADING_HEIGHT,
    keepWithNext: true,
  }
}

/** Stand heading, cards A to G, context heading, cards H to J, as packable blocks. */
export function buildFactorBlocks(data: SurveyExportData, palette: PdfPalette): PdfBlock[] {
  const stand = new Set<FactorKey>(STAND_FACTOR_KEYS)
  const blocks: PdfBlock[] = [headingBlock("factor-heading-stand", t.factors.standGroup)]
  for (const factor of FACTOR_KEYS.filter((key) => stand.has(key))) {
    blocks.push(cardBlock(factor, data, palette))
  }
  blocks.push(headingBlock("factor-heading-context", t.factors.contextGroup))
  for (const factor of FACTOR_KEYS.filter((key) => !stand.has(key))) {
    blocks.push(cardBlock(factor, data, palette))
  }
  return blocks
}

/** CSS of the factor cards; every class is prefixed `factor-`, every colour is a palette value. */
export function factorSectionCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  return `
.factor-group { margin: 0; padding: 14px 0 6px; font-family: ${font.heading}; font-size: 12px; line-height: 14px; color: ${palette.ink}; }
.factor-card { display: block; box-sizing: border-box; margin: 0 0 ${CARD_MARGIN}px; padding: 8px 10px; border: 1px solid ${palette.line}; border-radius: 6px; background: ${palette.panel}; }
.factor-head { display: flex; align-items: center; height: ${CARD_HEAD}px; }
.factor-letter { display: block; width: 20px; height: 20px; border-radius: 10px; background: ${palette.accent}; color: ${palette.accentInk}; font-family: ${font.title}; font-size: 11px; line-height: 20px; text-align: center; }
.factor-title { margin-left: 8px; font-family: ${font.heading}; font-size: 11px; color: ${palette.ink}; }
.factor-body { display: flex; margin-top: ${CARD_GAP}px; }
.factor-obs { flex: 1; padding-right: 12px; }
.factor-result { flex: none; width: 170px; }
.factor-line { font-family: ${font.body}; font-size: 8.5px; line-height: ${OBS_LINE_HEIGHT}px; color: ${palette.ink}; }
.factor-caption { color: ${palette.inkMuted}; }
.factor-value { font-family: ${font.label}; }
.factor-items { margin-bottom: 0; }
.factor-item { display: inline-block; margin: 0 4px 2px 0; padding: 0 5px; border: 1px solid ${palette.line}; border-radius: 6px; background: ${palette.paper}; font-family: ${font.body}; font-size: 8px; line-height: 10px; color: ${palette.ink}; }
.factor-item-muted { color: ${palette.inkFaint}; }
.factor-note { font-family: ${font.body}; font-size: 8px; line-height: ${OBS_NOTE_HEIGHT}px; color: ${palette.inkMuted}; }
.factor-chips { height: 18px; }
.factor-chip { display: inline-block; box-sizing: border-box; width: 22px; height: 18px; margin-right: 4px; border: 1px solid ${palette.line}; border-radius: 4px; background: ${palette.paper}; font-family: ${font.label}; font-size: 9px; line-height: 16px; text-align: center; color: ${palette.inkMuted}; }
.factor-chip-on { border-color: ${palette.accent}; background: ${palette.accent}; color: ${palette.accentInk}; }
.factor-class { margin-top: 4px; font-family: ${font.body}; font-size: 8.5px; line-height: 12px; color: ${palette.ink}; }
.factor-missing { font-family: ${font.label}; color: ${palette.alert}; }
.factor-scale { margin: ${CARD_GAP}px 0 0; font-family: ${font.body}; font-size: 7.5px; line-height: ${SCALE_LINE_HEIGHT}px; color: ${palette.inkMuted}; }
.factor-scale-label { font-family: ${font.label}; color: ${palette.ink}; }
`
}
