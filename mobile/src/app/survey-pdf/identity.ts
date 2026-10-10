import {
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  resolveMethodVersion,
  usesCas3Scale,
} from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { escapeHtml, formatCoordinate, formatDateFr } from "./html"
import { PDF_FONT_FAMILIES } from "./types"
import type { ExportMethodContext, PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The identity and method blocks that open the sheet (phase 25.1, D-03, D-04): what the CNPF sheet
// header carries and the app knows. Pure: values come from `SurveyExportData` and the catalogue,
// every text goes through `escapeHtml`, and an unknown value reads "Non renseigné", never a dash.

const t = fr.surveyExport

type Row = { caption: string; valueHtml: string; chars: number }

// Height estimate, in design units of the 595 x 842 page (plan 25.1-07). The caption column is
// fixed, the value column wraps; slightly generous on purpose (a block too short spills over its
// page, one too tall only costs white space).
const CARD_PADDING = 20 // 10 top and 10 bottom
const CARD_HEADING = 24
const CARD_MARGIN = 10
const ROW_PADDING = 6 // 3 top and 3 bottom
const ROW_LINE_HEIGHT = 13
// 515 content - 20 padding - 150 caption column leaves 345 px at 9 px Jost, about 3.7 pt per
// character on both platforms (device pre-check of plan 25.1-17: the 78 character v3.2 cas 1 line
// fills 292 pt of it). 62 made every v3.2 cas row and the 64 character site name count as two
// lines, which pushed the factor chart off page 1 of an ordinary survey.
const VALUE_CHARS_PER_LINE = 80

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
    department: commune.startsWith("97") ? commune.slice(0, 3) : commune.slice(0, 2),
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
  const lines = Math.max(1, Math.ceil(row.chars / VALUE_CHARS_PER_LINE))
  return ROW_PADDING + lines * ROW_LINE_HEIGHT
}

function cardBlock(id: string, heading: string, rows: Row[]): PdfBlock {
  const html = `<section class="identity-card">
<h2 class="identity-heading">${escapeHtml(heading)}</h2>
<table class="identity-table">${rows.map(rowHtml).join("")}</table>
</section>`
  const height =
    CARD_PADDING + CARD_HEADING + rows.reduce((sum, row) => sum + rowHeight(row), 0) + CARD_MARGIN
  return { id, html, height }
}

function identityRows(data: SurveyExportData): Row[] {
  const unknown = t.identity.unknown
  const rows: Row[] = [
    textRow(t.identity.site, data.siteName),
    textRow(
      t.identity.parcels,
      data.parcelIds.length > 0 ? data.parcelIds.join(", ") : t.identity.noParcel,
    ),
  ]
  const insee = data.parcelIds.length > 0 ? inseeFromParcelId(data.parcelIds[0]) : null
  if (insee) {
    rows.push(textRow(t.identity.commune, insee.commune))
    rows.push(textRow(t.identity.department, insee.department))
  }
  rows.push(
    textRow(
      t.identity.observationYear,
      data.observationYear === null ? unknown : String(data.observationYear),
    ),
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
  // The app only knows the capped survey mode: no factor is lifted above its cap.
  rows.push(textRow(t.identity.surveyMode, t.identity.cappedMode))
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

/** The identity block, then the method context block (cas for v3.2, region and stage for v3.0). */
export function buildIdentityBlocks(data: SurveyExportData, _palette: PdfPalette): PdfBlock[] {
  return [
    cardBlock("identity", t.identity.heading, identityRows(data)),
    cardBlock("identity-method", t.method.heading, methodRows(data.method)),
  ]
}

/** CSS of the identity blocks; every class is prefixed `identity-`, every colour is a palette value. */
export function identityCss(palette: PdfPalette): string {
  const font = PDF_FONT_FAMILIES
  return `
.identity-card { display: block; box-sizing: border-box; margin: 0 0 ${CARD_MARGIN}px; padding: 10px; border: 1px solid ${palette.line}; border-radius: 6px; background: ${palette.panel}; }
.identity-heading { margin: 0; height: ${CARD_HEADING}px; font-family: ${font.heading}; font-size: 11px; line-height: ${CARD_HEADING}px; color: ${palette.ink}; }
.identity-table { width: 100%; border-collapse: collapse; }
.identity-row { vertical-align: top; }
.identity-caption { width: 150px; padding: 3px 8px 3px 0; text-align: left; font-family: ${font.label}; font-size: 8.5px; line-height: ${ROW_LINE_HEIGHT}px; font-weight: normal; color: ${palette.inkMuted}; }
.identity-value { padding: 3px 0; font-family: ${font.body}; font-size: 9px; line-height: ${ROW_LINE_HEIGHT}px; color: ${palette.ink}; }
.identity-strong { font-family: ${font.label}; }
.identity-note { color: ${palette.inkMuted}; }
`
}
