import * as Print from "expo-print"
import * as Sharing from "expo-sharing"
import { FACTOR_KEYS } from "@cortege/ibp-domain"
import type {
  DisplayedFactorResult,
  DisplayedScores,
} from "../screens/survey-detail/useLocalDraftSummary"
import { fr } from "../i18n"

// Reads factor titles straight from the catalogue rather than app/constants.ts (which pulls in
// react-native's Platform for an unrelated default), so this module stays a plain data/string
// transform with no native dependency beyond expo-print/expo-sharing.
const FACTOR_TITLES = fr.labels.factorTitles
const t = fr.surveyExport

// Mirrors useLocalDraftSummary's NOT_FILLED_CLASS sentinel (type-only import above, so this
// module pulls in none of that hook's storage/react-native dependencies).
const NOT_FILLED_CLASS = "Not filled"

/** Everything the PDF needs, read from data already loaded on device (REQ-C-pdf-export). */
export type SurveyExportData = {
  siteName: string
  parcelIds: string[]
  observationYear: number | null
  versionNumber: number | null
  methodVersion: string | null
  dateIso: string
  scores: DisplayedScores | null
  factorEntries: Array<[string, DisplayedFactorResult]>
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatDate(dateIso: string): string {
  const date = new Date(dateIso)
  if (Number.isNaN(date.getTime())) {
    return t.identity.unknown
  }
  return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
}

function identityRow(label: string, value: string): string {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
}

function factorRow(factorCode: string, entry: DisplayedFactorResult | undefined): string {
  const title = FACTOR_TITLES[factorCode as keyof typeof FACTOR_TITLES] ?? factorCode
  const classLabel =
    entry && entry.selected_class !== NOT_FILLED_CLASS ? entry.selected_class : t.scores.notFilled
  return `<tr><td>${escapeHtml(factorCode)} — ${escapeHtml(title)}</td><td>${escapeHtml(classLabel)}</td></tr>`
}

/** Pure HTML builder, unit-tested on its own — the only part expo-print renders to PDF. */
export function buildSurveyExportHtml(data: SurveyExportData): string {
  const entriesByFactor = new Map(data.factorEntries)
  const factorRows = FACTOR_KEYS.map((factor) =>
    factorRow(factor, entriesByFactor.get(factor)),
  ).join("")
  const parcelsValue = data.parcelIds.length > 0 ? data.parcelIds.join(", ") : t.identity.noParcel
  const scoreSection = data.scores
    ? `<p class="total">${escapeHtml(t.scores.total(data.scores.ibp_total))}</p>
       <p class="subtotal">${escapeHtml(t.scores.stand(data.scores.ibp_peuplement_gestion))} · ${escapeHtml(
         t.scores.context(data.scores.ibp_contexte),
       )}</p>`
    : `<p class="subtotal">${escapeHtml(t.scores.notFilled)}</p>`

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1b1b1b; padding: 24px; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 16px; margin-top: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 13px; }
      th { width: 40%; color: #555; font-weight: 600; }
      .total { font-size: 22px; font-weight: 700; margin: 8px 0 0; }
      .subtotal { font-size: 13px; color: #555; margin: 2px 0 0; }
      footer { margin-top: 32px; font-size: 11px; color: #888; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(t.documentTitle(data.siteName))}</h1>
    <table>
      ${identityRow(t.identity.site, data.siteName)}
      ${identityRow(t.identity.parcels, parcelsValue)}
      ${identityRow(
        t.identity.observationYear,
        data.observationYear !== null ? String(data.observationYear) : t.identity.unknown,
      )}
      ${identityRow(
        t.identity.versionNumber,
        data.versionNumber !== null ? String(data.versionNumber) : t.identity.unknown,
      )}
      ${identityRow(t.identity.date, formatDate(data.dateIso))}
      ${identityRow(t.identity.method, data.methodVersion ?? t.identity.unknown)}
    </table>

    <h2>${escapeHtml(t.scores.title)}</h2>
    ${scoreSection}
    <table>
      <tr><th>${escapeHtml(t.scores.factorHeader)}</th><th>${escapeHtml(t.scores.classHeader)}</th></tr>
      ${factorRows}
    </table>

    <footer>${escapeHtml(t.footer(formatDate(new Date().toISOString())))}</footer>
  </body>
</html>`
}

/** Renders the PDF to a local file. No network call — works offline (REQ-C-pdf-export criterion 2). */
export async function generateSurveyExportPdf(data: SurveyExportData): Promise<string> {
  const html = buildSurveyExportHtml(data)
  const { uri } = await Print.printToFileAsync({ html, base64: false })
  return uri
}

/** Sends a generated PDF through the OS share sheet. Returns false when no share target exists. */
export async function shareSurveyExportPdf(uri: string, siteName: string): Promise<boolean> {
  const available = await Sharing.isAvailableAsync()
  if (!available) {
    return false
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: t.shareDialogTitle(siteName),
    UTI: "com.adobe.pdf",
  })
  return true
}

/** Full export flow: generate on device, then hand it to the share sheet. */
export async function exportAndShareSurveyPdf(
  data: SurveyExportData,
): Promise<{ shared: boolean }> {
  const uri = await generateSurveyExportPdf(data)
  const shared = await shareSurveyExportPdf(uri, data.siteName)
  return { shared }
}
