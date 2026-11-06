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
 *
 * 0.94 since plan 33-16 (owner decision 2026-10-26; it was 0.92). Plan 33-14 printed the layout on
 * the iOS simulator and the Android emulator: the estimates are accurate, the real content of page 2
 * (identity card, factor chart, stand heading and factor A) is 689.8 of the 740 units of the body,
 * and the last text of any page ends at 746.5 pt at most with the body bottom at 800. A capacity of
 * 695.6 (740 x 0.94) lets that content, estimated at 692, stay on page 2, so the v3.2 sheet without
 * map and history prints the 4 pages of the B.11 target.
 */
export const PAGE_FILL_FACTOR = 0.94

/** What every page repeats. `generatedAtText` is the long date, already formatted. */
export type PageChrome = {
  siteName: string
  isDraft: boolean
  generatedAtText: string
}

const t = fr.surveyExport

/** The height of a block, with a missing or broken estimate counted as nothing. */
function heightOf(block: PdfBlock): number {
  return Number.isFinite(block.height) && block.height > 0 ? block.height : 0
}

/**
 * The height a block needs together with the blocks that must stay with it: a heading flagged
 * `keepWithNext` and the run behind it, up to the first block that does not hold on to its
 * successor. A following block that starts its own page (`breakBefore` or a page style) ends the
 * run.
 */
function runHeight(blocks: readonly PdfBlock[], from: number): number {
  let total = heightOf(blocks[from])
  let index = from
  while (blocks[index].keepWithNext === true && index + 1 < blocks.length) {
    if (blocks[index + 1].breakBefore === true || blocks[index + 1].pageStyle !== undefined) break
    index += 1
    total += heightOf(blocks[index])
  }
  return total
}

/** A block with no height and no page style: it takes no room on a page. */
function isInvisible(block: PdfBlock): boolean {
  return heightOf(block) === 0 && block.pageStyle === undefined
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
    // A page style block (cover, summary) is printed alone on its page (T-33-08): it opens a page
    // of its own and the block after it does too. A page holding only invisible blocks (the font
    // warm-up) counts as empty, so a cover first in the document stays on page 1.
    const startsAlone = block.pageStyle !== undefined && !current.every(isInvisible)
    const followsAlone = index > 0 && blocks[index - 1].pageStyle !== undefined
    // An empty page takes whatever comes: it never starts a page that would stay empty.
    const needsNewPage =
      current.length > 0 &&
      (block.breakBefore === true ||
        startsAlone ||
        followsAlone ||
        (block.pageStyle === undefined && used + runHeight(blocks, index) > capacity))
    if (needsNewPage) {
      pages.push([])
      used = 0
    }
    pages[pages.length - 1].push(block)
    used += heightOf(block)
  })
  return pages
}

// The charter forbids the logo under 25 mm in print, so the running header carries none (UI-SPEC
// U-01): the cover and the summary print it at 72 units.
function headerHtml(chrome: PageChrome): string {
  return `<div class="${PDF_CLASS.header}"><div class="${PDF_CLASS.headerMain}"><span class="${PDF_CLASS.sheetName}">${escapeHtml(t.sheetTitle)}</span></div><div class="${PDF_CLASS.site}">${escapeHtml(chrome.siteName)}</div></div>`
}

/** The footer; the one-page summary leaves out the page number ("Page 1 / 1" is noise). */
function footerHtml(chrome: PageChrome, index: number, total: number, withNumber: boolean): string {
  const date = escapeHtml(chrome.generatedAtText)
  const number = withNumber
    ? `<span class="${PDF_CLASS.footerNumber}">${escapeHtml(t.page.number({ index: String(index), total }))}</span>`
    : ""
  return `<div class="${PDF_CLASS.footer}"><span class="${PDF_CLASS.footerApp}">${escapeHtml(t.appName)}</span><span class="${PDF_CLASS.footerDate}">${t.page.generatedAt({ date })}</span>${number}</div>`
}

function pageHtml(blocks: readonly PdfBlock[], chrome: PageChrome, index: number, total: number) {
  // The page kind comes from its page style block (cover or summary), else a plain body page.
  const kind = blocks.find((block) => block.pageStyle !== undefined)?.pageStyle
  const classes: string[] = [PDF_CLASS.page]
  if (chrome.isDraft) classes.push(PDF_CLASS.draft)
  if (kind === "cover") classes.push(PDF_CLASS.pageCover)
  if (kind === "summary") classes.push(PDF_CLASS.pageSummary)
  const header = kind === undefined ? headerHtml(chrome) : ""
  const banner = chrome.isDraft
    ? `\n<div class="${PDF_CLASS.banner}">${escapeHtml(t.draft.banner)}</div>`
    : ""
  const watermark = chrome.isDraft
    ? `\n<div class="${PDF_CLASS.watermark}">${escapeHtml(t.draft.watermark)}</div>`
    : ""
  const top = `${header}${banner}`
  const body = blocks.map((block) => block.html).join("\n")
  return `<section class="${classes.join(" ")}">${top === "" ? "" : `\n${top}`}
<div class="${PDF_CLASS.body}">
${body}
</div>${watermark}
${footerHtml(chrome, index, total, kind !== "summary")}
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
