import { fr } from "../../i18n"
import { PDF_FONT_WARMUP, PDF_PAGE, PDF_PAGE_BLOCK_HEIGHT } from "./export-settings"
import { escapeHtml } from "./html"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfAssets, PdfLayout, PdfPalette } from "./types"

// The document shell of the PDF (phase 25.1, D-07): the content security policy, the embedded
// charter fonts, and the CSS of the fixed A4 pages that `paginate.ts` fills. Pure: strings in,
// strings out. Dimensions are in design px (the 595 x 842 space of `PDF_PAGE`); the per-platform
// layout scale is applied once, on the root, never per element (RESEARCH Patterns 3 and 4).

/**
 * The print WebView may load nothing: no network, no file, no script. Everything the page shows
 * (fonts, logo, photos, map) is inlined as a `data:` URI; inline styles stay allowed because the
 * builders write `style` attributes. T-25.1-04.
 */
export const PDF_CSP =
  "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'"

export function cspMetaTag(): string {
  return `<meta http-equiv="Content-Security-Policy" content="${PDF_CSP}">`
}

/** Class names shared by `buildBaseCss` and `paginate.ts`. */
export const PDF_CLASS = {
  root: "pdf-root",
  page: "page",
  draft: "page-draft",
  header: "page-header",
  headerMain: "page-header-main",
  logo: "page-logo",
  sheetName: "page-title",
  site: "page-site",
  body: "page-body",
  banner: "page-draft-banner",
  watermark: "page-watermark",
  footer: "page-footer",
  footerDate: "page-footer-date",
  footerApp: "page-footer-app",
  footerNumber: "page-footer-number",
  warmup: "pdf-warmup",
} as const

// Page geometry in design px. The content column is 515 wide (595 minus two 40 margins), the width
// every section builder was sized for (map frame, factor cards, trend curve).

/** Left and right margin of the header, body and footer. */
export const PAGE_MARGIN_X = 40

/** Space from the top of the page to the body: the header band (16 + 34) and a 10 px gap. */
export const PAGE_HEADER_HEIGHT = 60

/** Space from the bottom of the page to the end of the body: the footer (14 + 22) and a gap. */
export const PAGE_FOOTER_HEIGHT = 40

/** Extra space under the header on a draft page: the 18 px strip, 6 px of gap. */
export const DRAFT_BANNER_HEIGHT = 24

// Where the chrome boxes sit.
const HEADER_TOP = 16
const HEADER_BOX_HEIGHT = 34
const BANNER_TOP = 56
const BANNER_STRIP_HEIGHT = 18
const FOOTER_BOTTOM = 14
const FOOTER_BOX_HEIGHT = 22
const LOGO_SIZE = 26
const WATERMARK_SIZE = 110
const WATERMARK_TOP = (PDF_PAGE_BLOCK_HEIGHT - WATERMARK_SIZE) / 2

const FONT_FALLBACK = '"Helvetica Neue", Helvetica, Arial, sans-serif'

/** A CSS family name reduced to the characters a PostScript name may hold. */
function cssFamily(family: string): string {
  return family.replace(/[^A-Za-z0-9_-]/g, "")
}

/** The family followed by a system fallback, so a missing font never leaves serif text. */
function fontStack(family: string): string {
  return `"${cssFamily(family)}", ${FONT_FALLBACK}`
}

/**
 * One `@font-face` per font, named by its PostScript name, with the file inlined as base64. The
 * family keeps only name characters and the data only base64 characters, so nothing read from the
 * disk can close the rule.
 */
export function fontFaceCss(fonts: PdfAssets["fonts"]): string {
  return fonts
    .map(
      ({ family, base64 }) =>
        `@font-face { font-family: "${cssFamily(family)}"; src: url(data:font/ttf;base64,${base64.replace(/[^A-Za-z0-9+/=]/g, "")}) format("truetype"); font-weight: normal; font-style: normal; }`,
    )
    .join("\n")
}

/**
 * Hidden text in each embedded family, only when the device spike found that fonts miss page 1
 * (`PDF_FONT_WARMUP`). It was not needed on iOS or Android (25.1-07), so the default is off.
 */
export function fontWarmupHtml(
  fonts: PdfAssets["fonts"],
  enabled: boolean = PDF_FONT_WARMUP,
): string {
  if (!enabled || fonts.length === 0) return ""
  const text = escapeHtml(fr.surveyExport.sheetTitle)
  const spans = fonts
    .map(
      ({ family }) =>
        `<span style="${escapeHtml(`font-family: "${cssFamily(family)}"`)}">${text}</span>`,
    )
    .join("")
  return `<div class="${PDF_CLASS.warmup}" aria-hidden="true">${spans}</div>`
}

