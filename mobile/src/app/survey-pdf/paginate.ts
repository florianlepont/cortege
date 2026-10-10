import { fr } from "../../i18n"
import { PDF_PAGE_BLOCK_HEIGHT } from "./export-settings"
import { escapeHtml } from "./html"
import { DRAFT_BANNER_HEIGHT, PAGE_FOOTER_HEIGHT, PAGE_HEADER_HEIGHT, PDF_CLASS } from "./styles"
import type { PdfBlock } from "./types"

// Packs the content blocks into fixed A4 pages, each with its own header, footer and page number,
// and for a draft the banner and the watermark (phase 25.1, D-07 and D-10; RESEARCH Pattern 3).
// Print CSS (repeating headers, `@page` margins, counters) differs between WebKit and Chromium, so
// every page is a box of its own and the chrome is written per page as literal text. Pure.

// The geometry lives with the CSS that draws it (`styles.ts`).
export { DRAFT_BANNER_HEIGHT, PAGE_FOOTER_HEIGHT, PAGE_HEADER_HEIGHT }

/**
 * Share of a page's content area that several blocks may fill together. The block heights are
 * estimates in design units (text wraps differently on iOS and Android), so a margin is kept to
 * stop an under-estimated block from being cut at the footer. A single block on an empty page may
 * use the whole area.
 */
export const PAGE_FILL_FACTOR = 0.92

/** What every page repeats. `generatedAtText` is the long date, already formatted. */
export type PageChrome = {
  siteName: string
  logoDataUri: string | null
  isDraft: boolean
  generatedAtText: string
}

const t = fr.surveyExport

// The logo is a PNG made by the asset reader; anything else is not inlined (the CSP would block a
// remote one anyway, this keeps the attribute from being a way in).
const LOGO_DATA_URI = /^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/

/** The height of a block, with a missing or broken estimate counted as nothing. */
function heightOf(block: PdfBlock): number {
  return Number.isFinite(block.height) && block.height > 0 ? block.height : 0
}

/**
 * The height a block needs together with the blocks that must stay with it: a heading flagged
 * `keepWithNext` and the run behind it, up to the first block that does not hold on to its
 * successor. A following block that starts its own page ends the run.
 */
function runHeight(blocks: readonly PdfBlock[], from: number): number {
  let total = heightOf(blocks[from])
  let index = from
  while (blocks[index].keepWithNext === true && index + 1 < blocks.length) {
    if (blocks[index + 1].breakBefore === true) break
    index += 1
    total += heightOf(blocks[index])
  }
  return total
}

function packPages(blocks: readonly PdfBlock[], isDraft: boolean): PdfBlock[][] {
  const area =
    PDF_PAGE_BLOCK_HEIGHT -
    PAGE_HEADER_HEIGHT -
    PAGE_FOOTER_HEIGHT -
    (isDraft ? DRAFT_BANNER_HEIGHT : 0)
  const capacity = area * PAGE_FILL_FACTOR
  const pages: PdfBlock[][] = [[]]
  let used = 0
  blocks.forEach((block, index) => {
    const current = pages[pages.length - 1]
    // An empty page takes whatever comes: it never starts a page that would stay empty.
    const needsNewPage =
      current.length > 0 &&
      (block.breakBefore === true || used + runHeight(blocks, index) > capacity)
    if (needsNewPage) {
      pages.push([])
      used = 0
    }
    pages[pages.length - 1].push(block)
    used += heightOf(block)
  })
  return pages
}

function headerHtml(chrome: PageChrome): string {
  const logo =
    chrome.logoDataUri !== null && LOGO_DATA_URI.test(chrome.logoDataUri)
      ? `<img class="${PDF_CLASS.logo}" src="${chrome.logoDataUri}" width="26" height="26" alt="">`
      : ""
  return `<div class="${PDF_CLASS.header}"><div class="${PDF_CLASS.headerMain}">${logo}<span class="${PDF_CLASS.sheetName}">${escapeHtml(t.sheetTitle)}</span></div><div class="${PDF_CLASS.site}">${escapeHtml(chrome.siteName)}</div></div>`
}

function footerHtml(chrome: PageChrome, index: number, total: number): string {
  const date = escapeHtml(chrome.generatedAtText)
  return `<div class="${PDF_CLASS.footer}"><span class="${PDF_CLASS.footerApp}">${escapeHtml(t.appName)}</span><span class="${PDF_CLASS.footerDate}">${t.page.generatedAt({ date })}</span><span class="${PDF_CLASS.footerNumber}">${escapeHtml(t.page.number({ index: String(index), total }))}</span></div>`
}

function pageHtml(blocks: readonly PdfBlock[], chrome: PageChrome, index: number, total: number) {
  const pageClass = chrome.isDraft ? `${PDF_CLASS.page} ${PDF_CLASS.draft}` : PDF_CLASS.page
  const banner = chrome.isDraft
    ? `\n<div class="${PDF_CLASS.banner}">${escapeHtml(t.draft.banner)}</div>`
    : ""
  const watermark = chrome.isDraft
    ? `\n<div class="${PDF_CLASS.watermark}">${escapeHtml(t.draft.watermark)}</div>`
    : ""
  const body = blocks.map((block) => block.html).join("\n")
  return `<section class="${pageClass}">
${headerHtml(chrome)}${banner}
<div class="${PDF_CLASS.body}">
${body}
</div>${watermark}
${footerHtml(chrome, index, total)}
</section>`
}

/**
 * The pages of the sheet, as `section.page` elements joined by newlines (the document assembler
 * puts them in the `pdf-root` container), and how many there are. Greedy packing: a block goes on
 * the current page while it fits, a `breakBefore` block always opens a page (unless the current
 * one is empty), a `keepWithNext` heading moves to the next page together with what follows it,
 * and a block taller than the area gets a page of its own. Block html is trusted (the builders
 * escape their own text); the chrome texts are escaped here.
 */
export function paginateBlocks(
  blocks: readonly PdfBlock[],
  chrome: PageChrome,
): { html: string; pageCount: number } {
  const pages = packPages(blocks, chrome.isDraft)
  const html = pages
    .map((pageBlocks, position) => pageHtml(pageBlocks, chrome, position + 1, pages.length))
    .join("\n")
  return { html, pageCount: pages.length }
}
