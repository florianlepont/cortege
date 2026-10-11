import { SURVEY_NOTE_MAX_LENGTH, normalizeNoteText } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { formatObservationTime, formatWeatherLine, weatherProvenance } from "../weather"
import { escapeHtml } from "./html"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The "Conditions du relevé" block that follows the identity cards (phase 27, D-17, D-26; UI-SPEC
// 4.1, 4.2): the weather sentence, where the weather comes from and the observer's note. Same
// visual family and same height method as `identity.ts`. Pure: values come from `SurveyExportData`
// and the catalogue, every dynamic text goes through `escapeHtml`, and the block is `null` when the
// survey has neither a weather value nor a note (no empty card, no "non renseigné"). Borders and
// flex-free table rows only: no CSS column and no 1 px filled div (the iOS print engine ignores them).

const t = fr.surveyExport.conditions

// Height estimate, in design units of the 595 x 842 page (UI-SPEC 4.2): the packer needs a block
// height before the print engine has laid anything out. Same rules as the identity cards; a row is
// 6 + lines x 13, with the lines counted per paragraph so a note with line breaks never reads short.
const CARD_PADDING = 20 // 10 top and 10 bottom
const CARD_HEADING = 24
const CARD_MARGIN = 10
const ROW_GAP = 6 // 3 top and 3 bottom
const LINE_HEIGHT = 13
// 515 content - 20 padding - 150 caption column leaves 345 px at 9 px Jost: 80 characters a line,
// the figure measured for the identity cards (plan 25.1-17).
const CHARS_PER_LINE = 80

type Row = { caption: string; text: string; note?: boolean }

function linesOf(text: string): number {
  return text
    .split("\n")
    .reduce((sum, paragraph) => sum + Math.max(1, Math.ceil(paragraph.length / CHARS_PER_LINE)), 0)
}

/** Height of the card for these rows: padding, heading, margin, then 6 + lines x 13 per row. */
export function conditionsBlockHeight(rows: Array<{ text: string }>): number {
  const body = rows.reduce((sum, row) => sum + ROW_GAP + linesOf(row.text) * LINE_HEIGHT, 0)
  return CARD_PADDING + CARD_HEADING + body + CARD_MARGIN
}

function weatherRows(data: SurveyExportData): Row[] {
  const weather = data.conditions.weather
  const line = formatWeatherLine(weather)
  const provenance = weatherProvenance(weather)
  if (!weather || line === null || provenance === null) return []
  const time = formatObservationTime(weather.observed_at ?? weather.requested_at)
  return [
    { caption: t.weather, text: t.weatherSentence({ line, time }) },
    { caption: t.source, text: t.sourceValue[provenance] },
  ]
}

function rowHtml(row: Row): string {
  const text = escapeHtml(row.text)
  const value = row.note ? `<div class="conditions-note">${text}</div>` : text
  return `<tr class="conditions-row"><th class="conditions-caption">${escapeHtml(row.caption)}</th><td class="conditions-value">${value}</td></tr>`
}

/**
 * The conditions card, or null when the survey has no weather value and no note. The note is
 * clamped to 1000 characters here as well as on entry (defence in depth, T-27-54).
 */
export function buildConditionsBlock(
  data: SurveyExportData,
  _palette: PdfPalette,
): PdfBlock | null {
  const rows = weatherRows(data)
  const note = normalizeNoteText(data.conditions.note, SURVEY_NOTE_MAX_LENGTH)
  if (note !== null) rows.push({ caption: t.note, text: note, note: true })
  if (rows.length === 0) return null
  const html = `<section class="conditions-card">
<h2 class="conditions-heading">${escapeHtml(t.heading)}</h2>
<table class="conditions-table">${rows.map(rowHtml).join("")}</table>
</section>`
  return { id: "conditions", html, height: conditionsBlockHeight(rows) }
}

/** CSS of the conditions block; every class is prefixed `conditions-`, every colour is a palette value. */
export function conditionsSectionCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  return `
.conditions-card { display: block; box-sizing: border-box; margin: 0 0 ${CARD_MARGIN}px; padding: 10px; border: 1px solid ${palette.line}; border-radius: 6px; background: ${palette.panel}; }
.conditions-heading { margin: 0; height: ${CARD_HEADING}px; font-family: ${font.heading}; font-size: 11px; line-height: ${CARD_HEADING}px; color: ${palette.ink}; }
.conditions-table { width: 100%; table-layout: fixed; border-collapse: collapse; }
.conditions-row { vertical-align: top; }
.conditions-caption { width: 150px; padding: 3px 8px 3px 0; text-align: left; font-family: ${font.label}; font-size: 8.5px; line-height: ${LINE_HEIGHT}px; font-weight: normal; color: ${palette.inkMuted}; }
.conditions-value { padding: 3px 0; font-family: ${font.body}; font-size: 9px; line-height: ${LINE_HEIGHT}px; color: ${palette.ink}; overflow-wrap: anywhere; }
.conditions-note { white-space: pre-wrap; overflow-wrap: anywhere; }
`
}
