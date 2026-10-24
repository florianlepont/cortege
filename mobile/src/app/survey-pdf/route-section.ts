import { fr } from "../../i18n"
import { routeDisplayRows } from "../route-display"
import { conditionsBlockHeight } from "./conditions-section"
import { escapeHtml } from "./html"
import { sectionTitleCss } from "./styles"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The "Parcours utilisé" block that follows "Conditions du relevé" (phase 30, D-09, spec section 9):
// the route the observer used, in the words of the official method (O-12), printed for a draft as
// well as for a submitted survey. Text only: the trace of the route on the map is Phase 31. Same
// visual family and same height method as `conditions-section.ts`. Pure: the rows come from
// `routeDisplayRows(route, "pdf")` (shared with the Contexte card, one set of words), every dynamic
// text goes through `escapeHtml` (T-30-32), and the block is `null` when the survey has no route,
// so a survey recorded before the phase prints exactly as it did (U-11, P-3). Borders and flex-free
// table rows only: no CSS column and no 1 px filled div (the iOS print engine ignores them).

const t = fr.surveyExport.route

const CARD_HEADING = 24
const CARD_MARGIN = 10
const LINE_HEIGHT = 13

function rowHtml(caption: string, value: string): string {
  return `<tr class="route-row"><th class="route-caption">${escapeHtml(caption)}</th><td class="route-value">${escapeHtml(value)}</td></tr>`
}

/** The route card, or null when the survey has no route. Height: the conditions formula. */
export function buildRouteBlock(data: SurveyExportData, _palette: PdfPalette): PdfBlock | null {
  if (data.route === null) return null
  const rows = routeDisplayRows(data.route, "pdf")
  const html = `<section class="route-card">
<h2 class="route-heading">${escapeHtml(t.heading)}</h2>
<table class="route-table">${rows.map((row) => rowHtml(row.caption, row.value)).join("")}</table>
</section>`
  return {
    id: "route",
    html,
    height: conditionsBlockHeight(rows.map((row) => ({ text: row.value }))),
  }
}

/** CSS of the route block; every class is prefixed `route-`, every colour is a palette value. */
export function routeSectionCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  return `
.route-card { display: block; box-sizing: border-box; margin: 0 0 ${CARD_MARGIN}px; padding: 10px; border: 1px solid ${palette.line}; border-radius: 12px; background: ${palette.panel}; }
${sectionTitleCss(".route-heading", palette)}
.route-table { width: 100%; table-layout: fixed; border-collapse: collapse; }
.route-row { vertical-align: top; }
.route-caption { width: 150px; padding: 3px 8px 3px 0; text-align: left; font-family: ${font.label}; font-size: 8.5px; line-height: ${LINE_HEIGHT}px; font-weight: normal; color: ${palette.inkMuted}; }
.route-value { padding: 3px 0; font-family: ${font.body}; font-size: 9px; line-height: ${LINE_HEIGHT}px; color: ${palette.ink}; overflow-wrap: anywhere; }
`
}
