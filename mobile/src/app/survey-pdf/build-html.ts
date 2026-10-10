import { fr } from "../../i18n"
import { buildFactorChartBlock, factorChartCss } from "./factor-chart-svg"
import { buildFactorBlocks, factorSectionCss } from "./factor-section"
import { escapeHtml, formatDateFr } from "./html"
import { buildIdentityBlocks, identityCss } from "./identity"
import { buildMapBlock, mapSectionCss } from "./map-section"
import { paginateBlocks } from "./paginate"
import { buildPdfPalette } from "./palette"
import { buildPhotoBlocks, photosSectionCss } from "./photos-section"
import { buildScoreSummaryBlock, scoreSectionCss } from "./score-section"
import { PDF_CLASS, buildBaseCss, cspMetaTag, fontFaceCss, fontWarmupHtml } from "./styles"
import { buildTrendBlock, trendSectionCss } from "./trend-section"
import type { PdfBlock, PdfPalette, SurveyExportData } from "./types"

// The whole print document of the survey sheet (phase 25.1, D-01 to D-11), as one pure function:
// the head (charset, content security policy, title, one style element) and the fixed A4 pages in
// the order of the sheet. Every section builder escapes its own text; the chrome texts are
// escaped by the paginator. Nothing here reads a file, a URL or the device.

const t = fr.surveyExport

/** The content blocks in the order of the sheet: identity and method, scores and chart, factors
 * A to G then H to J, map, trend, photos. */
function collectBlocks(data: SurveyExportData, palette: PdfPalette): PdfBlock[] {
  const blocks: PdfBlock[] = []
  // Hidden text in each embedded font, only when the device check asked for it.
  const warmup = fontWarmupHtml(data.assets.fonts)
  if (warmup !== "") blocks.push({ id: "font-warmup", html: warmup, height: 0 })
  blocks.push(
    ...buildIdentityBlocks(data, palette),
    buildScoreSummaryBlock(data, palette),
    buildFactorChartBlock(data, palette),
    ...buildFactorBlocks(data, palette),
    buildMapBlock(data, palette),
    buildTrendBlock(data, palette),
    ...buildPhotoBlocks(data, palette),
  )
  return blocks
}

/** One style element: the fonts, the page shell, then the CSS of every section. */
function collectCss(data: SurveyExportData, palette: PdfPalette): string {
  return [
    fontFaceCss(data.assets.fonts),
    buildBaseCss(palette, data.layout),
    identityCss(palette),
    scoreSectionCss(palette),
    factorChartCss(palette),
    factorSectionCss(palette),
    mapSectionCss(palette),
    trendSectionCss(palette),
    photosSectionCss(palette),
  ].join("\n")
}

/**
 * The HTML document handed to the print WebView, and how many pages it holds. The same input
 * always gives the same output.
 */
export function buildSurveyExportHtml(data: SurveyExportData): {
  html: string
  pageCount: number
} {
  const palette = buildPdfPalette()
  const { html: pages, pageCount } = paginateBlocks(collectBlocks(data, palette), {
    siteName: data.siteName,
    logoDataUri: data.assets.logoDataUri,
    isDraft: data.isDraft,
    generatedAtText: formatDateFr(data.generatedAtIso, t.identity.unknown),
  })
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
${cspMetaTag()}
<title>${escapeHtml(t.documentTitle(data.siteName))}</title>
<style>
${collectCss(data, palette)}
</style>
</head>
<body>
<div class="${PDF_CLASS.root}">
${pages}
</div>
</body>
</html>`
  return { html, pageCount }
}