function scaleValue(layout: PdfLayout): string {
  return Number.isFinite(layout.layoutScale) && layout.layoutScale > 0
    ? String(layout.layoutScale)
    : "1"
}

/**
 * The CSS of the page shell: `@page`, the scaled root, the fixed page boxes and their header,
 * footer, draft banner and watermark. Colours are palette values only. Section CSS (identity,
 * score, factors, map, trend, photos) is concatenated by the document assembler.
 */
export function buildBaseCss(palette: PdfPalette, layout: PdfLayout): string {
  const c = PDF_CLASS
  const font = PDF_FONT_FAMILIES
  const contentWidth = PDF_PAGE.width - 2 * PAGE_MARGIN_X
  const bodyHeight = PDF_PAGE_BLOCK_HEIGHT - PAGE_HEADER_HEIGHT - PAGE_FOOTER_HEIGHT
  const draftBodyTop = PAGE_HEADER_HEIGHT + DRAFT_BANNER_HEIGHT
  const draftBodyHeight = bodyHeight - DRAFT_BANNER_HEIGHT
  return `@page { size: ${PDF_PAGE.width}pt ${PDF_PAGE.height}pt; margin: 0; }
html, body { margin: 0; padding: 0; background: ${palette.paper}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: ${fontStack(font.body)}; font-size: 11px; line-height: 1.3; color: ${palette.ink}; }
.${c.root} { zoom: ${scaleValue(layout)}; }
.${c.page} { position: relative; width: ${PDF_PAGE.width}px; height: ${PDF_PAGE_BLOCK_HEIGHT}px; overflow: hidden; background: ${palette.paper}; page-break-after: always; break-after: page; }
section.${c.page}:last-of-type { page-break-after: auto; break-after: auto; }
.${c.header} { position: absolute; left: ${PAGE_MARGIN_X}px; top: ${HEADER_TOP}px; width: ${contentWidth}px; height: ${HEADER_BOX_HEIGHT}px; box-sizing: border-box; border-bottom: 1px solid ${palette.line}; }
.${c.headerMain} { position: absolute; left: 0; top: 0; height: 32px; line-height: 32px; white-space: nowrap; }
.${c.logo} { width: ${LOGO_SIZE}px; height: ${LOGO_SIZE}px; margin-right: 8px; vertical-align: middle; }
.${c.sheetName} { font-family: ${fontStack(font.title)}; font-size: 13px; color: ${palette.accent}; vertical-align: middle; }
.${c.site} { position: absolute; right: 0; top: 0; max-width: 300px; height: 32px; line-height: 32px; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: ${fontStack(font.strong)}; font-size: 10px; color: ${palette.inkMuted}; }
.${c.banner} { position: absolute; left: ${PAGE_MARGIN_X}px; top: ${BANNER_TOP}px; width: ${contentWidth}px; height: ${BANNER_STRIP_HEIGHT}px; line-height: ${BANNER_STRIP_HEIGHT}px; border-radius: 3px; text-align: center; background: ${palette.alertSoft}; color: ${palette.alert}; font-family: ${fontStack(font.label)}; font-size: 9px; }
.${c.body} { position: absolute; left: ${PAGE_MARGIN_X}px; top: ${PAGE_HEADER_HEIGHT}px; width: ${contentWidth}px; height: ${bodyHeight}px; overflow: hidden; }
.${c.draft} .${c.body} { top: ${draftBodyTop}px; height: ${draftBodyHeight}px; }
.${c.footer} { position: absolute; left: ${PAGE_MARGIN_X}px; bottom: ${FOOTER_BOTTOM}px; width: ${contentWidth}px; height: ${FOOTER_BOX_HEIGHT}px; box-sizing: border-box; border-top: 1px solid ${palette.line}; font-family: ${fontStack(font.body)}; font-size: 8px; line-height: 20px; color: ${palette.inkMuted}; }
.${c.footerDate} { position: absolute; left: 0; top: 1px; }
.${c.footerApp} { position: absolute; left: 0; top: 1px; width: ${contentWidth}px; text-align: center; font-family: ${fontStack(font.label)}; }
.${c.footerNumber} { position: absolute; right: 0; top: 1px; font-family: ${fontStack(font.label)}; }
.${c.watermark} { position: absolute; left: 0; top: ${WATERMARK_TOP}px; width: ${PDF_PAGE.width}px; height: ${WATERMARK_SIZE}px; line-height: ${WATERMARK_SIZE}px; text-align: center; white-space: nowrap; font-family: ${fontStack(font.title)}; font-size: ${WATERMARK_SIZE}px; color: ${palette.watermark}; transform: rotate(-30deg); }
.${c.warmup} { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; color: ${palette.paper}; }
`
}
