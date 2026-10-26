import {
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  resolveMethodVersion,
  usesCas3Scale,
} from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { escapeHtml, formatCoordinate, formatDateFr } from "./html"
import { sectionTitleCss } from "./styles"
import { PDF_FONT_FAMILIES } from "./types"
import type { ExportMethodContext, PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The identity block that opens the sheet (phase 25.1, D-03, D-04; phase 33, D-01, UI-SPEC B.6): what
// the CNPF sheet header carries and the app knows, with the method rows folded in as a second part
// of the same card. Pure: values come from `SurveyExportData` and the catalogue,
// every text goes through `escapeHtml`, and an unknown value reads "Non renseigné", never a dash.
// Phase 33, 2026-10-26: the parcels row prints every id and counts its lines by ids (D-23); the
// observation year row prints only when it differs from the year of the date (D-25).

const t = fr.surveyExport

// `lines` is set when the line count is known without counting characters (the parcels row).
type Row = { caption: string; valueHtml: string; chars: number; lines?: number }

// Height estimate, in design units of the 595 x 842 page (plan 25.1-07). The caption column is
// fixed, the value column wraps; slightly generous on purpose (a block too short spills over its
// page, one too tall only costs white space).
const CARD_PADDING = 20 // 10 top and 10 bottom
const CARD_BORDER = 2 // 1 top and 1 bottom: measured in Chrome 2026-10-26, the card prints 1.5 to 1.75 taller than the rows alone
const CARD_HEADING = 24
const CARD_MARGIN = 10
// UI-SPEC B.6: the method rows sit in the same card under a 1 unit rule and an 11 / 24 sub-heading.
// The padding, margin and heading of the old method card (20 + 10 + 24 = 54) are saved, minus these
// two (1 + 24 = 25): the merged card is 29 units shorter than the two cards it replaces.
const RULE_HEIGHT = 1
const SUBHEADING_HEIGHT = 24
const ROW_PADDING = 6 // 3 top and 3 bottom
const ROW_LINE_HEIGHT = 13
// 515 content - 20 padding - 150 caption column leaves 345 px at 9 px Jost, about 3.7 pt per
// character on both platforms (device pre-check of plan 25.1-17: the 78 character v3.2 cas 1 line
// fills 292 pt of it). 62 made every v3.2 cas row and the 64 character site name count as two
// lines, which pushed the factor chart off page 1 of an ordinary survey.
const VALUE_CHARS_PER_LINE = 80
// D-23: the parcels row counts lines by ids, not by characters. Measured by the planner in Chrome on
// 2026-10-26 (harness of 33-RENDER-HARNESS.md, value column of the card): ids such as
// 77186000AB0001 fit 4 per line, ids with wide section letters such as 2A004000WM0001 fit 3; 30 ids
// printed 8 and 10 lines, where the former 80-character rule estimated 6, under the print. 3 is the
// narrowest count, so the estimate never falls below the printed height.
const PARCEL_IDS_PER_LINE = 3

export type Insee = { commune: string; department: string }

// 14 characters: the INSEE commune (two digits or 2A/2B, then three digits), then the prefix,
// the section and the number.
const CADASTRAL_ID = /^((?:\d{2}|2[AB])\d{3})[0-9A-Z]{9}$/

/** The commune code and the department of a 14-character cadastral id, or null if it is malformed. */
export function inseeFromParcelId(id: string): Insee | null {
  const match = CADASTRAL_ID.exec(id)
  if (!match) return null
  const commune = match[1]
  return {
    commune,
    // Overseas departments 971 to 976 and the 98x collectivities have three characters (the regex
    // keeps Corsica's 2A and 2B at two).
    department:
      commune.startsWith("97") || commune.startsWith("98")
        ? commune.slice(0, 3)
        : commune.slice(0, 2),
  }
}

/** The catalogue text of a stored code, or the unknown text. Own keys only (no prototype keys). */
function labelOf(labels: Record<string, string>, code: string | null): string {
  if (code === null || !Object.prototype.hasOwnProperty.call(labels, code)) {
    return t.identity.unknown
  }
  return labels[code]
}

function textRow(caption: string, value: string): Row {
  return { caption, valueHtml: escapeHtml(value), chars: value.length }
}

function rowHtml(row: Row): string {
  return `<tr class="identity-row"><th class="identity-caption">${escapeHtml(row.caption)}</th><td class="identity-value">${row.valueHtml}</td></tr>`
}

function rowHeight(row: Row): number {
  const lines = row.lines ?? Math.max(1, Math.ceil(row.chars / VALUE_CHARS_PER_LINE))
  return ROW_PADDING + lines * ROW_LINE_HEIGHT
}

function tableHtml(rows: Row[]): string {
  return `<table class="identity-table">${rows.map(rowHtml).join("")}</table>`
}

function rowsHeight(rows: Row[]): number {
  return rows.reduce((sum, row) => sum + rowHeight(row), 0)
}

function identityBlock(data: SurveyExportData): PdfBlock {
  const identity = identityRows(data)
  const method = methodRows(data.method)
  const html = `<section class="identity-card">
<h2 class="identity-heading">${escapeHtml(t.identity.heading)}</h2>
${tableHtml(identity)}
<div class="identity-rule"></div>
<h3 class="identity-subheading">${escapeHtml(t.method.heading)}</h3>
${tableHtml(method)}
</section>`
  const height =
    CARD_PADDING +
    CARD_BORDER +
    CARD_HEADING +
    rowsHeight(identity) +
    RULE_HEIGHT +
    SUBHEADING_HEIGHT +
    rowsHeight(method) +
    CARD_MARGIN
  return { id: "identity", html, height }
}

// Each id is escaped, then wrapped so that a line break only falls between two ids (B.6). Every id
// is printed, never shortened (D-23); the height estimate counts lines by ids.
function parcelsRow(parcelIds: string[]): Row {
  if (parcelIds.length === 0) return textRow(t.identity.parcels, t.identity.noParcel)
  return {
    caption: t.identity.parcels,
    valueHtml: parcelIds
      .map((id) => `<span class="identity-nowrap">${escapeHtml(id)}</span>`)
      .join(", "),
    chars: parcelIds.join(", ").length,
    lines: Math.max(1, Math.ceil(parcelIds.length / PARCEL_IDS_PER_LINE)),
  }
}

// The year of the survey date as `formatDateFr` prints it (same parse, local time), or null when
// the date cannot be read.
function printedDateYear(dateIso: string): number | null {
  const date = new Date(dateIso)
  return Number.isNaN(date.getTime()) ? null : date.getFullYear()
}

function identityRows(data: SurveyExportData): Row[] {
  const unknown = t.identity.unknown
  const rows: Row[] = [textRow(t.identity.site, data.siteName), parcelsRow(data.parcelIds)]
  const insee = data.parcelIds.length > 0 ? inseeFromParcelId(data.parcelIds[0]) : null
  if (insee) {
    rows.push(
      textRow(
        t.identity.commune,
        t.identity.communeValue({ code: insee.commune, department: insee.department }),
      ),
    )
  }
  // D-25: the observation year adds something only when it differs from the year of the printed
  // date (or the date cannot be read); a null year prints no row.
  if (data.observationYear !== null && data.observationYear !== printedDateYear(data.dateIso)) {
    rows.push(textRow(t.identity.observationYear, String(data.observationYear)))
  }
  rows.push(
    textRow(
      t.identity.versionNumber,
      data.versionNumber === null ? unknown : String(data.versionNumber),
    ),
    textRow(t.identity.date, formatDateFr(data.dateIso, unknown)),
  )
  const observer = data.observerName?.trim()
  if (observer) rows.push(textRow(t.identity.observer, observer))
  if (data.coordinates) {
    rows.push(
      textRow(
        t.identity.coordinates,
        t.identity.coordinatesValue({
          lat: formatCoordinate(data.coordinates.lat),
          lng: formatCoordinate(data.coordinates.lng),
        }),
      ),
    )
  }
  // Phase 30 (spec section 9, U-11, P-3): the "Parcours utilisé" block states the mode of the
  // survey (capped, or the factors counted in full), so the row would repeat it, and the capped
  // sentence would be wrong for an uncapped survey. It goes only when that block prints. A survey
  // with no route (submitted before the phase) keeps the row exactly as it was: the app then
  // only knew the capped mode and no factor was lifted above its cap.
  if (data.route === null) rows.push(textRow(t.identity.surveyMode, t.identity.cappedMode))
  return rows
}

/** The version label: the legacy text for an untagged survey, unknown for an unsupported tag. */
function versionLabel(version: string | null): string {
  const resolved = resolveMethodVersion(version)
  if (resolved === null) return t.identity.unknown
  if (version === null || version === "") return fr.ibpMethod.legacyVersionLabel
  return fr.ibpMethod.versions[resolved]
}

function casRow(method: ExportMethodContext): Row {
  const cas = method.ibpCas
  const hasCas = cas === 1 || cas === 2 || cas === 3 || cas === 4
  if (!hasCas) return textRow(t.method.cas, t.identity.unknown)
  const label = fr.ibpMethod.casLabels[cas]
  const caption = fr.ibpMethod.casCaptions[cas]
  return {
    caption: t.method.cas,
    valueHtml: `<span class="identity-strong">${escapeHtml(label)}</span> <span class="identity-note">${escapeHtml(caption)}</span>`,
    chars: label.length + 1 + caption.length,
  }
}

function methodRows(method: ExportMethodContext): Row[] {
  const rows: Row[] = [textRow(t.method.version, versionLabel(method.version))]
  const resolved = resolveMethodVersion(method.version)
  if (resolved === IBP_METHOD_V3_2) {
    rows.push(casRow(method))
    if (usesCas3Scale({ ibp_cas: method.ibpCas, ibp_cas3_scale: method.ibpCas3Scale })) {
      rows.push(textRow(t.method.cas3Scale, fr.ibpMethod.cas3ScaleLabel))
    }
  } else if (resolved === IBP_METHOD_V3_0) {
    rows.push(textRow(t.method.region, labelOf(fr.labels.regions, method.regionVersion)))
    rows.push(textRow(t.method.stage, labelOf(fr.labels.vegetationStages, method.vegetationStage)))
  }
  return rows
}

/**
 * The method in a few words for the cover: "v3.2, cas 2", "v3.2", "v3.0" (also an untagged
 * survey) or the unknown text for an unsupported tag. The version rules stay the package's.
 */
export function methodShortText(method: ExportMethodContext): string {
  const resolved = resolveMethodVersion(method.version)
  if (resolved === IBP_METHOD_V3_2) {
    const version = t.cover.versionShort.v3_2
    const cas = method.ibpCas
    if (cas === 1 || cas === 2 || cas === 3 || cas === 4) {
      return t.cover.methodWithCas({ version, cas: String(cas) })
    }
    return version
  }
  if (resolved === IBP_METHOD_V3_0) return t.cover.versionShort.v3_0
  return t.identity.unknown
}

/** The merged identity block: identity rows, then the method rows (cas for v3.2, region and stage for v3.0). */
export function buildIdentityBlocks(data: SurveyExportData, _palette: PdfPalette): PdfBlock[] {
  return [identityBlock(data)]
}

/** CSS of the identity blocks; every class is prefixed `identity-`, every colour is a palette value. */
export function identityCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  return `
.identity-card { display: block; box-sizing: border-box; margin: 0 0 ${CARD_MARGIN}px; padding: 10px; border: 1px solid ${palette.line}; border-radius: 12px; background: ${palette.panel}; }
${sectionTitleCss(".identity-heading", palette)}
.identity-subheading { margin: 0; height: ${SUBHEADING_HEIGHT}px; font-family: ${font.heading}; font-size: 11px; line-height: ${SUBHEADING_HEIGHT}px; color: ${palette.ink}; }
.identity-rule { height: 0; border-top: ${RULE_HEIGHT}px solid ${palette.line}; }
.identity-nowrap { white-space: nowrap; }
.identity-table { width: 100%; border-collapse: collapse; }
.identity-row { vertical-align: top; }
.identity-caption { width: 150px; padding: 3px 8px 3px 0; text-align: left; font-family: ${font.label}; font-size: 8.5px; line-height: ${ROW_LINE_HEIGHT}px; font-weight: normal; color: ${palette.inkMuted}; }
.identity-value { padding: 3px 0; font-family: ${font.body}; font-size: 9px; line-height: ${ROW_LINE_HEIGHT}px; color: ${palette.ink}; }
.identity-strong { font-family: ${font.label}; }
.identity-note { color: ${palette.inkMuted}; }
`
}
